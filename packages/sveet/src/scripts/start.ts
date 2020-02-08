import fetch from "node-fetch";
import serve from "../dev/serve";
import { rm } from "../utils/fs";
import {
  EventStatus,
  ReadyEvent,
  ReloadEvent,
  InitializeEvent
} from "../generators/EventStatus";
import { watch as watchEntry } from "../generators/entry";
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
  skip
} from "rxjs/operators";
import QueryManager from "../graphql/QueryManager";
import { Sade } from "sade";
import Logger, { DefaultLogger } from "../utils/logger";
import GraphQLClient from "../graphql/GraphQLClient";

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
              queryManager,
              client: {
                input: entry,
                outputDir: join(process.cwd(), "build/static")
              },
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

        const client = new GraphQLClient({
          uri: "https://swapi-graphql.netlify.com/.netlify/functions/index",
          fetch: fetch
        });
        return serve({
          logger: opts.logger,
          staticDir: join(process.cwd(), "build"),
          queryManager: queryManager,
          client: client,
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
