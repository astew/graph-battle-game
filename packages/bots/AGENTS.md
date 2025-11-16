# Bots Package Agent Guide

_Parent meta-document: `../AGENTS.md`. This guide adds to and overrides parent instructions; inherit unspecified rules._

## Orientation
- Placeholder automation logic lives in `src/`. Tests under `test/` describe current expectations.
- Consult `README.md` in this directory before changing public APIs or CLI behavior.

## Build and Test
- Build command: `npm run build --workspace=@graph-battle/bots` (copies sources to `dist/`).
- Test command: `npm test --workspace=@graph-battle/bots`.

## Coding Conventions (Placeholder)
- Maintain CommonJS modules and match the lightweight structure already present.
