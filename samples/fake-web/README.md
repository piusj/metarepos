# fake-web

Frontend for the **greeting pipeline** demo. User types a name → web POSTs to `fake-api` → `fake-worker` picks it up → web polls and renders the worker's response.

## Run the whole pipeline locally

```bash
./dev.sh
# or: npm run dev
```

This spins up `fake-api` (port 3000), `fake-worker` (polling the API), and a static server for the web page (port 8080). Open http://localhost:8080.

The script finds sibling services two ways:
1. If run inside a metarepo (METAROOT.md ancestor found), it looks under `repos/fake-api` and `repos/fake-worker`.
2. Otherwise it falls back to `../fake-api` and `../fake-worker` as sibling directories.

## Ports

| Service     | Port |
|-------------|------|
| fake-api    | 3000 |
| fake-web    | 8080 |

Override with `API_PORT` / `WEB_PORT` env vars.
