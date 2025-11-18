# Glossary — Graph Battle

This glossary defines core game terms. Use canonical terms throughout code, tests, and documentation.

- Attack iteration — A single step in the attack resolution loop where one side is selected as the winner and the other side loses 1 strength.
- Attack sequence — The ordered list of attack iterations composing a single attack outcome.
- Turn — A player's active window where they may take actions (move, attack, end-turn).
- Reinforcement preview — A preview data-structure that lists eligible nodes for reinforcement and expected totals for the upcoming award.
- Reinforcement step — A single unit of reinforcement awarded to a node (if `REINFORCEMENT_STEP` events are used, each step is emitted).
- Node — A position on the board with an owner or no owner, and a strength value.
- Edge — A connection between two adjacent nodes.
- Territory — A contiguous set of nodes all owned by the same player.
- Largest territory — The territory with the largest node count for a given player; in ties choose randomly.
- Action command — An API object passed to `GameEngine#applyAction` representing a player intent such as `ATTACK` or `END_TURN`.
- GameProfile / Ruleset — A collection of parameters and policies used to create a configurable game instance via `createStandardGame`.


