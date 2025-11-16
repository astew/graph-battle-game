# Simulator Package Agent Guide

_Parent meta-document: `../AGENTS.md`. This guide adds to and overrides parent instructions; inherit unspecified rules._

## Orientation
- Simulator scaffolding lives in `src/` with matching tests under `test/`.
- Review this package's `README.md` before altering exported APIs or CLI surfaces.

## Build and Test
- Build command: `npm run build --workspace=@graph-battle/simulator` (copies sources to `dist/`).
- Test command: `npm test --workspace=@graph-battle/simulator`.

## Coding Conventions (Placeholder)
- Retain the current CommonJS layout until an explicit migration plan exists.
