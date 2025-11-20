# Graph Battle Rules

## Overview
Graph Battle is a turn-based strategy game played on an undirected graph laid out as a rectangular grid. Players attempt to control the entire graph by conquering nodes owned by their opponents.

## Players and Turn Order
- Five players participate in the standard game: **red**, **green**, **yellow**, **blue**, and **purple**.
- Play proceeds in that order, skipping any player who no longer controls nodes.
- The goal is to take control of every node on the board.

## Game Board
- The standard board is a 6×8 grid containing 30 nodes.
- Nodes are connected with 8-adjacency (orthogonal and diagonal neighbors).
- Board generation removes nodes at random from the 6×8 grid until 30 nodes remain, but the algorithm only accepts removals that preserve a single connected component.
- The standard game always features exactly five players. Once the board is carved, node ownership is randomized so every player starts with six claimed nodes and **no unclaimed nodes remain**.
- After ownership is assigned, each player receives 12 strength distributed randomly across their six starting nodes with a minimum of 1 strength per node.
- Each node has two properties:
  - `color`: the player occupying the node.
  - `strength`: a non-negative integer representing attack and defense power.

## Turns
- A player's turn begins without automatic actions.
- If a player controls zero nodes they are removed from play.
- Any node with strength ≥ 2 may be used to launch attacks against adjacent enemy nodes.
- The player may continue launching attacks as long as eligible nodes remain.
- A turn ends when the player either declines to continue or has no eligible attackers.
- After the turn ends, the player receives reinforcements.

## Reinforcements
1. Determine the player's largest connected territory:
   - Remove nodes not owned by the player from the board.
   - Identify connected sub-graphs among the remaining nodes.
  - If there are multiple connected sub-graphs of the same maximum size, choose one of them at random to be considered the "largest" territory for reinforcement purposes. This ensures reinforcements are applied consistently and avoids deterministic tie-breaker bias.
   - The size of the largest connected sub-graph equals the total reinforcement points earned.
2. Distribute reinforcement points:
   - Only nodes within the largest territory qualify.
   - Only nodes adjacent to enemy-controlled nodes may receive reinforcements.
   - Distribute points evenly among the eligible nodes. Any remainder is assigned randomly among them.

Reinforcements represent additional strength added to border nodes of the dominant territory, rewarding players who consolidate contiguous regions.

## Attacking
- An attack targets an adjacent enemy node using one of the player's nodes.
- Attacks require the attacking node to have strength ≥ 2.
- The attack resolves as repeated contests:
  - Each round flips a coin. The loser of the flip loses 1 strength.
  - If the attacker starts a round with exactly 2 strength and loses, the attack fails immediately.
  - If the defender starts a round with 0 strength and loses, the attack succeeds.
- Upon success, the defender's node changes color to the attacker, and all but 1 of the attacker's remaining strength transfers to the newly conquered node.
- Upon failure, control of both nodes remains unchanged and the attacker may choose different actions if available.

## Variations
Graph Battle is designed for extensibility. Alternate rulesets may alter any component, including board generation, reinforcement rules, attack mechanics, player ordering, or victory conditions. The standard game described above provides a baseline implementation for future experimentation.

