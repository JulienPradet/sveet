import { Sade } from "sade";
import { join } from "path";
import { from, combineLatest } from "rxjs";
import { rm } from "../utils/fs";
import { mergeMap, share, tap, filter } from "rxjs/operators";
import QueryManager from "../query/QueryManager";
import { build as buildEntry } from "../generators/entries";
import { build as buildRoutes } from "../generators/routes";
import { build as buildBundle } from "../generators/bundle";
import { build as buildTemplate } from "../generators/template";
import { build as buildPages } from "../generators/pages";
import Logger, { DefaultLogger } from "../utils/logger";
import renderer from "../renderer";
import { SsrStaticClient } from "../query/SsrStaticClient";

process.env.NODE_ENV = "production";

export const commandDefinition = (prog: Sade) => {
  return prog
    .command("build")
    .describe("Build a static version of your website")
    .action(opts => {
      const { execute } = require("./scripts/build.js");
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
  return from(
    Promise.all([
      rm(join(process.cwd(), "build")),
      rm(join(process.cwd(), ".sveet/build"))
    ])
  )
    .pipe(
      mergeMap(() => {
        const queryManager = new QueryManager();
        const ssrStaticClient = new SsrStaticClient();

        const entry$ = buildEntry({
          clientOutput: join(process.cwd(), ".sveet/client.js"),
          ssrOutput: join(process.cwd(), ".sveet/ssr.js")
        });

        const routes$ = buildRoutes({
          output: join(process.cwd(), ".sveet/routes.js")
        });

        const bundle$ = combineLatest(entry$, routes$).pipe(
          mergeMap(([entries, routes]) =>
            buildBundle({
              queryManager,
              client: {
                input: entries.client,
                outputDir: join(process.cwd(), "build/static")
              },
              ssr: {
                input: entries.ssr,
                outputDir: join(process.cwd(), ".sveet/build/server")
              }
            })
          ),
          tap(event => {
            switch (event.type) {
              case "CompileEvent":
                opts.logger.log(`Compiling…`);
                break;
              case "ErrorEvent":
                opts.logger.error(`Compilation failed.`, event.error);
                break;
              case "ReadyEvent":
                opts.logger.log(`Files compiled successfully`);
                break;
            }
          }),
          share(),
          filter(event => event.type === "ReadyEvent")
        );

        const template$ = buildTemplate({
          templatePath: join(process.cwd(), "src/template.html")
        });

        return combineLatest(bundle$, template$).pipe(
          mergeMap(([bundle, template]) => {
            return buildPages({
              renderer: renderer({
                template: template.toString(),
                rendererPath: join(process.cwd(), ".sveet/build/server/ssr.js"),
                manifestPath: join(process.cwd(), ".sveet/manifest.json"),
                ssrManifestPath: join(
                  process.cwd(),
                  ".sveet/build/server/ssr-manifest.json"
                ),
                clientPath: "/static/client.js"
              }),
              ssrStaticClient: ssrStaticClient
            });
          })
        );
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
