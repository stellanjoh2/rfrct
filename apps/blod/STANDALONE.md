# Running Blod outside the refrct monorepo

Blod depends on `@refrct/core`. In this monorepo that is satisfied by npm workspaces (`"@refrct/core": "*"`). In a **standalone** repo you must point at `@refrct/core` in one of these ways:

| Approach | Pros | Cons |
|----------|------|------|
| **A. `refract-core` as its own GitHub repo** | `npm install` works everywhere; clean CI | One-time extract + push |
| **B. Git submodule** (`packages/refract-core`) | No second package on npm/GitHub | Submodule UX; CI must `submodule update` |

Below: **A** (recommended) + **git subtree** so Blod keeps history from this folder.

---

## 1. Publish `@refrct/core` as its own repo (one-time)

From the **refrct** repo root:

**Fast path (already prepared in this monorepo):** the folder `refrct/.export/refract-core` is a ready git repo. Create the empty GitHub repo, then either run `cd .export/refract-core && git push -u origin main` or use `scripts/publish-refract-core.sh` (optional `GITHUB_TOKEN` to create the repo via API).

```bash
# Manual copy (if you are not using .export/)
# From refrct repo root — copy the package, then turn it into its own repo.
cp -a packages/refract-core /tmp/refract-core-export
cd /tmp/refract-core-export
git init
git add .
git commit -m "chore: extract @refrct/core from refrct monorepo"
git branch -M main
git remote add origin git@github.com:stellanjoh2/refract-core.git
git push -u origin main
```

Or mirror the folder without `git archive` (if you prefer a plain copy without history):

```bash
cp -R packages/refract-core /tmp/refract-core-export
# then git init / commit / push as above
```

Ensure `packages/refract-core/package.json` has `"private": false` if you ever publish to npm; for Git-only installs, private is fine.

---

## 2. Export Blod into `github.com/stellanjoh2/blod`

Still from **refrct** repo root:

```bash
# Split history so the root of the new branch = former apps/blod/
git subtree split --prefix=apps/blod -b blod-standalone

# Preview locally (optional)
git worktree add ../blod-checkout blod-standalone
cd ../blod-checkout
# Replace package.json dependency (see package.standalone.json in this folder)
cp /path/to/refrct/apps/blod/package.standalone.json ./package.json
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

**Important:** The first push from `subtree split` still has `"@refrct/core": "*"`, which **will not work** outside the workspace. Either:

- Amend on `blod-standalone` before pushing (copy `package.standalone.json` → `package.json`, commit), or  
- Push, then clone `blod`, replace `package.json`, commit, push again.

Use `package.standalone.json` in this directory as the template (set `REFRCT_CORE_GIT_URL` to your `refract-core` repo).

---

## 3. `package.json` for standalone Blod

After checkout of the `blod` repo:

1. Copy `package.standalone.json` → `package.json` (edit the `@refrct/core` URL if needed).
2. `npm install`
3. `npm run dev` (Vite serves on port **5174** per `vite.config.ts`).

**SSH (deploy keys on the `blod` repo):** use the same key for both `blod` and `refract-core` if both are private, or HTTPS + PAT for npm install from GitHub.

Example dependency:

```json
"@refrct/core": "git+ssh://git@github.com/stellanjoh2/refract-core.git#main"
```

---

## 4. CI (GitHub Actions)

- Checkout **with submodules** only if you chose submodule approach.
- For **git+ssh** deps, use `ssh-agent` + deploy key, or switch dependency to **HTTPS + `GITHUB_TOKEN`** with a read-only token.

---

## 5. Deploy from the monorepo only (mirror to `github.com/<you>/blod`)

The refrct repo includes `.github/workflows/push-blod-mirror.yml`. On each push to `main` that touches `apps/blod/` or `packages/refract-core/`, it **git subtree split**s `apps/blod` and **force-pushes** to the **`blod`** repo so `https://<you>.github.io/blod/` stays current—no manual subtree push.

**One-time setup**

1. In the **refrct** repo: **Settings → Secrets and variables → Actions**, add **`BLOD_MIRROR_TOKEN`**: a fine-grained PAT with **Contents: Read and write** on repository **`blod`** only (classic PAT: `repo` scope for that repo is fine).
2. Ensure your **`blod`** repo has **Settings → Pages → GitHub Actions** and branch **`main`** is allowed for the workflow in `apps/blod/.github/workflows/deploy-pages.yml` (it ships with the mirror).
3. If `main` on **`blod`** is branch-protected, allow **force push** for the actor that owns the PAT, or the mirror step will fail.
4. **Exit 128** on the mirror job is almost always **bad/expired PAT**, **SSO not authorized** for the token (GitHub → Settings → Applications → **configure** the PAT and “Authorize” for your org), or **branch protection** blocking force-push to `main`.

The monorepo’s `.github/workflows/deploy-blod-gh-pages.yml` is **manual-only** so it does not publish a second site under `github.io/<monorepo>/` on every push.

---

## 6. Optional: remove `apps/blod` from refrct

After `blod` and `refract-core` remotes are healthy:

```bash
# In refrct monorepo — destructive; only when you are sure
git rm -r apps/blod
# Adjust root package.json workspaces / scripts (dev:blod, build:blod)
```

Keep `packages/refract-core` in refrct for **refract-editor**, or replace it with a **git submodule** pointing at `stellanjoh2/refract-core` so both apps share one source of truth.
