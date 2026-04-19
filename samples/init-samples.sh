#!/usr/bin/env bash
# Git-init each fake-* sample so they can be used as real repos inside a
# metarepo demo. Idempotent: samples that are already git repos are left alone.
#
# Usage:
#   bash init-samples.sh                   # inits fake-* under this script's dir
#   bash init-samples.sh /path/to/samples  # inits fake-* under the given dir
#
# Run once on a fresh clone of metarepos before running the workshop demo.

set -euo pipefail

if [ $# -gt 0 ]; then
  TARGET_DIR="$(cd "$1" && pwd)"
else
  TARGET_DIR="$(cd "$(dirname "$0")" && pwd)"
fi

echo "Initialising samples under $TARGET_DIR"
shopt -s nullglob
for d in "$TARGET_DIR"/fake-*/; do
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
shopt -u nullglob
echo ""
echo "Done. Each fake-* sample is now a standalone git repo, ready to be symlinked into a metarepo."
