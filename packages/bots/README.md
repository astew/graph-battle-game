# @graph-battle/bots

This package hosts the AI player policies for Graph Battle. Policies wrap the core engine and decide what moves a computer-controlled player should make.

## Scripts

- `npm run build` – copies the source files into the `dist/` directory.
- `npm test` – executes the unit tests with Node's built-in test runner.

## Status

Available utilities include:

- `BotPolicy` helpers (`createDeterministicPolicy`, `createRandomPolicy`, `createSimplePolicy`) that return a `(view, rng) => GameCommand | null` function.
- `enumerateLegalAttacks` and `enumerateAttackCommands` to derive legal attacks for the active player.
- `executePolicyTurn` to run a policy until it signals the end of its turn.

These helpers make it possible to plug bots into the simulator and UI without reimplementing the core combat rules or game state transitions.
