# UI Guidelines for Graph Battle

This document collects UI-specific rules and requirements that were discussed in the investigation and are required for consistent UX across implementations.

## 1. DOM classes and CSS semantics
- Each non-empty node must include stable classes:
  - `node--owner-{playerId}` — owner identity
  - `node--row-{r}` and `node--col-{c}` — grid coordinates
  - `node--strength-{tier}` — strength range category, e.g. `strength-0`, `strength-1`, `strength-2-8`, `strength-9-20`, `strength-21-plus`.
- The board root element should set an active-player class when the turn changes: `board--active-{playerId}`. This allows CSS selectors to apply rules to every node owned by the active player via a single selector.

## 2. Animations — general rules
- Animations should clearly convey state changes and be accessible.
- Use CSS animation primitives where possible; when the animation sequence is part of game semantics (e.g., attack iterations), sequence control should be orchestrated from the UI layer and synchronized with engine events.
- Use CSS custom properties to communicate values such as timing and start offsets (e.g., `--turn-start-ms`) so the UI can keep pulses synced across nodes.

## 3. Attack iteration visualization
- The engine must emit per-iteration events for attacks (see `ATTACK_ITERATION`). The UI must animate each iteration in sequence.
- Each iteration should be short and visible: a suggested default is 200ms per iteration. The value should be configurable and may reduce when many iterations are involved.
- Per-iteration animations must not overlap for a single edge: the next iteration begins after the previous iteration's visual completes.
- Multiple independent attacks on different edges may animate concurrently.
- Each iteration animation should provide a clear visual result (e.g., a directed arrow showing the winning side and a visible strength change) so the player can understand how the outcome is produced.

## 4. Reinforcement animation
- Reinforcements are awarded after a player's turn finishes. The UI should present the awarded reinforcements as an explicit, visible sequence rather than instantaneous number changes.
- The engine may emit `REINFORCEMENT_STEP` or the UI can animate allocations based on the allocation summary in `REINFORCEMENTS_AWARDED`.
- Reinforcement animations should block the UI's transition into the next player's interactive state until the visible reinforcements are presented (this prevents confusing overlap between animations and subsequent user actions).
- Multiple nodes may be animated concurrently, but the per-node animation should sequentially show increments if multiple points are applied to the same node.

## 5. Accessibility and performance
- Keep animations short and avoid long delays that exceed the player's patience (less than 600ms per combined visual step is recommended in small games).
- Provide a setting to speed up or skip animations for power players and automated testing.
- Respect `prefers-reduced-motion` for accessibility.

## 6. Example CSS pattern for active player
```
.board--active-p1 .node--owner-p1 {
  animation: activePulse 1.8s ease-in-out infinite;
}
```

This approach avoids re-rendering individual node styles when turns change and centralizes the active-player visual.

## 7. Implementation notes
- Use event bus subscriptions to bridge engine events into animation orchestration.
- Consider using `requestAnimationFrame` to schedule visual steps, and ensure the UI remains responsive and accessible during animation sequences.

