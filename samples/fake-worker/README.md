# fake-worker

Background worker for the **greeting pipeline** demo. Polls `fake-api` for pending tasks, composes a greeting (`Hello from worker, <name>! (processed at HH:MM:SS UTC)`), and posts the result back.

Run:
```bash
API_URL=http://localhost:3000 node src/worker.js
# POLL_MS controls the poll interval (default 1000)
```

Graceful shutdown on SIGINT.
