#!/usr/bin/env bash
# Deploy: ensure tests pass and dist/ is fresh, then push to GitHub so
# `npx piusj/metarepos init` immediately serves the new version.

set -euo pipefail

cd "$(dirname "$0")/.."

echo "→ Running tests"
npm test

echo "→ Building dist/"
npm run build

echo "→ Staging dist/"
git add dist/

if git diff --cached --quiet; then
  echo "  dist/ already up to date"
else
  git commit -m "chore: rebuild dist"
fi

echo "→ Pushing to origin/main"
git push origin main

echo ""
echo "✓ Deployed. Users can now run: npx piusj/metarepos init"
