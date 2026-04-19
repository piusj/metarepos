# fake-web

Frontend for the **greeting pipeline** demo. User types a name → web POSTs to `fake-api` → `fake-worker` picks it up → web polls and renders the worker's response.

## Run the whole pipeline locally

```bash
./dev.sh
# or: npm run dev
```

This spins up `fake-api` (port 3000), `fake-worker` (polling the API), and a static server for the web page (port 8080). Open http://localhost:8080.

The script assumes `fake-api` and `fake-worker` are siblings of `fake-web` using those exact names. To run it inside a metarepo, symlink the samples with the `fake-*` names (not `api`/`web`/`worker`) so the sibling lookup resolves naturally.

## Ports

| Service     | Port |
|-------------|------|
| fake-api    | 3000 |
| fake-web    | 8080 |

Override with `API_PORT` / `WEB_PORT` env vars.
