# UI App Agent Guide

_Parent meta-document: `../../AGENTS.md`. This guide adds to and overrides parent instructions; inherit all other directives._

## Orientation
- This workspace houses the Vite-powered React front-end. Read `README.md` in this directory for product context and entry-point notes.
- The app relies on standard React 18 (`react`, `react-dom`) with Vite tooling. Legacy files under `src/runtime/` are historical stubs; do not reference them from new code and prefer deleting them once no longer needed.

## Build and Test
- Local dev server: `npm run dev --workspace=@graph-battle/ui` (pass `-- --host 0.0.0.0` when exposing over WSL).
- Production build: `npm run build --workspace=@graph-battle/ui` (emits `dist/` consumed by GitHub Pages).
- Preview built assets: `npm run preview --workspace=@graph-battle/ui`.
- Tests: `npm test --workspace=@graph-battle/ui` (Node test runner, uses `react-dom/server`).

## Tooling Notes
- When editing build behavior, update `vite.config.js` and ensure GitHub Pages deployment (`.github/workflows/pages.yml`) still points at the correct `dist/` output.
- Static assets should live alongside components or under `src/assets/` (create if needed). Keep import paths relative so Vite handles bundling.

## Coding Conventions (Placeholder)
- Follow existing component structure; JSX adoption guidelines will be documented here later.
