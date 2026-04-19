#!/usr/bin/env bash
# Spins up fake-api + fake-worker + fake-web locally and opens the greeting pipeline demo.
# Resolves fake-api / fake-worker as sibling directories of fake-web.
# When run via a metarepo's symlinked repos/web, the kernel follows the symlink
# during `$HERE/../fake-api` resolution, landing in the samples/ parent — so
# this works transparently whether you launch it from the samples directory
# directly or through a metarepo's repos/web symlink.

set -euo pipefail

API_PORT="${API_PORT:-3000}"
WEB_PORT="${WEB_PORT:-8080}"

HERE="$(cd "$(dirname "$0")" && pwd)"

find_peer() {
  local name="$1"
  if [ -d "$HERE/../$name" ]; then
    echo "$(cd "$HERE/../$name" && pwd)"
    return 0
  fi
  return 1
}

API_DIR=$(find_peer "fake-api")    || { echo "error: could not locate fake-api" >&2; exit 1; }
WORKER_DIR=$(find_peer "fake-worker") || { echo "error: could not locate fake-worker" >&2; exit 1; }

echo "  api:    $API_DIR"
echo "  worker: $WORKER_DIR"
echo "  web:    $HERE"
echo ""

pids=()
cleanup() {
  echo ""
  echo "shutting down…"
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

PORT=$API_PORT node "$API_DIR/src/server.js" &
pids+=($!)

sleep 0.4

API_URL="http://localhost:$API_PORT" node "$WORKER_DIR/src/worker.js" &
pids+=($!)

node -e "
  const http = require('node:http');
  const fs = require('node:fs');
  const path = require('node:path');
  const root = '$HERE/src';
  const port = $WEB_PORT;
  const mime = { '.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml' };
  http.createServer((req, res) => {
    let p = path.join(root, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    fs.readFile(p, (err, buf) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'content-type': mime[path.extname(p)] || 'text/plain' });
      res.end(buf);
    });
  }).listen(port, () => console.log('fake-web listening on :' + port));
" &
pids+=($!)

sleep 0.3
echo ""
echo "✓ greeting pipeline running"
echo "  open: http://localhost:$WEB_PORT"
echo "  Ctrl-C to stop."
echo ""

wait
