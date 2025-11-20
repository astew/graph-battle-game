# @graph-battle/simulator

The simulator package orchestrates automated matches between different bot policies. It powers batch analyses and quick CLI-driven experiments.

## Scripts

- `npm run build` – copies the source files into the `dist/` directory and exposes the CLI entry point.
- `npm test` – runs the unit tests using Node's built-in test runner.

## Usage

Run the CLI directly from the workspace to simulate games between built-in bot policies:

```
npm run cli --workspace=@graph-battle/simulator -- --games=5 --seed=42 --policy=random
```

Arguments:

- `--games` – number of games to run (default `1`).
- `--seed` – optional integer seed for deterministic runs.
- `--policy` – either `deterministic` (default) or `random`.

The CLI reports game counts, win totals per player, average turn length, and draw counts.

## Status

The CLI currently supports deterministic and random bots, seeded runs, and summary reporting. Future work will add worker-based parallelism and richer analytics exports.
