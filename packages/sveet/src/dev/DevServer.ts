import { ServerResponse, IncomingMessage } from "http";
import polka, { Polka, Request, NextHandler } from "polka";
import handleServe from "serve-handler";
import QueryManager from "../graphql/QueryManager";
import GraphQLClient from "../graphql/GraphQLClient";
import compression from "compression";
import { Renderer } from "../renderer";
import { SsrStaticClient } from "../graphql/SsrStaticClient";

type ListenOptions = {
  host: string;
  port: number;
};

class DevServer {
  private isListening: boolean = false;
  private isReady: boolean = false;
  private clients: Set<ServerResponse> = new Set();
  private queue: NextHandler[] = [];
  private renderer?: Renderer;
  private ssrStaticClient?: SsrStaticClient;
  private server: Polka<Request>;
  private queryManager: QueryManager;
  private client: GraphQLClient;

  constructor({
    staticDir,
    queryManager,
    client
  }: {
    staticDir: string;
    queryManager: QueryManager;
    client: GraphQLClient;
  }) {
    this.queryManager = queryManager;
    this.client = client;
    this.server = polka<Request>()
      .use((request, response, next) => {
        if (this.isReady) {
          next && next();
        } else {
          next && this.queue.push(next);
        }
      })
      .use(compression())
      .get("/__sveet/livereload", (request, response) => {
        return handleSveetListener(request, response);
      })
      .get("/__sveet/data/:query/:variables.json", (request, response) => {
        return handleSveetData(queryManager, request, response);
      })
      .get("*", (request, response) => {
        return handleServe(
          request,
          response,
          {
            public: staticDir,
            cleanUrls: true,
            directoryListing: false
          },
          {
            sendError: (
              _absolutePath,
              _response,
              _acceptsJSON,
              _root,
              _handlers,
              _config,
              error
            ) => {
              if (error.statusCode === 404) {
                return (this.renderer as Renderer)({
                  initialPage: {
                    pathname: request.path,
                    search: request.search,
                    state: null
                  },
                  staticClient: this.ssrStaticClient
                })
                  .then(result => {
                    response.statusCode = 200;
                    response.setHeader("Content-Type", "text/html");
                    response.end(result);
                  })
                  .catch(error => {
                    response.statusCode = 500;
                    response.end("Oops");
                  });
              } else {
                response.statusCode = 500;
                response.end("Oops");
                return Promise.resolve();
              }
            }
          }
        );
      });

    const handleSveetData = (
      queryManager: QueryManager,
      request: Request,
      response: ServerResponse
    ) => {
      const query = queryManager.getQuery(request.params.query);
      if (typeof query === "undefined") {
        response.statusCode = 404;
        response.end("Query not found.");
      }

      const variables = JSON.parse(
        decodeURIComponent(request.params.variables)
      );
      return client.query(query as string, variables).then(data => {
        response.statusCode = 200;
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify(data));
      });
    };

    const handleSveetListener = (
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

      this.clients.add(response);
      request.on("close", () => {
        this.clients.delete(response);
      });
    };
  }

  listen(options: ListenOptions, cb: () => void) {
    if (!this.isListening) {
      this.isListening = true;
      this.server.listen({ host: options.host, port: options.port }, cb);
    }
  }
  ready({ renderer }: { renderer: Renderer }) {
    this.setRenderer(renderer);
    this.isReady = true;
    this.queue.forEach(next => {
      next();
    });
    this.queue = [];
  }
  send(message: object) {
    this.clients.forEach(client => {
      client.write(`data: ${JSON.stringify(message)}\n\n`);
    });
  }
  setRenderer(renderer: Renderer) {
    this.ssrStaticClient = new SsrStaticClient(this.queryManager, this.client);
    this.renderer = renderer;
  }
}

export default DevServer;
