# Test fixtures

These directories are not production repos — they're tiny fixtures used by the integration test at `test/init.test.ts` and by the workshop demo under `samples/workshop/`. Excluded from `npm pack` via `.npmignore`.

## Contents

- `fake-api/` — HTTP API with a task queue (`POST /greet`, `GET /tasks/pending`, etc.).
- `fake-worker/` — poller that picks up pending tasks and posts results back.
- `fake-web/` — frontend + `dev.sh` that spins all three services up locally.

Together they implement the **greeting pipeline**: a tiny cross-service demo where the user types a name, the web posts to the API, the worker processes it, and the web polls for the result. Demonstrates all three repos cooperating.

## Using them as a real metarepo demo

Run once to make each fake-* a proper git repo:

```bash
bash init-samples.sh
```

Then spin up the metarepo CLI pointing at these as symlink sources, and run `bash fake-web/dev.sh` inside the resulting metarepo to launch the demo.
