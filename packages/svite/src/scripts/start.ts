import { watch } from "rollup";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import json from "rollup-plugin-json";
import svelte from "rollup-plugin-svelte";
import DevServer from "../DevServer";
import { rm } from "../utils/fs";
import { watch as watchEntry } from "../generators/entry";
import {
  build as readTemplate,
  watch as watchTemplate
} from "../generators/template";
import { watch as watchRoutes } from "../generators/routes";
import { join } from "path";
import { from, merge, of, Observable, zip, combineLatest, concat } from "rxjs";
import {
  scan,
  mergeMap,
  distinctUntilChanged,
  tap,
  map,
  share,
  take,
  filter,
  startWith,
  skipUntil,
  skip
} from "rxjs/operators";
import SviteGraphQLPreprocess from "../graphql/preprocess";
import QueryManager from "../graphql/QueryManager";
import { Sade } from "sade";
import renderer, { Renderer } from "../renderer";
import { SsrStaticClient } from "../graphql/SsrStaticClient";

export const startCommandDefinition = (prog: Sade) => {
  return prog
    .command("start")
    .describe("Launch developpment environment")
    .action(opts => {
      const { execute } = require("./scripts/start.js");
      execute(opts);
    });
};

enum WatchEventEnum {
  initialize = "initialize",
  ready = "ready",
  compile = "compile",
  reload = "reload",
  error = "error",
  rendererUpdate = "rendererUpdate"
}

type WatchEvent = {
  action: WatchEventEnum;
  payload?: any;
};

const watchBundle = (options: {
  input: string;
  outputDir: string;
  queryManager: QueryManager;
  ssr: {
    input: string;
    outputDir: string;
  };
}) => {
  return new Observable<WatchEvent>(observer => {
    let ready = false;
    const watcher = watch([
      {
        input: options.input,
        output: {
          dir: options.outputDir,
          format: "esm"
        },
        plugins: [
          svelte({
            hydratable: true,
            dev: true,
            preprocess: [SviteGraphQLPreprocess(options.queryManager)],
            css: (css: { write: (output: string) => void }) => {
              css.write(join(options.outputDir, "bundle.css"));
            }
          }),
          json(),
          resolve({
            preferBuiltins: true,
            extensions: [".mjs", ".js"]
          }),
          commonjs()
        ]
      },
      {
        input: options.ssr.input,
        output: {
          dir: options.ssr.outputDir,
          format: "commonjs"
        },
        external: [
          ...Object.keys(
            require(join(process.cwd(), "package.json")).dependencies
          ),
          ...Object.keys(
            require(join(__dirname, "../../package.json")).dependencies
          ),
          ...Object.keys((process as any).binding("natives"))
        ].filter(packageName => packageName !== "svelte"),
        plugins: [
          svelte({
            hydratable: true,
            generate: "ssr",
            dev: true,
            preprocess: [SviteGraphQLPreprocess(options.queryManager)],
            css: (css: { write: (output: string) => void }) => {
              css.write(join(options.outputDir, "bundle.css"));
            }
          }),
          json(),
          resolve({
            preferBuiltins: true,
            extensions: [".mjs", ".js"]
          }),

          commonjs()
        ]
      }
    ]);

    watcher.on("event", event => {
      switch (event.code) {
        case "START":
          observer.next({
            action: WatchEventEnum.compile
          });
          break;
        case "END":
          if (ready) {
            observer.next({
              action: WatchEventEnum.reload
            });
          } else {
            ready = true;
            observer.next({
              action: WatchEventEnum.ready
            });
          }
          break;
        case "ERROR":
          observer.next({
            action: WatchEventEnum.error,
            payload: event
          });
          break;
        case "FATAL":
          observer.error(event);
          break;
      }
    });

    return () => watcher.close();
  });
};

