# fake-api

Minimal HTTP API that participates in the **greeting pipeline** — a cross-service demo that requires all three fake-* services to work together.

## Endpoints

| Method | Path                    | Purpose                                                              |
|--------|-------------------------|----------------------------------------------------------------------|
| GET    | `/health`               | Liveness + current pending count                                     |
| POST   | `/greet`                | Enqueue a task: `{ name }` → `{ taskId }`                            |
| GET    | `/tasks/pending`        | Worker polls this for pending tasks                                  |
| POST   | `/tasks/:id/result`     | Worker posts back the processed greeting                             |
| GET    | `/tasks/:id`            | Web polls this to learn when the worker finished                     |

State lives in memory; restart = clean slate. Intended for demos only.

Run:
```bash
node src/server.js
# or: PORT=4000 node src/server.js
```
