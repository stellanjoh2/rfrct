#!/usr/bin/env bash
# Export apps/blod history to a branch suitable for pushing to a standalone repo (e.g. github.com/stellanjoh2/blod).
# Run from refrct monorepo root.
set -euo pipefail

BRANCH_NAME="${BRANCH_NAME:-blod-standalone}"
PREFIX="apps/blod"

echo "==> Creating branch '${BRANCH_NAME}' via subtree split (${PREFIX})"
git subtree split --prefix="${PREFIX}" -b "${BRANCH_NAME}"

echo ""
echo "Next steps:"
echo "  1. Create an empty repo on GitHub: https://github.com/stellanjoh2/blod"
echo "  2. Replace package.json in that history so @refrct/core is not '*':"
echo "       git worktree add ../blod-wt ${BRANCH_NAME}"
echo "       cp apps/blod/package.standalone.json ../blod-wt/package.json   # edit SSH/HTTPS URL if needed"
echo "       (cd ../blod-wt && git add package.json && git commit -m 'fix: resolve @refrct/core for standalone')"
echo "       git worktree remove ../blod-wt"
echo "  3. Push refract-core package to its own repo first — see apps/blod/STANDALONE.md"
echo "  4. Push this branch:"
echo "       git remote add blod git@github.com:stellanjoh2/blod.git   # if not already added"
echo "       git push blod ${BRANCH_NAME}:main"
echo ""
echo "Branch '${BRANCH_NAME}' is ready locally."
