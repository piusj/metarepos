#!/usr/bin/env bash
# Spins up the greeting-pipeline demo locally: fake-api + fake-worker + fake-web.
# Thin wrapper around fake-web/dev.sh — run this from anywhere.

set -euo pipefail

SAMPLES_DIR="$(cd "$(dirname "$0")" && pwd)"
exec bash "$SAMPLES_DIR/fake-web/dev.sh" "$@"
