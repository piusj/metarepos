#!/usr/bin/env bash
# Git-init each fake-* sample so they can be used as real repos inside a
# metarepo demo. Idempotent: samples that are already git repos are left alone.
# Run once on a fresh clone of metarepos before running the workshop demo.

set -euo pipefail

SAMPLES_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Initialising samples under $SAMPLES_DIR"
for d in "$SAMPLES_DIR"/fake-*/; do
  [ -d "$d" ] || continue
  name=$(basename "$d")
  if [ -d "$d/.git" ]; then
    echo "  ○ $name — already a git repo"
    continue
  fi
  (
    cd "$d"
    git init -q -b main
    git add .
    git commit -q -m "initial: $name demo fixture"
  )
  echo "  ✓ $name — initialised and committed"
done
echo ""
echo "Done. Each fake-* sample is now a standalone git repo, ready to be symlinked into a metarepo."
