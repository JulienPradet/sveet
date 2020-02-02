import DevServer from "../DevServer";
import { rm } from "../utils/fs";
import { EventStatus, EventStatusEnum } from "../generators/EventStatus";
import { watch as watchEntry } from "../generators/entry";
import { watch as watchTemplate } from "../generators/template";
import { watch as watchRoutes } from "../generators/routes";
import { watch as watchBundle } from "../generators/bundle";
import { join } from "path";
import { from, merge, of, Observable, zip, combineLatest } from "rxjs";
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

const serve = ({
  staticDir,
  queryManager,
  events$,
  template$
}: {
  staticDir: string;
  queryManager: QueryManager;
  events$: Observable<EventStatus>;
  template$: Observable<Buffer>;
}) => {
  return events$.pipe(
    take(1),
    map(({ action, payload }) => {
      const server = new DevServer({
        staticDir,
        queryManager
      });

      server.listen({ host: "0.0.0.0", port: 3000 }, () => {
        console.log(`[Sveet] server listening on port ${3000}`);
      });

      return server;
    }),
    mergeMap(server => {
      return combineLatest(template$, events$).pipe(
        scan((server: DevServer, [template, event]) => {
          if (event.action === EventStatusEnum.ready) {
            server.ready({
              renderer: renderer({
                template: template.toString(),
                rendererPath: join(process.cwd(), "build/server/ssr.js"),
                manifestPath: join(process.cwd(), "build/manifest.json")
              })
            });
          } else if (event.action === EventStatusEnum.reload) {
            server.setRenderer(
              renderer({
                template: template.toString(),
                rendererPath: join(process.cwd(), "build/server/ssr.js"),
                manifestPath: join(process.cwd(), "build/manifest.json")
              })
            );
          }

          console.log(`[Sveet] ${event.action}`);
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
            output: join(process.cwd(), ".sveet/index.js")
          },
          of({ entry: join("../src/index.js") })
        );

        const watchRoutes$ = watchRoutes({
          output: join(process.cwd(), ".sveet/routes.js")
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

        const template$ = watchTemplate({
          templatePath: join(process.cwd(), "src/template.html")
        }).pipe(share());

        const watchTemplateEvent$: Observable<EventStatus> = template$.pipe(
          map((_, index) => ({
            action: index === 0 ? EventStatusEnum.ready : EventStatusEnum.reload
          })),
          share()
        );

        const ready$ = zip(
          watchBundle$.pipe(
            filter(({ action }) => action === EventStatusEnum.ready)
          ),
          watchTemplateEvent$.pipe(
            filter(({ action }) => action === EventStatusEnum.ready)
          )
        ).pipe(
          take(1),
          map(() => ({
            action: EventStatusEnum.ready
          })),
          share()
        );

        const events$: Observable<EventStatus> = merge(
          ready$,
          merge(watchBundle$, watchTemplateEvent$).pipe(
            tap(({ action, payload }) => {
              if (action === EventStatusEnum.error) {
                console.error(`[Sveet] ERROR`, payload);
              }
            }),
            skipUntil(ready$),
            skip(1)
          )
        ).pipe(startWith({ action: EventStatusEnum.initialize }), share());

        return serve({
          staticDir: join(process.cwd(), "build"),
          queryManager: queryManager,
          events$,
          template$
        });
      })
    )
    .subscribe(
      () => {},
      error => {
        console.error(`[Sveet] An unexpected error occurred.`);
        console.error(error);
      },
      () => {
        console.log(`[Sveet] script completed successfully`);
      }
    );
};
