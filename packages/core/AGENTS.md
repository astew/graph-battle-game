# Core Package Agent Guide

_Parent meta-document: `../AGENTS.md`. This guide adds to and overrides parent instructions; inherit everything else by default._

## Orientation
- Source: `src/index.js` exports placeholder game primitives. Tests live under `test/`.
- Read `README.md` in this directory for domain notes before expanding the API surface.

## Build and Test
- Build via `npm run build --workspace=@graph-battle/core` (copies `src/` to `dist/`).
- Tests run with Node's built-in test runner: `npm test --workspace=@graph-battle/core`.

## Coding Conventions (Placeholder)
- Continue using CommonJS modules here until the repository establishes a migration plan.
