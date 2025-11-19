# @graph-battle/bots

This package hosts the AI player policies for Graph Battle. Policies wrap the core engine and decide what moves a computer-controlled player should make.

## Scripts

- `npm run build` – copies the source files into the `dist/` directory.
- `npm test` – executes the unit tests with Node's built-in test runner.

## Status

Available utilities include:

- `createDeterministicBot` – selects the lexicographically first legal attack each turn.
- `createRandomBot` – chooses random legal attacks using an injectable RNG.
- `enumerateLegalAttacks` – helper that derives legal attacker/defender pairs from a `GameView` snapshot.
- `executeBotTurn` – repeatedly asks the bot for attacks before issuing an end-turn action.

These helpers make it possible to plug bots into the simulator and UI without reimplementing the core combat rules.
