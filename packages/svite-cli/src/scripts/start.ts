import { watch } from "rollup";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import json from "rollup-plugin-json";
import sucrase from "rollup-plugin-sucrase";
import { stripIndent } from "common-tags";
import { join } from "path";
import { rm, writeFile } from "../utils/fs";
import DevServer from "../DevServer";

export const startCommandDefinition = prog => {
  return prog
    .command("start")
    .describe("Launch developpment environment")
    .action(opts => {
      const { execute } = require("./scripts/start.js");
      execute(opts);
    });
};

const generateEntry = ({ entry }) => {
  return new Promise((resolve, reject) => {
    writeFile(
      join(process.cwd(), "./.svite/index.ts"),
      stripIndent`
        import "svite-cli/dist/DevClient";
        import "${entry}";
      `
    );
    resolve();
  });
};

export const execute = opts => {
  const distDir = join(process.cwd(), "dist");
  rm(distDir)
    .then(() => {
      return generateEntry({
        entry: "../src/index.ts"
      });
    })
    .then(() => {
      const devServer = DevServer();
      devServer.listen({ port: opts.port });

      const watcher = watch([
        {
          input: join(process.cwd(), "./.svite/index.ts"),
          output: {
            dir: join(distDir, "static"),
            format: "esm"
          },
          plugins: [
            json(),
            resolve({
              extensions: [".mjs", ".js", ".ts"]
            }),
            commonjs(),
            sucrase({
              transforms: ["typescript"]
            })
          ]
        }
      ]);

      watcher.on("event", event => {
        switch (event.code) {
          case "START":
            console.log("[Svite] Compiling...");
            devServer.send({
              action: "compile"
            });
            break;
          case "END":
            console.log("[Svite] Compiled successfully");
            devServer.send({
              action: "reload"
            });
            break;
          case "ERROR":
            console.error(event);
            break;
          case "FATAL":
            console.error(event);
            break;
        }
      });
    });
};
