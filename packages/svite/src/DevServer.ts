import { ServerResponse, IncomingMessage } from "http";
import polka, { Polka, Request, NextHandler } from "polka";
import handleServe from "serve-handler";
import QueryManager from "./graphql/QueryManager";
import GraphQLClient from "./graphql/GraphQLClient";
import fetch from "node-fetch";
import compression from "compression";
import { Renderer } from "./renderer";
import { SsrStaticClient } from "./graphql/SsrStaticClient";

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

  constructor({
    staticDir,
    queryManager
  }: {
    staticDir: string;
    queryManager: QueryManager;
  }) {
    this.server = polka<Request>()
      .use((request, response, next) => {
        if (this.isReady || !this.renderer) {
          next && next();
        } else {
          next && this.queue.push(next);
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
                (this.renderer as Renderer)({
                  initialPage: {
                    pathname: "/",
                    state: null
                  },
                  staticClient: this.ssrStaticClient
                }).then(result => {
                  response.statusCode = 200;
                  response.setHeader("Content-Type", "text/html");
                  response.end(result);
                });
                return Promise.resolve();
              } else {
                return Promise.reject(error);
              }
            }
          }
        );
      });

    const client = new GraphQLClient({
      uri: "https://swapi-graphql.netlify.com/.netlify/functions/index",
      fetch: fetch
    });
    const handleSviteData = (
      queryManager: QueryManager,
      request: Request,
      response: ServerResponse
    ) => {
      const query = queryManager.getQuery(request.params.query) as string;
      const variables = JSON.parse(
        decodeURIComponent(request.params.variables)
      );
      return client.query(query, variables).then(data => {
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
    this.ssrStaticClient = new SsrStaticClient();
    this.renderer = renderer;
  }
}

export default DevServer;
