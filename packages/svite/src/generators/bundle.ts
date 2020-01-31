import { watch as rollupWatch } from "rollup";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import json from "rollup-plugin-json";
import replace from "rollup-plugin-replace";
import svelte from "rollup-plugin-svelte";
import outputManifest from "rollup-plugin-output-manifest";
import { Observable } from "rxjs";
import { join, relative } from "path";
import SviteGraphQLPreprocess from "../graphql/preprocess";
import QueryManager from "../graphql/QueryManager";
import { EventStatus, EventStatusEnum } from "./EventStatus";

export const watch = (options: {
  input: string;
  outputDir: string;
  queryManager: QueryManager;
  ssr: {
    input: string;
    outputDir: string;
  };
}) => {
  return new Observable<EventStatus>(observer => {
    let ready = false;
    const watcher = rollupWatch([
      {
        input: options.input,
        output: {
          dir: options.outputDir,
          format: "esm",
          sourcemap: true,
          chunkFileNames: "[name].js"
        },
        plugins: [
          replace({
            "process.browser": "true",
            "process.env.NODE_ENV": JSON.stringify("development")
          }),
          svelte({
            hydratable: true,
            dev: true,
            preprocess: [SviteGraphQLPreprocess(options.queryManager)]
          }),
          json(),
          resolve({
            preferBuiltins: true,
            extensions: [".mjs", ".js"]
          }),
          commonjs(),
          outputManifest({
            fileName: "../manifest.json",
            nameSuffix: "",
            filter: chunk => Boolean(chunk.facadeModuleId),
            generate: (keyValueDecorator, seed) => {
              return chunks => {
                return Object.values(chunks).reduce((manifest, chunk: any) => {
                  const relativeFilePath = relative(
                    join(process.cwd(), "src"),
                    chunk.facadeModuleId
                  );
                  return {
                    ...manifest,
                    [relativeFilePath]: [chunk.fileName, ...chunk.imports]
                  };
                }, {});
              };
            }
          })
        ]
      },
      {
        input: options.ssr.input,
        output: {
          dir: options.ssr.outputDir,
          format: "commonjs",
          sourcemap: true
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
          replace({
            "process.browser": "false",
            "process.env.NODE_ENV": JSON.stringify("development")
          }),
          svelte({
            generate: "ssr",
            dev: true,
            preprocess: [SviteGraphQLPreprocess(options.queryManager)]
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
            action: EventStatusEnum.compile
          });
          break;
        case "END":
          if (ready) {
            observer.next({
              action: EventStatusEnum.reload
            });
          } else {
            ready = true;
            observer.next({
              action: EventStatusEnum.ready
            });
          }
          break;
        case "ERROR":
          observer.next({
            action: EventStatusEnum.error,
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
