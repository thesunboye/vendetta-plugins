# AGENTS.md

Vendetta plugin monorepo. Two plugins (`account-swap`, `impersonator`) built and deployed to GitHub Pages.

## Commands

- `pnpm m i` — install workspace deps (CI uses this; `pnpm install` also works).
- `pnpm build` — run `node build.mjs`; bundles every plugin under `plugins/` into `dist/`.
- `pnpm check` — typecheck with `tsc`.
- `pnpm fmt` — format with `dprint fmt`.

No tests exist in this repo.

## Architecture

- Each plugin lives in `plugins/<name>/` with its own `manifest.json` and source tree.
- Plugin entrypoint is specified by `manifest.json` `main` (convention: `src/index.ts`).
- Entry module must `export default { onLoad, onUnload }`.
- `build.mjs` bundles each plugin with Rollup → SWC → esbuild (minified IIFE).
- `@vendetta/*` imports are externalized to globals (`@vendetta/plugin` → `vendetta.plugin`).
- `react` is externalized to `window.React`.
- Build writes `dist/<name>/index.js` and an updated `manifest.json` with a SHA-256 `hash` field.

## TypeScript

- `tsconfig.json` targets ESNext / ESNext / `node` resolution, JSX mode `react-native`.
- `vendetta-types` (devDep) provides types for `@vendetta/*` imports.
- `node_modules/vendetta-types` is included in compilation.

## Workflow

- `master` branch is deployed automatically via GitHub Actions to GitHub Pages.
- CI runs `pnpm m i`, then `node ./build.mjs`, copies `README.md` into `dist/`, and deploys `dist/`.
- `dist/` is gitignored and generated; do not edit it manually.

## Decompiled data

- `decompiled/` contains scraped Discord app reference data (colors, icons, source maps). Treat as read-only reference. It is not part of the build or deploy.
