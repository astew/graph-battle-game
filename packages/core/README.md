# @graph-battle/core

The core package defines the platform-agnostic rules and data models for Graph Battle. Eventually it will implement the full game engine, but for now it simply exposes placeholder utilities so that other packages can depend on a stable module structure.

## Scripts

- `npm run build` – copies the source files into the `dist/` directory.
- `npm test` – runs the unit test suite via Node's built-in test runner.

## Status

The core package now exposes a playable engine with the standard board generator, a configurable `createStandardGame` factory, deterministic RNG helpers, and event emissions (`ATTACK_ITERATION`, `REINFORCEMENT_STEP`, `ATTACK_RESOLVED`, `REINFORCEMENTS_AWARDED`) suitable for UI animation or simulation logging.
