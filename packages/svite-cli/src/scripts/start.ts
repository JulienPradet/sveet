import { join } from "path";
import rimraf from "rimraf";
import { watch } from "rollup";
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

export const execute = opts => {
  const distDir = join(process.cwd(), "dist");
  rimraf(distDir, () => {
    const devServer = DevServer();
    devServer.listen({ port: opts.port });

    const watcher = watch([
      {
        input: join(process.cwd(), "./src/index.svelte"),
        output: {
          dir: join(distDir, "static"),
          format: "esm"
        }
      }
    ]);

    watcher.on("event", event => {
      switch (event.code) {
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
