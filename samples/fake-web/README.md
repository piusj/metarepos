# fake-web

Frontend for the **greeting pipeline** demo. User types a name → web POSTs to `fake-api` → `fake-worker` picks it up → web polls and renders the worker's response.

## Run the whole pipeline locally

```bash
./dev.sh
# or: npm run dev
```

This spins up `fake-api` (port 3000), `fake-worker` (polling the API), and a static server for the web page (port 8080). Open http://localhost:8080.

The script resolves `fake-api` and `fake-worker` as sibling directories of `fake-web`. When launched through a metarepo's `repos/web` symlink, the kernel follows the symlink while resolving `..`, landing back in `samples/` — so the same logic works whether you launch from the samples directory directly or via a metarepo's `repos/web`.

## Ports

| Service     | Port |
|-------------|------|
| fake-api    | 3000 |
| fake-web    | 8080 |

Override with `API_PORT` / `WEB_PORT` env vars.
