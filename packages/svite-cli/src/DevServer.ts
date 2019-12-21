import { ServerResponse, IncomingMessage, createServer } from "http";
import handleServe from "serve-handler";

type ListenOptions = {
  port: number;
};

const DevServer = ({ staticDir }) => {
  let isListening: boolean = false;
  let isReady: boolean = false;
  const clients: Set<ServerResponse> = new Set();
  let queue: Array<{ request: IncomingMessage; response: ServerResponse }> = [];

  const server = createServer((request, response) => {
    if (request.url === "/__svite") {
      return handleSviteListener(request, response);
    }

    if (isReady) {
      handleServe(request, response, {
        public: staticDir,
        cleanUrls: true
      });
    } else {
      queue.push({ request, response });
    }
  });

  const handleSviteListener = (request, response) => {
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
      queue.forEach(({ request, response }) => {
        handleServe(request, response, {
          public: staticDir,
          cleanUrls: true
        });
      });
      queue = [];
    },
    send: message => {
      clients.forEach(client => {
        client.write(`data: ${JSON.stringify(message)}\n\n`);
      });
    }
  };
};

export default DevServer;
