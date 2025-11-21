# Bot AI Overview

Graph Battle ships with simple bot policies that automate player turns using the public game engine APIs. Multiple bots can par
ticipate in the same match; each bot controls one player and follows its configured policy until it ends its turn.

## Simple Bot Policy

The **simple bot** follows a strict, strength-aware rule set:

1. It only considers attacks where its attacking node has **greater** strength than the adjacent defender. A node with strength
   `1` never attacks, even against a defender at `0`.
2. If no such attack exists, it ends its turn immediately.
3. Otherwise, it selects the **strongest** eligible attacking node and targets the **weakest** adjacent defender. Ties are resol
ved deterministically by node id.
4. After executing the attack, it re-evaluates the board and repeats these rules until it cannot attack.

## Additional Policies

- **Deterministic policy**: selects the lexicographically smallest legal attack for the active player.
- **Random policy**: chooses a legal attack uniformly at random using the provided RNG.

These policies are exposed from `@graph-battle/bots` and used by the simulator CLI for automated matches.
