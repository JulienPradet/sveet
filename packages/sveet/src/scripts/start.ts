import serve from "../dev/serve";
import { rm } from "../utils/fs";
import {
  EventStatus,
  ReadyEvent,
  ReloadEvent,
  InitializeEvent
} from "../generators/EventStatus";
import { watch as watchEntry } from "../generators/entries";
import { watch as watchTemplate } from "../generators/template";
import { watch as watchRoutes } from "../generators/routes";
import { watch as watchBundle } from "../generators/bundle";
import { join } from "path";
import { from, merge, of, Observable, zip, combineLatest } from "rxjs";
import {
  mergeMap,
  distinctUntilChanged,
  map,
  share,
  take,
  filter,
  startWith,
  skipUntil,
  skip,
  tap
} from "rxjs/operators";
import { Sade } from "sade";
import Logger, { DefaultLogger } from "../utils/logger";
import QueryManager from "../query/QueryManager";
import { SsrStaticClient } from "../query/SsrStaticClient";

process.env.NODE_ENV = "development";

export const commandDefinition = (prog: Sade) => {
  return prog
    .command("start")
    .describe("Launch development environment")
    .action(opts => {
      const { execute } = require("./scripts/start.js");
      const logger = new DefaultLogger();
      execute({
        ...opts,
        logger
      });
    });
};

export type ExecuteOptions = {
  logger: Logger;
};

export const execute = (opts: ExecuteOptions) => {
  return from(rm(join(process.cwd(), "build")))
    .pipe(
      mergeMap(() => {
        const queryManager = new QueryManager();
        const ssrStaticClient = new SsrStaticClient();

        const watchEntry$ = watchEntry({
          clientOutput: join(process.cwd(), ".sveet/client.js"),
          ssrOutput: join(process.cwd(), ".sveet/ssr.js")
        });

        const watchRoutes$ = watchRoutes({
          output: join(process.cwd(), ".sveet/routes.js")
        });

        const watchBundle$ = combineLatest(watchEntry$, watchRoutes$).pipe(
          distinctUntilChanged(),
          mergeMap(([entries, routes]) =>
            watchBundle({
              queryManager: queryManager,
              client: {
                input: entries.client,
                outputDir: join(process.cwd(), "build/static")
              },
              ssr: {
                input: entries.ssr,
                outputDir: join(process.cwd(), ".sveet/server")
              }
            })
          ),
          tap(event => {
            if (event.type === "ErrorEvent") {
              opts.logger.error(`Compilation failed.`, event.error);
            }
          }),
          share()
        );

        const template$ = watchTemplate({
          templatePath: join(process.cwd(), "src/template.html")
        }).pipe(share());

        const watchTemplateEvent$: Observable<EventStatus> = template$.pipe(
          map((_, index) =>
            index === 0
              ? ({ type: "ReadyEvent" } as ReadyEvent)
              : ({ type: "ReloadEvent" } as ReloadEvent)
          ),
          share()
        );

        const ready$ = zip(
          watchBundle$.pipe(filter(({ type }) => type === "ReadyEvent")),
          watchTemplateEvent$.pipe(filter(({ type }) => type === "ReadyEvent"))
        ).pipe(
          take(1),
          map(() => ({ type: "ReadyEvent" } as ReadyEvent)),
          share()
        );

        const events$: Observable<EventStatus> = merge(
          ready$,
          merge(watchBundle$, watchTemplateEvent$).pipe(
            skipUntil(ready$),
            skip(1)
          )
        ).pipe(
          startWith({
            type: "InitializeEvent"
          } as InitializeEvent),
          share()
        );

        return serve({
          logger: opts.logger,
          staticDir: join(process.cwd(), "build"),
          clientPath: "/static/client.js",
          ssrStaticClient: ssrStaticClient,
          events$,
          template$
        });
      })
    )
    .subscribe(
      () => {},
      (error: Error) => {
        opts.logger.error(`An unexpected error occurred.`, error);
      },
      () => {
        opts.logger.log(`Script completed successfully`);
      }
    );
};
