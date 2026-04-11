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

```bash
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

## 5. Optional: remove `apps/blod` from refrct

After `blod` and `refract-core` remotes are healthy:

```bash
# In refrct monorepo — destructive; only when you are sure
git rm -r apps/blod
# Adjust root package.json workspaces / scripts (dev:blod, build:blod)
```

Keep `packages/refract-core` in refrct for **refract-editor**, or replace it with a **git submodule** pointing at `stellanjoh2/refract-core` so both apps share one source of truth.
