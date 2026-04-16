# Running Blod outside the rfrct monorepo

> **Day-to-day:** use the standalone **[`blod`](https://github.com/stellanjoh2/blod)** repo and [README.md](./README.md). You do not need `rfrct`. This file is **optional** reference (history, extracting `@rfrct/core`, CI).

Blod depends on `@rfrct/core`. In the old monorepo that was satisfied by npm workspaces (`"@rfrct/core": "*"`). In the **standalone** `blod` repo you point at `@rfrct/core` in one of these ways:

| Approach | Pros | Cons |
|----------|------|------|
| **A. `rfrct-core` as its own GitHub repo** | `npm install` works everywhere; clean CI | One-time extract + push |
| **B. Git submodule** (`packages/rfrct-core`) | No second package on npm/GitHub | Submodule UX; CI must `submodule update` |

Below: **A** (recommended) + **git subtree** so Blod keeps history from this folder.

---

## 1. Publish `@rfrct/core` as its own repo (one-time)

From the **rfrct** repo root:

**Fast path (already prepared in this monorepo):** the folder `rfrct/.export/rfrct-core` is a ready git repo. Create the empty GitHub repo, then either run `cd .export/rfrct-core && git push -u origin main` or use `scripts/publish-rfrct-core.sh` (optional `GITHUB_TOKEN` to create the repo via API).

```bash
# Manual copy (if you are not using .export/)
# From rfrct repo root — copy the package, then turn it into its own repo.
cp -a packages/rfrct-core /tmp/rfrct-core-export
cd /tmp/rfrct-core-export
git init
git add .
git commit -m "chore: extract @rfrct/core from rfrct monorepo"
git branch -M main
git remote add origin git@github.com:stellanjoh2/rfrct-core.git
git push -u origin main
```

Or mirror the folder without `git archive` (if you prefer a plain copy without history):

```bash
cp -R packages/rfrct-core /tmp/rfrct-core-export
# then git init / commit / push as above
```

Ensure `packages/rfrct-core/package.json` has `"private": false` if you ever publish to npm; for Git-only installs, private is fine.

---

## 2. Export Blod into `github.com/stellanjoh2/blod`

Still from **rfrct** repo root:

```bash
# Split history so the root of the new branch = former apps/blod/
git subtree split --prefix=apps/blod -b blod-standalone

# Preview locally (optional)
git worktree add ../blod-checkout blod-standalone
cd ../blod-checkout
# Replace package.json dependency (see package.standalone.json in this folder)
cp /path/to/rfrct/apps/blod/package.standalone.json ./package.json
npm install
npm run build
cd ..
git worktree remove blod-checkout
```

Push the subtree branch to the empty `blod` remote:

```bash
git remote add blod git@github.com:stellanjoh2/blod.git   # once
git push blod blod-standalone:main
```

**From the monorepo root** you can use **`npm run push:blod`** (runs `scripts/push-blod-to-blod-repo.sh`) instead of the two git commands above. Pushes to `main` that change `apps/blod/**` can also auto-mirror via `.github/workflows/sync-blod-mirror-repo.yml` if the `rfrct` repo has secret **`BLOD_MIRROR_PUSH_TOKEN`** (PAT with push access to `stellanjoh2/blod`).

**Important:** The first push from `subtree split` still has `"@rfrct/core": "*"`, which **will not work** outside the workspace. Either:

- Amend on `blod-standalone` before pushing (copy `package.standalone.json` → `package.json`, commit), or  
- Push, then clone `blod`, replace `package.json`, commit, push again.

Use `package.standalone.json` in this directory as the template (set `REFRCT_CORE_GIT_URL` to your `rfrct-core` repo).

---

## 3. `package.json` for standalone Blod

After checkout of the `blod` repo:

1. Copy `package.standalone.json` → `package.json` (edit the `@rfrct/core` URL if needed).
2. `npm install`
3. `npm run dev` (Vite serves on port **5174** per `vite.config.ts`).

**SSH (deploy keys on the `blod` repo):** use the same key for both `blod` and `rfrct-core` if both are private, or HTTPS + PAT for npm install from GitHub.

Example dependency:

```json
"@rfrct/core": "git+ssh://git@github.com/stellanjoh2/rfrct-core.git#main"
```

---

## 4. CI (GitHub Actions)

- Checkout **with submodules** only if you chose submodule approach.
- For **git+ssh** deps, use `ssh-agent` + deploy key, or switch dependency to **HTTPS + `GITHUB_TOKEN`** with a read-only token.

---

## 5. Publish the live site

**`https://<you>.github.io/blod/`** is built from the **`blod`** repository (`main`), via `.github/workflows/deploy-pages.yml` there.

**Workflow:** work in **`blod`**, **`git push origin main`** — done. Ignore `rfrct` unless you still keep a copy of `apps/blod` there and merge by hand (§2).

---

## 6. Optional: remove `apps/blod` from rfrct

After `blod` and `rfrct-core` remotes are healthy:

```bash
# In rfrct monorepo — destructive; only when you are sure
git rm -r apps/blod
# Adjust root package.json workspaces / scripts (dev:blod, build:blod)
```

Keep `packages/rfrct-core` in rfrct for **rfrct-editor**, or replace it with a **git submodule** pointing at `stellanjoh2/rfrct-core` so both apps share one source of truth.
