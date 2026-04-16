# Blod

Work **only** in this repository — not the old `rfrct` monorepo.

```bash
git clone git@github.com:stellanjoh2/blod.git
cd blod
npm install
npm run dev
```

- **Site:** [stellanjoh2.github.io/blod](https://stellanjoh2.github.io/blod/) — deploys when you push **`main`** (GitHub Actions).
- **Dependency:** `@rfrct/core` is pulled from [`rfrct-core`](https://github.com/stellanjoh2/rfrct-core) via `package.json` (git URL). You do not need `rfrct` checked out.

`rfrct` is archived as far as this project goes; ignore it unless you ever hack the editor again.

More detail (extracting core, CI notes): [STANDALONE.md](./STANDALONE.md).
