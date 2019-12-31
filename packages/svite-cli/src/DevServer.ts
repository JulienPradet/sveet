import { ServerResponse, IncomingMessage } from "http";
import polka, { Request, NextHandler } from "polka";
import handleServe from "serve-handler";
import QueryManager from "svite-graphql/dist/QueryManager";
import GraphQLClient from "svite-graphql/dist/GraphQLClient";
import fetch from "node-fetch";
import compression from "compression";

type ListenOptions = {
  port: number;
};

const DevServer = ({
  staticDir,
  queryManager
}: {
  staticDir: string;
  queryManager: QueryManager;
}) => {
  let isListening: boolean = false;
  let isReady: boolean = false;
  const clients: Set<ServerResponse> = new Set();
  let queue: NextHandler[] = [];

  const server = polka<Request>()
    .use((request, response, next) => {
      if (isReady) {
        next && next();
      } else {
        next && queue.push(next);
      }
    })
    .use(compression())
    .get("/__svite/livereload", (request, response) => {
      return handleSviteListener(request, response);
    })
    .get("/__svite/data/:query/:variables.json", (request, response) => {
      return handleSviteData(queryManager, request, response);
    })
    .get("*", (request, response) => {
      return handleServe(request, response, {
        public: staticDir,
        cleanUrls: true
      });
    });

  const handleSviteData = (
    queryManager: QueryManager,
    request: Request,
    response: ServerResponse
  ) => {
    const query = queryManager.getQuery(request.params.query) as string;
    const variables = JSON.parse(decodeURIComponent(request.params.variables));
    const client = new GraphQLClient({
      uri: "https://swapi-graphql.netlify.com/.netlify/functions/index",
      fetch: fetch
    });
    return client.fetch({ query, variables }).then(data => {
      response.statusCode = 200;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(data));
    });
  };

  const handleSviteListener = (
    request: IncomingMessage,
    response: ServerResponse
  ) => {
    request.socket.setKeepAlive(true);
    response.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
      "Content-Type": "text/event-stream;charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // While behind nginx, event stream should not be buffered:
      // http://nginx.org/docs/http/ngx_http_proxy_module.html#proxy_buffering
      "X-Accel-Buffering": "no"
    });

    response.write("\n");

    clients.add(response);
    request.on("close", () => {
      clients.delete(response);
    });
  };

  return {
    listen: (options: ListenOptions, cb: () => void) => {
      if (!isListening) {
        isListening = true;
        server.listen(options.port, cb);
      }
    },
    ready: () => {
      isReady = true;
      queue.forEach(next => {
        next();
      });
      queue = [];
    },
    send: (message: object) => {
      clients.forEach(client => {
        client.write(`data: ${JSON.stringify(message)}\n\n`);
      });
    }
  };
};

export default DevServer;
