# Packages Agent Guide

_Parent meta-document: `../AGENTS.md`. This guide adds to and overrides the parent where noted; otherwise, inherit parent instructions._

## Orientation
- Applies to all subdirectories under `packages/` (bots, core, simulator) unless a deeper guide states otherwise.
- Review each package's `README.md` for human-facing context before editing code.

## Build and Test
- Default build command inside each package: `npm run build --workspace=<package>` from the repository root, or `node scripts/build.js` if you must debug the script locally.
- Default test command: `npm test --workspace=<package>`.
- Keep builds idempotent; the scripts currently copy sources into `dist/`.

## Dependencies
- Each package is versioned independently but linked through npm workspaces. Avoid cross-linking them with relative paths; use the scoped package names if they need to reference one another.

## Coding Conventions (Placeholder)
- Follow existing module patterns (CommonJS exports) until conventions are formalized.
