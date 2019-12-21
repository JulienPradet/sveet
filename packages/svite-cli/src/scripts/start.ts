import { watch } from "rollup";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import json from "rollup-plugin-json";
import sucrase from "rollup-plugin-sucrase";
import DevServer from "../DevServer";
import { rm } from "../utils/fs";
import { watch as watchEntry } from "../generators/entry";
import { watch as watchTemplate } from "../generators/template";
import { join } from "path";
import { from, merge, of, Observable, zip } from "rxjs";
import {
  mergeMap,
  distinctUntilChanged,
  tap,
  map,
  share,
  take,
  filter,
  startWith,
  skipUntil,
  bufferTime,
  delay
} from "rxjs/operators";

export const startCommandDefinition = prog => {
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
  reload = "reload"
}

type WatchEvent = {
  action: WatchEventEnum;
};

const watchBundle = options => {
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
          observer.error(event);
          break;
        case "FATAL":
          observer.error(event);
          break;
      }
    });

    return () => watcher.close();
  });
};

const serve = ({ staticDir }) => events$ => {
  const server = DevServer({ staticDir });

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

export const execute = options => {
  return from(rm(join(process.cwd(), "build")))
    .pipe(
      mergeMap(() => {
        const watchEntry$ = watchEntry(
          {
            output: join(process.cwd(), ".svite/index.js")
          },
          of({ entry: join("../src/index.ts") })
        );

        const watchBundle$ = watchEntry$.pipe(
          distinctUntilChanged(),
          delay(5000),
          mergeMap(entryPath =>
            watchBundle({
              input: entryPath,
              outputDir: join(process.cwd(), "build/static")
            })
          ),
          share()
        );

        const watchTemplate$ = watchTemplate(
          {
            templatePath: join(process.cwd(), "src/template.html"),
            output: join(process.cwd(), "build/index.html")
          },
          of({ scripts: `<script src="/static/index.js"></script>` })
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
          merge(watchBundle$, watchTemplate$).pipe(skipUntil(ready$))
        ).pipe(
          startWith({ action: WatchEventEnum.initialize }),
          serve({
            staticDir: join(process.cwd(), "build")
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
