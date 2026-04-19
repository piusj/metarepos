import { randomUUID } from "node:crypto";
import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 3000);
const tasks = new Map(); // id -> { status: "pending"|"done", name, result?, createdAt, completedAt? }

function send(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(body == null ? "" : JSON.stringify(body));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") return send(res, 204, null);

  // Health check
  if (req.method === "GET" && req.url === "/health") {
    return send(res, 200, {
      status: "ok",
      service: "fake-api",
      pending: [...tasks.values()].filter((t) => t.status === "pending").length,
    });
  }

  // Enqueue a greet task
  if (req.method === "POST" && req.url === "/greet") {
    const body = await readJsonBody(req);
    if (!body || typeof body.name !== "string" || !body.name.trim()) {
      return send(res, 400, { error: "name required" });
    }
    const id = randomUUID();
    tasks.set(id, {
      status: "pending",
      name: body.name.trim(),
      createdAt: Date.now(),
    });
    console.log(`[fake-api] enqueued task ${id} for "${body.name.trim()}"`);
    return send(res, 202, { taskId: id });
  }

  // Worker reads pending queue
  if (req.method === "GET" && req.url === "/tasks/pending") {
    const pending = [...tasks.entries()]
      .filter(([, t]) => t.status === "pending")
      .map(([id, t]) => ({ id, name: t.name }));
    return send(res, 200, pending);
  }

  // /tasks/:id or /tasks/:id/result
  const m = req.url?.match(/^\/tasks\/([^/]+)(\/result)?$/);
  if (m) {
    const id = m[1];
    const task = tasks.get(id);
    if (!task) return send(res, 404, { error: "not found" });

    if (req.method === "GET" && !m[2]) {
      return send(res, 200, { id, ...task });
    }
    if (req.method === "POST" && m[2] === "/result") {
      const body = await readJsonBody(req);
      if (!body || typeof body.result !== "string") {
        return send(res, 400, { error: "result required" });
      }
      task.status = "done";
      task.result = body.result;
      task.completedAt = Date.now();
      console.log(`[fake-api] task ${id} completed`);
      return send(res, 200, { id, ...task });
    }
  }

  send(res, 404, { error: "not found" });
});

server.listen(port, () => {
  console.log(`fake-api listening on :${port}`);
});
