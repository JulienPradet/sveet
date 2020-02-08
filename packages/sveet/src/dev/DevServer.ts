import { ServerResponse, IncomingMessage } from "http";
import polka, { Polka, Request, NextHandler } from "polka";
import handleServe from "serve-handler";
import compression from "compression";
import { Renderer } from "../renderer";
import { SsrStaticClient } from "../query/SsrStaticClient";

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
  private server: Polka<Request>;
  private ssrStaticClient: SsrStaticClient;

  constructor({
    staticDir,
    ssrStaticClient
  }: {
    staticDir: string;
    ssrStaticClient: SsrStaticClient;
  }) {
    this.ssrStaticClient = ssrStaticClient;
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
        return handleSveetData(ssrStaticClient, request, response);
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
                    console.error(error);
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

    const handleSveetData = async (
      ssrStaticClient: SsrStaticClient,
      request: Request,
      response: ServerResponse
    ) => {
      const hash = request.params.query;
      const variables = JSON.parse(
        decodeURIComponent(request.params.variables)
      );

      try {
        const data = await ssrStaticClient.query(hash, variables);
        response.statusCode = 200;
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify(data));
      } catch (e) {
        response.statusCode = 500;
        response.end(e.message);
      }
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
    this.renderer = renderer;
  }
}

export default DevServer;
