# Graph Battle

Graph Battle is a turn-based strategy experiment that pits players against each other on a connected grid graph. This repository hosts the monorepo that will power the core engine, user interface, bot policies, and large-scale simulators.

## Repository Layout

- `docs/` – written specifications, including the [game rules](docs/game-rules.md).
- `packages/core/` – the framework-independent game engine module.
- `apps/ui/` – the React front end.
- `packages/bots/` – reusable computer player policies.
- `packages/simulator/` – tooling for orchestrating automated matches and experiments.

## Development

This repository uses npm workspaces. After cloning, install dependencies and run builds/tests with the following commands:

```bash
npm install
npm run build
npm test
```

Each workspace contains additional scripts documented in its README.

## Continuous Integration

GitHub Actions are configured to install dependencies, build every workspace, and execute all test suites on pull requests targeting `master`.
