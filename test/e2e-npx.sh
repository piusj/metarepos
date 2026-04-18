#!/usr/bin/env bash
# End-to-end test: run `npx piusj/metarepos init --config <file>` to exercise the
# CLI as published on GitHub. Verifies the npx-shorthand distribution path works
# and produces a correctly scaffolded metarepo.
#
# Run from a local checkout of the metarepos repo:
#   ./test/e2e-npx.sh
#
# Requires: node >= 20, npx, network access, git.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SAMPLES_DIR="$REPO_ROOT/samples"

if [ ! -d "$SAMPLES_DIR/fake-api" ] || [ ! -d "$SAMPLES_DIR/fake-web" ]; then
  echo "FAIL: samples/ fixtures not found under $SAMPLES_DIR" >&2
  exit 1
fi

WORKDIR="$(mktemp -d -t mr-e2e-XXXXXX)"
trap 'rm -rf "$WORKDIR"' EXIT

cd "$WORKDIR"

cat > answers.json <<JSON
{
  "name": "e2e-meta",
  "repos": [
    { "kind": "symlink", "name": "api", "path": "$SAMPLES_DIR/fake-api" },
    { "kind": "symlink", "name": "web", "path": "$SAMPLES_DIR/fake-web" }
  ]
}
JSON

echo "Running: npx -y piusj/metarepos init --config answers.json"
echo "  cwd: $WORKDIR"
npx -y piusj/metarepos init --config answers.json

META="$WORKDIR/e2e-meta"

echo "Verifying scaffolded metarepo at $META"

check_file() {
  if [ ! -f "$1" ]; then
    echo "FAIL: missing file $1" >&2
    exit 1
  fi
}
check_dir() {
  if [ ! -d "$1" ]; then
    echo "FAIL: missing directory $1" >&2
    exit 1
  fi
}
check_symlink() {
  if [ ! -L "$1" ]; then
    echo "FAIL: expected symlink at $1" >&2
    exit 1
  fi
}

check_file "$META/META-ROOT.md"
check_file "$META/META-ARCH-PROMPT.md"
check_file "$META/AGENTS.md"
check_file "$META/CLAUDE.md"
check_file "$META/README.md"
check_file "$META/.gitignore"
check_file "$META/metarepo.config.json"
check_file "$META/scripts/init-repos.mjs"
check_file "$META/scripts/status.sh"
if [ ! -x "$META/scripts/status.sh" ]; then
  echo "FAIL: scripts/status.sh not executable" >&2
  exit 1
fi
check_dir  "$META/.git"
check_file "$META/repos/.gitkeep"

check_symlink "$META/repos/api"
check_symlink "$META/repos/web"
check_file    "$META/repos/api/README.md"
check_file    "$META/repos/web/README.md"

if ! grep -q "root of the e2e-meta meta-repo" "$META/META-ROOT.md"; then
  echo "FAIL: META-ROOT.md does not contain interpolated name" >&2
  exit 1
fi

name_in_config="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$META/metarepo.config.json','utf8')).name)")"
if [ "$name_in_config" != "e2e-meta" ]; then
  echo "FAIL: metarepo.config.json name is '$name_in_config', expected 'e2e-meta'" >&2
  exit 1
fi

symlink_count="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$META/metarepo.config.json','utf8')).symlinks.length)")"
if [ "$symlink_count" != "2" ]; then
  echo "FAIL: expected 2 symlink entries in config, got $symlink_count" >&2
  exit 1
fi

echo ""
echo "E2E test PASSED: npx piusj/metarepos init --config answers.json produced a valid metarepo with 2 symlinks to samples."
