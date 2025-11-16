# @graph-battle/ui

The UI project currently ships a lightweight React-inspired rendering shim so that we can exercise the repository layout without pulling in third-party dependencies. It renders a placeholder screen that will later be replaced by a full React application once external packages are introduced.

## Scripts

- `npm run build` – copies the static assets into the `dist/` directory.
- `npm test` – executes smoke tests for the placeholder components using Node's built-in test runner.

## Status

Only static placeholder content is available today. Future iterations will replace the shim with production-ready React code.
