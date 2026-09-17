import { createServer as httpCreateServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

export interface ServerDeps {
  landing: () => string;
  dashboard: () => string;
  orders: () => string;
  reports: () => string;
  gazette: () => string;
  state: () => unknown;
  portrait: (seed: string) => string;
  submitOrders: (body: string) => void;
}

async function readBody(req: IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body;
}

function html(res: ServerResponse, content: string): void {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(content);
}

export function createServer(deps: ServerDeps): Server {
  return httpCreateServer(async (req, res) => {
    const url = req.url ?? "";
    const method = req.method ?? "";

    if (method === "GET") {
      const htmlRoutes: Record<string, () => string> = {
        "/": deps.landing,
        "/dashboard": deps.dashboard,
        "/duel": deps.orders, "/orders": deps.orders,
        "/reports": deps.reports,
        "/gazette": deps.gazette,
      };
      const page = htmlRoutes[url];
      if (page) {
        html(res, page());
        return;
      }
      if (url === "/api/state") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(deps.state()));
        return;
      }
      const portrait = /^\/api\/portrait\/([^/]+)$/.exec(url);
      if (portrait) {
        let seed: string;
        try {
          seed = decodeURIComponent(portrait[1]!);
        } catch {
          res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
          res.end("Bad seed");
          return;
        }
        res.writeHead(200, { "content-type": "image/svg+xml" });
        res.end(deps.portrait(seed));
        return;
      }
    }

    const action = /^\/api\/action\/([a-z]+)$/.exec(url);
    if (method === "POST" && action) {
      const body = await readBody(req);
      await deps.submitOrders(`action=${action[1]}&${body}`);
      res.writeHead(303, { location: "/dashboard" });
      res.end();
      return;
    }

    if (method === "POST" && url === "/api/orders") {
      deps.submitOrders(await readBody(req));
      res.writeHead(204);
      res.end();
      return;
    }

    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  });
}
