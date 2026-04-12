#!/usr/bin/env bash
# Mirror apps/blod/ to the standalone Blod repo (GitHub Pages: https://stellanjoh2.github.io/blod/).
# Requires remote `blod` → git@github.com:stellanjoh2/blod.git (see apps/blod/STANDALONE.md).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! git remote get-url blod >/dev/null 2>&1; then
  echo "error: git remote 'blod' not found. Add: git remote add blod git@github.com:stellanjoh2/blod.git" >&2
  exit 1
fi

git branch -D blod-standalone 2>/dev/null || true
git subtree split --prefix=apps/blod -b blod-standalone
git push blod blod-standalone:main
echo "OK: pushed subtree apps/blod → blod/main (Pages deploy should run on stellanjoh2/blod)."
