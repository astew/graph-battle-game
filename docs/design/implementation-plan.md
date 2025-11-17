# Implementation Plan for Standard Rules

This plan is organized as a dependency tree. Each node corresponds to a single PR/commit that keeps the repository buildable and tests passing. Parent nodes depend on their children.

## Phase 1 – Foundational Engine & Barebones UI
1. **P1.A Core Domain & Engine Skeleton**
   - Implement domain models (`PlayerId`, `NodeState`, `BoardState`, `GameState`).
   - Create `GameEngine` scaffold handling turn order, validating commands, and emitting events.
   - Include deterministic RNG abstraction, base board generator producing empty boards for now.
   - Provide unit tests for each rule service stub to ensure baseline correctness.
2. **P1.B UI State Shell + Manual Turn Advancement** *(depends on P1.A)*
   - Set up React app state slices, connect to `GameController` (invoking stubbed actions).
   - Render static board grid with placeholder nodes, show current player turn, and allow manual "End Turn" button to cycle players.
   - Confirm UI can subscribe to events emitted by engine scaffold.
3. **P1.C Interaction Logging & Event Visualization** *(depends on P1.B)*
   - Display event log sidebar reflecting engine events.
   - Provide developer tooling (Redux devtools, hotkeys) to inspect state.
   - Add automated UI test verifying event log updates when end-turn command executed.

## Phase 2 – Complete Standard Rules & Playable Human Game
1. **P2.A Full Board Generation & Reinforcements** *(depends on P1.A)*
   - Implement `StandardBoardGenerator` with randomized 6×8 connected graph per rules.
   - Implement reinforcement calculation and allocation validation.
   - Extend engine view selectors to expose reinforcement info.
   - Add property-based tests for reinforcement fairness and board connectivity.
2. **P2.B Attack Mechanics & Combat Resolution** *(depends on P2.A)*
   - Implement attack command validation, resolution loop with injectable RNG, and conquest logic.
   - Update events to capture detailed battle outcomes for UI visualization.
   - Add deterministic tests covering success/failure paths using seeded RNG.
3. **P2.C UI Interaction Flow & Visual Feedback** *(depends on P2.B, P1.C)*
   - Render the standard board as an 8-connected rectangular grid with visible node positions, ownership colors, strength labels, and the graph edges themselves.
   - Implement interaction wizard for attacks (select attacker, target) and reinforcement allocation overlay.
   - Provide animations (CSS transitions) to highlight attacks and reinforcement placements.
   - Ensure accessibility by adding keyboard shortcuts and ARIA labels.
   - Introduce a title screen so the UI always boots into a menu before launching a new game session.
4. **P2.D Basic Bot Policies** *(depends on P2.B)*
   - Implement deterministic-first and random policies using `BotPolicy` interface.
   - Add integration tests that pit bots against each other for a few turns to ensure engine contract stability.

## Phase 3 – Simulator & Enhanced UX
1. **P3.A Simulator CLI MVP** *(depends on P2.D)*
   - Build CLI allowing specification of bot policies, RNG seeds, and number of games.
   - Run simulations sequentially, outputting aggregated win counts and average turn length.
   - Provide Jest tests verifying deterministic output with fixed seed.
2. **P3.B Parallel Simulation Runner** *(depends on P3.A)*
   - Introduce worker-thread pool, chunk tasks, and aggregate results concurrently.
   - Add progress reporting and NDJSON output option.
   - Stress-test to ensure no shared mutable state between workers.
3. **P3.C UI Polish & Bot Integration** *(depends on P2.C, P2.D)*
   - Allow player slots to be assigned to human or bot; UI automatically advances turns for bot slots.
   - Display win/loss modal when game over detected, with option to start new game using existing seed.
   - Add telemetry hooks (console logging) via event bus subscribers.

## Phase 4 – Quality & Future-Proofing
1. **P4.A Comprehensive Testing & Tooling** *(depends on all previous nodes)*
   - Add snapshot tests for UI board states, property-based tests for engine edge cases, and smoke tests for simulator CLI.
   - Configure CI workflows to run workspace-specific commands, ensuring reproducibility.
2. **P4.B Documentation & Extensibility Hooks** *(depends on P4.A)*
   - Document public APIs for each package, including extension points (custom rules, custom policies).
   - Provide developer guide for adding new board generators or UI skins.

Each phase yields tangible functionality:
- **Phase 1**: Clickable UI that can step through turns with event feedback.
- **Phase 2**: Fully playable human-vs-human game with working bots.
- **Phase 3**: Automation via simulator and bot-enabled UI.
- **Phase 4**: Hardened project ready for experimentation.

