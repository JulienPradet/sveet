import { join } from "path";
import rimraf from "rimraf";
import { watch } from "rollup";

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
    const watcher = watch([
      {
        input: join(process.cwd(), "./src/index.svelte"),
        output: {
          dir: distDir,
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