const serve = ({
  staticDir,
  queryManager,
  events$
}: {
  staticDir: string;
  queryManager: QueryManager;
  events$: Observable<WatchEvent>;
}) => {
  return events$.pipe(
    take(1),
    map(({ action, payload }) => {
      const server = new DevServer({
        staticDir,
        queryManager
      });

      server.listen({ host: "0.0.0.0", port: 3000 }, () => {
        console.log(`[Svite] server listening on port ${3000}`);
      });

      return server;
    }),
    mergeMap(server => {
      return events$.pipe(
        scan((server: DevServer, event) => {
          if (event.action === WatchEventEnum.ready) {
            server.ready({
              renderer: renderer({
                template: event.payload.template.toString(),
                rendererPath: join(process.cwd(), "build/server/ssr.js")
              })
            });
          } else if (event.action === WatchEventEnum.rendererUpdate) {
            server.setRenderer(
              renderer({
                template: event.payload.template.toString(),
                rendererPath: join(process.cwd(), "build/server/ssr.js")
              })
            );
          }

          console.log(`[Svite] ${event.action}`);
          server.send({ action: event.action });

          return server;
        }, server)
      );
    })
  );
};

export const execute = () => {
  return from(rm(join(process.cwd(), "build")))
    .pipe(
      mergeMap(() => {
        const queryManager = new QueryManager();

        const watchEntry$ = watchEntry(
          {
            output: join(process.cwd(), ".svite/index.js")
          },
          of({ entry: join("../src/index.js") })
        );

        const watchRoutes$ = watchRoutes({
          output: join(process.cwd(), ".svite/routes.js")
        });

        const watchBundle$ = combineLatest(
          watchEntry$,
          watchRoutes$,
          (entry, routes) => ({ entry, routes })
        ).pipe(
          distinctUntilChanged(),
          mergeMap(({ entry, routes }) =>
            watchBundle({
              input: entry,
              outputDir: join(process.cwd(), "build/static"),
              queryManager,
              ssr: {
                input: join(process.cwd(), "src/ssr.js"),
                outputDir: join(process.cwd(), "build/server")
              }
            })
          ),
          share()
        );

        const watchTemplateEvent$: Observable<WatchEvent> = watchTemplate({
          templatePath: join(process.cwd(), "src/template.html")
        }).pipe(
          mergeMap((template, index) =>
            from(
              index === 0
                ? [
                    {
                      action: WatchEventEnum.ready,
                      payload: {
                        template: template
                      }
                    }
                  ]
                : [
                    {
                      action: WatchEventEnum.rendererUpdate,
                      payload: {
                        template: template
                      }
                    },
                    {
                      action: WatchEventEnum.reload
                    }
                  ]
            )
          ),
          share()
        );

        const ready$ = zip(
          watchBundle$.pipe(
            filter(({ action }) => action === WatchEventEnum.ready)
          ),
          watchTemplateEvent$.pipe(
            filter(({ action }) => action === WatchEventEnum.ready)
          )
        ).pipe(
          take(1),
          map(([bundleEvent, templateEvent]) => ({
            action: WatchEventEnum.ready,
            payload: {
              template: templateEvent.payload.template
            }
          })),
          share()
        );

        const events$: Observable<WatchEvent> = merge(
          ready$,
          merge(watchBundle$, watchTemplateEvent$).pipe(
            tap(({ action, payload }) => {
              if (action === WatchEventEnum.error) {
                console.error(`[Svite] ERROR`, payload);
              }
            }),
            skipUntil(ready$),
            skip(1)
          )
        ).pipe(
          startWith({ action: WatchEventEnum.initialize }),
          tap(event => {
            console.log(event);
          }),
          share()
        );

        return serve({
          staticDir: join(process.cwd(), "build"),
          queryManager: queryManager,
          events$
        });
      })
    )
    .subscribe(
      () => {},
      error => {
        console.error(`[Svite] An unexpected error occurred.`);
        console.error(error);
      },
      () => {
        console.log(`[Svite] script completed successfully`);
      }
    );
};
