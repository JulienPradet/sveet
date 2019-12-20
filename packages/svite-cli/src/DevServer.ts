import { readFile } from "fs";
import { join } from "path";
import { Server, IncomingMessage, ServerResponse } from "http";
import fastify from "fastify";
import fastifyStatic from "fastify-static";

type ListenOptions = {
  port?: number;
};

const DevServer = () => {
  let isListening: boolean = false;
  const server: fastify.FastifyInstance<
    Server,
    IncomingMessage,
    ServerResponse
  > = fastify({});

  server.register(fastifyStatic, {
    root: join(process.cwd(), "dist/static"),
    prefix: "/static"
  });

  const clients: Set<fastify.FastifyReply<ServerResponse>> = new Set();

  server.get("/__svite", (req, reply) => {
    req.raw.socket.setKeepAlive(true);
    reply.res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
      "Content-Type": "text/event-stream;charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // While behind nginx, event stream should not be buffered:
      // http://nginx.org/docs/http/ngx_http_proxy_module.html#proxy_buffering
      "X-Accel-Buffering": "no"
    });

    reply.res.write("\n");

    clients.add(reply);
    req.raw.on("close", () => {
      clients.delete(reply);
    });
  });

  server.get("/*", (req, reply) => {
    reply.type("text/html");
    return new Promise<String>((resolve, reject) => {
      readFile(join(process.cwd(), "src/template.html"), (err, buffer) => {
        if (err) {
          return reject(err);
        }

        resolve(buffer.toString());
      });
    }).then(template => {
      const html = template.replace(
        "%svite.scripts%",
        `<script src="/static/index.js"></script>`
      );
      reply.send(html);
    });
  });

  return {
    listen: (options: ListenOptions) => {
      if (!isListening) {
        isListening = true;
        server.listen(options.port || 3000);
        server.log.info(`server listening on ${server.server.address()}`);
      }
    }
  };
};

export default DevServer;
