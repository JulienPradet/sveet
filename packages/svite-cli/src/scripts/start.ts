import { watch } from "rollup";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import json from "rollup-plugin-json";
import svelte from "rollup-plugin-svelte";
import DevServer from "../DevServer";
import { rm } from "../utils/fs";
import { watch as watchEntry } from "../generators/entry";
import { watch as watchTemplate } from "../generators/template";
import { watch as watchRoutes } from "../generators/routes";
import { join } from "path";
import { from, merge, of, Observable, zip, combineLatest } from "rxjs";
import {
  mergeMap,
  distinctUntilChanged,
  tap,
  map,
  share,
  take,
  filter,
  startWith,
  skipUntil
} from "rxjs/operators";
import SviteGraphQLPreprocess from "../graphql/preprocess";
import QueryManager from "../graphql/QueryManager";
import { Sade } from "sade";
import renderer from "../renderer";

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
  error = "error"
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
          ...Object.keys((process as any).binding("natives"))
        ],
        plugins: [
          svelte({
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
  queryManager
}: {
  staticDir: string;
  queryManager: QueryManager;
}) => (events$: Observable<WatchEvent>) => {
  const server = DevServer({
    staticDir,
    queryManager
  });

  return events$.pipe(
    tap(({ action }) => {
      if (action === WatchEventEnum.initialize) {
        server.listen({ port: 3000 }, () => {
          console.log(`[Svite] server listening on port ${3000}`);
        });
      } else if (action === WatchEventEnum.ready) {
        server.ready();
      }

      console.log(`[Svite] ${action}`);
      server.send({ action });
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

        const watchTemplate$: Observable<WatchEvent> = watchTemplate(
          {
            templatePath: join(process.cwd(), "src/template.html"),
            output: join(process.cwd(), "build/index.html")
          },
          of({
            scripts: `<script type="module" src="/static/index.js"></script>`
          })
        ).pipe(
          map((_, index) => ({
            action: index === 0 ? WatchEventEnum.ready : WatchEventEnum.reload
          })),
          share()
        );

        const ready$ = zip(
          watchBundle$.pipe(
            filter(({ action }) => action === WatchEventEnum.ready)
          ),
          watchTemplate$.pipe(
            filter(({ action }) => action === WatchEventEnum.ready)
          )
        ).pipe(take(1));

        return merge(
          merge(watchBundle$, watchTemplate$).pipe(
            tap(({ action, payload }) => {
              if (action === WatchEventEnum.error) {
                console.error(`[Svite] ERROR`, payload);
              }
            }),
            skipUntil(ready$),
            tap(({ action, payload }) => {
              if (action === "ready" || action === "reload") {
                const render = renderer(
                  join(process.cwd(), "build/server/ssr.js")
                );

                try {
                  render({
                    initialPage: {
                      pathname: "/",
                      state: null
                    }
                  }).then(route => {
                    console.log(route);
                  });
                } catch (e) {
                  console.error(e);
                }
              }
            })
          )
        ).pipe(
          startWith({ action: WatchEventEnum.initialize }),
          serve({
            staticDir: join(process.cwd(), "build"),
            queryManager: queryManager
          })
        );
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
