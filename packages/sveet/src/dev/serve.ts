import renderer from "../renderer";
import DevServer from "./DevServer";
import { SsrStaticClient } from "../query/SsrStaticClient";
import { join } from "path";
import { Observable } from "rxjs";
import { EventStatus } from "../generators/EventStatus";
import { take, map, mergeMap, scan, withLatestFrom } from "rxjs/operators";
import Logger from "../utils/logger";

const serve = ({
  logger,
  staticDir,
  ssrStaticClient,
  events$,
  template$
}: {
  logger: Logger;
  staticDir: string;
  ssrStaticClient: SsrStaticClient;
  events$: Observable<EventStatus>;
  template$: Observable<Buffer>;
}) => {
  return events$.pipe(
    take(1),
    map(() => {
      const server = new DevServer({
        staticDir,
        ssrStaticClient
      });

      server.listen({ host: "0.0.0.0", port: 3000 }, () => {
        logger.log(`Server listening on port ${3000}`);
      });

      return server;
    }),
    mergeMap(server => {
      return events$.pipe(
        withLatestFrom(template$),
        scan((server: DevServer, [event, template]) => {
          if (event.type === "ReadyEvent") {
            server.ready({
              renderer: renderer({
                template: template.toString(),
                rendererPath: join(process.cwd(), "build/server/ssr.js"),
                manifestPath: join(process.cwd(), "build/manifest.json")
              })
            });
          } else if (event.type === "ReloadEvent") {
            server.setRenderer(
              renderer({
                template: template.toString(),
                rendererPath: join(process.cwd(), "build/server/ssr.js"),
                manifestPath: join(process.cwd(), "build/manifest.json")
              })
            );
          }

          switch (event.type) {
            case "CompileEvent":
              logger.log(`Change detected… Compiling…`);
              break;
            case "ReadyEvent":
              logger.log(
                `The server is ready. Please open your browser at http://localhost:3000/`
              );
              break;
            case "ReloadEvent":
              logger.log(`Compilation succeeded! Reloading page client side…`);
              break;
          }

          server.send({ type: event.type });

          return server;
        }, server)
      );
    })
  );
};

export default serve;
