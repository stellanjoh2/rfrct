#!/usr/bin/env bash
# Create github.com/stellanjoh2/rfrct-core (if needed) and push .export/rfrct-core.
# From rfrct repo root:
#   GITHUB_TOKEN=ghp_xxx ./scripts/publish-rfrct-core.sh
# Or create an empty repo at https://github.com/new?name=rfrct-core (no README/license),
# then: cd .export/rfrct-core && git push -u origin main
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CORE="$ROOT/.export/rfrct-core"
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}"

if [[ ! -d "$CORE/.git" ]]; then
  echo "Missing $CORE — run the migration that copies packages/rfrct-core to .export/rfrct-core first."
  exit 1
fi

if [[ -n "$TOKEN" ]]; then
  echo "==> Creating repo stellanjoh2/rfrct-core via API (ignored if it already exists)"
  curl -sf -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/vnd.github+json" \
    https://api.github.com/user/repos \
    -d '{"name":"rfrct-core","private":false,"description":"@rfrct/core — WebGL refraction (Blod / rfrct)"}' \
    || echo "(create returned non-zero — repo may already exist; continuing)"
fi

cd "$CORE"
echo "==> Pushing to origin"
git push -u origin main
echo "Done: https://github.com/stellanjoh2/rfrct-core"
