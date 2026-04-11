# Blod

Work **only** in this repository — not the old `refrct` monorepo.

```bash
git clone git@github.com:stellanjoh2/blod.git
cd blod
npm install
npm run dev
```

- **Site:** [stellanjoh2.github.io/blod](https://stellanjoh2.github.io/blod/) — deploys when you push **`main`** (GitHub Actions).
- **Dependency:** `@refrct/core` is pulled from [`refract-core`](https://github.com/stellanjoh2/refract-core) via `package.json` (git URL). You do not need `refrct` checked out.

`refrct` is archived as far as this project goes; ignore it unless you ever hack the editor again.

More detail (extracting core, CI notes): [STANDALONE.md](./STANDALONE.md).
