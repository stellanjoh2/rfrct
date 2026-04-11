#!/usr/bin/env bash
# Create github.com/stellanjoh2/refract-core (if needed) and push .export/refract-core.
# From refrct repo root:
#   GITHUB_TOKEN=ghp_xxx ./scripts/publish-refract-core.sh
# Or create an empty repo at https://github.com/new?name=refract-core (no README/license),
# then: cd .export/refract-core && git push -u origin main
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CORE="$ROOT/.export/refract-core"
TOKEN="${GITHUB_TOKEN:-${GH_TOKEN:-}}"

if [[ ! -d "$CORE/.git" ]]; then
  echo "Missing $CORE — run the migration that copies packages/refract-core to .export/refract-core first."
  exit 1
fi

if [[ -n "$TOKEN" ]]; then
  echo "==> Creating repo stellanjoh2/refract-core via API (ignored if it already exists)"
  curl -sf -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/vnd.github+json" \
    https://api.github.com/user/repos \
    -d '{"name":"refract-core","private":false,"description":"@refrct/core — WebGL refraction (Blod / refrct)"}' \
    || echo "(create returned non-zero — repo may already exist; continuing)"
fi

cd "$CORE"
echo "==> Pushing to origin"
git push -u origin main
echo "Done: https://github.com/stellanjoh2/refract-core"
