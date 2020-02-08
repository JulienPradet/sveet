import {
  watch as rollupWatch,
  rollup,
  RollupOptions,
  OutputOptions
} from "rollup";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import json from "rollup-plugin-json";
import replace from "rollup-plugin-replace";
import svelte from "rollup-plugin-svelte";
import outputManifest from "rollup-plugin-output-manifest";
import { Observable } from "rxjs";
import { join, relative } from "path";
import SveetQueryPreprocess from "../query/preprocess";
import QueryManager from "../query/QueryManager";
import { EventStatus } from "./EventStatus";

type ClientBundleOptions = {
  input: string;
  outputDir: string;
};
type SsrBundleOptions = {
  input: string;
  outputDir: string;
};
type BundleOptions = {
  queryManager: QueryManager;
  client: ClientBundleOptions;
  ssr: SsrBundleOptions;
};

const makeClientConfig = (
  queryManager: QueryManager,
  options: ClientBundleOptions
): RollupOptions => {
  return {
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
        preprocess: [SveetQueryPreprocess(queryManager, false)]
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
  };
};

const makeSsrConfig = (
  queryManager: QueryManager,
  options: SsrBundleOptions
): RollupOptions => {
  return {
    input: options.input,
    output: {
      dir: options.outputDir,
      format: "commonjs",
      sourcemap: true
    },
    external: [
      ...Object.keys(require(join(process.cwd(), "package.json")).dependencies),
      ...Object.keys(
        require(join(__dirname, "../../package.json")).dependencies
      ),
      ...Object.keys((process as any).binding("natives"))
    ].filter(packageName => packageName !== "svelte"),
    plugins: [
      replace({
        window: "undefined",
        "process.browser": "false",
        "process.env.NODE_ENV": JSON.stringify("development")
      }),
      svelte({
        generate: "ssr",
        dev: true,
        preprocess: [SveetQueryPreprocess(queryManager, true)]
      }),
      json(),
      resolve({
        preferBuiltins: true,
        extensions: [".mjs", ".js"]
      }),
      commonjs()
    ]
  };
};

export const build = (options: BundleOptions) => {
  return new Observable<EventStatus>(observer => {
    const run = async () => {
      try {
        observer.next({
          type: "CompileEvent"
        });

        const rollupClientOptions = makeClientConfig(
          options.queryManager,
          options.client
        );
        const rollupSsrOptions = makeSsrConfig(
          options.queryManager,
          options.ssr
        );

        const [clientBundle, ssrBundle] = await Promise.all([
          rollup(rollupClientOptions),
          rollup(rollupSsrOptions)
        ]);

        await Promise.all([
          clientBundle.write(rollupClientOptions.output as OutputOptions),
          ssrBundle.write(rollupSsrOptions.output as OutputOptions)
        ]);

        observer.next({
          type: "ReadyEvent"
        });
      } catch (error) {
        observer.next({
          type: "ErrorEvent",
          error: error
        });
      }

      observer.complete();
    };

    run();
  });
};

export const watch = (options: BundleOptions) => {
  return new Observable<EventStatus>(observer => {
    let ready = false;
    const watcher = rollupWatch([
      makeClientConfig(options.queryManager, options.client),
      makeSsrConfig(options.queryManager, options.ssr)
    ]);

    watcher.on("event", event => {
      switch (event.code) {
        case "START":
          observer.next({
            type: "CompileEvent"
          });
          break;
        case "END":
          if (ready) {
            observer.next({
              type: "ReloadEvent"
            });
          } else {
            ready = true;
            observer.next({
              type: "ReadyEvent"
            });
          }
          break;
        case "ERROR":
          observer.next({
            type: "ErrorEvent",
            error: event
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
