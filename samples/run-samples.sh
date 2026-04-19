#!/usr/bin/env bash
# Spins up the greeting-pipeline demo locally: fake-api + fake-worker + fake-web.
# Thin wrapper around fake-web/dev.sh — run this from anywhere.
#
# Usage:
#   bash run-samples.sh                    # uses fake-* under this script's dir
#   bash run-samples.sh /path/to/samples   # uses fake-* under the given dir
#
# Any additional args are passed through to fake-web/dev.sh (currently unused;
# dev.sh reads API_PORT and WEB_PORT from the environment).

set -euo pipefail

if [ $# -gt 0 ]; then
  TARGET_DIR="$(cd "$1" && pwd)"
  shift
else
  TARGET_DIR="$(cd "$(dirname "$0")" && pwd)"
fi

exec bash "$TARGET_DIR/fake-web/dev.sh" "$@"
