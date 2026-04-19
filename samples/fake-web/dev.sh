#!/usr/bin/env bash
# Spins up fake-api + fake-worker + fake-web locally and opens the greeting pipeline demo.
#
# Assumption: fake-api and fake-worker are siblings of fake-web using those exact
# names. Works whether they're real directories (in the samples dir) or symlinks
# with the fake-* name (in a metarepo that was scaffolded with those repo names).
# If you want to run this inside a metarepo, symlink the samples as fake-api /
# fake-web / fake-worker — not as api / web / worker.

set -euo pipefail

API_PORT="${API_PORT:-3000}"
WEB_PORT="${WEB_PORT:-8080}"

HERE="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$(cd "$HERE/../fake-api" 2>/dev/null && pwd)"    || { echo "error: expected sibling directory fake-api next to $HERE" >&2; exit 1; }
WORKER_DIR="$(cd "$HERE/../fake-worker" 2>/dev/null && pwd)" || { echo "error: expected sibling directory fake-worker next to $HERE" >&2; exit 1; }

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
