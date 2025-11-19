# Implementation Plan — Forward-Focused

This document replaces previous plans and describes the prioritized, actionable roadmap from this point forward. It is written with two audiences in mind: (1) contributors implementing code, and (2) AI coding agents that will be automated to carry out tasks. Everything required to continue implementation should be present here.

Principles
- Explicit: every step includes acceptance criteria and tests.
- Incremental: prefer small, easily verifiable changes (build/tests should remain green).
- Configurable: expose parameters for the standard ruleset through a single factory object so variations are trivial to test.
- Observable: the engine will emit fine-grained events so the UI can animate and metrics can be captured.
- Low friction for AI implementers: provide code-level contracts (API signatures, event shapes, and test outlines) so agents can implement with minimal human intervention.

Summary & Phases
- Phase A — Stabilize core & API (days)
- Phase B — UI control flow & animation hooks (days to 1 week)
- Phase C — Policies, simulator, and tooling (weeks)
- Phase D — Types, telemetry, and polish (weeks-months)

PHASE A — Stabilize core & API

Overview
The core engine is the authoritative source of game state. Phase A focuses on clarifying interfaces and adding small, explicit features requested in the investigation:
- Ruleset factory to instantiate a standard game with configurable parameters
- Attack iteration events published during combat
- Reinforcement step events and the tie-breaker rules exposed to the UI

Current implementation (Phase A)
- `createStandardGame({ rows, columns, nodesPerPlayer, initialReinforcements, attackWinProb, maxNodes, players, rng })` in `@graph-battle/core` returns a fully configured `GameEngine` using `StandardBoardGenerator`. Defaults mirror the original 8x6, 30-node layout with five players and 12 starting strength per player.
- The engine emits `ATTACK_ITERATION` events for every combat round with payload `{ attackerNodeId, defenderNodeId, winner, attackerStrength, defenderStrength, index }` and continues to publish `ATTACK_RESOLVED` summaries.
- Reinforcement allocation now breaks ties between equal-sized territories using the injected RNG and emits `REINFORCEMENT_STEP` events (one per awarded unit) alongside the final `REINFORCEMENTS_AWARDED` summary.

Deliverables
1. Ruleset / GameProfile factory
   - API: createStandardGame({ rows, columns, nodesPerPlayer, initialReinforcements, attackWinProb, maxNodes }) => GameEngine
   - Acceptance criteria: new factory returns a `GameEngine` instance that behaves identically to current `StandardBoardGenerator` when called with default parameters; tests will verify several configurations produce connected boards and correct players' allocations.

2. Attack iteration events
   - Add an `ATTACK_ITERATION` event with payload: { attackerNodeId, defenderNodeId, winner: 'attacker'|'defender', attackerStrength, defenderStrength, index }
   - Acceptance criteria: `GameEngine#applyAction(AttackAction)` emits iteration events for each coin flip; the previously emitted `ATTACK_RESOLVED` remains as the final summary. Tests assert the number of iterations equals rounds in `#resolveAttack` and the final state matches previous tests.

3. Reinforcement step events and tie-breaker
   - Add `REINFORCEMENT_STEP` events or include `REINFORCEMENTS_AWARDED` with sub-events; include tie-breaker behavior by random selection of the largest territory, seeded via RNG. The rng should be injectable for determinism.
   - Acceptance criteria: `evaluateReinforcements` returns `eligibleNodeIds` and `allocateReinforcements` includes allocations; tests assert tie-breaker occurs and that allocation matches the public API when seeded.

PHASE B — UI control flow & animation hooks

Overview
With the engine publishing per-iteration events, the UI must be changed to use these events to animate actions and to update the UX flow to be visual-first.

Deliverables
1. Board-level and node-level CSS semantics
   - Add classes as documented in `docs/ui-guidelines.md` — node owner, row/col, strength tier, board active player tag. This should be implemented in `BoardCanvas.jsx`.
   - Acceptance criteria: set of stable classes appear in rendered markup and CSS selectors control animations.

2. Attack and reinforcement animation orchestration
   - UI should subscribe to `ATTACK_ITERATION` and `REINFORCEMENT_STEP` and animate accordingly.
   - Blocking semantics: reinforcement animations should block the user's ability to interact until the main visual sequence finishes; attack iterations should run sequentially per-edge with optional speed controls.
   - Acceptance criteria: UI tests or small playback harness demonstrates sequential attack iteration animations and blocking reinforcement animations.

3. Interaction flow and replace "wizard" language
   - Replace any mention of "wizard" with "allocation flow" or "interaction flow".
   - Remove the assumption of Redux/Controller in the MVP — the UI will keep using direct `GameEngine` for now. However, define the `GameController` contract for future migration.
   - Acceptance criteria: docs updated and a `GameController` interface example added to `docs/design/architecture.md`.

PHASE C — Policies, simulator & automation

Overview
This phase focuses on bot policies and a reproducible simulator harness for automated testing and large-scale evaluation.

Deliverables
1. BotPolicy interface & policies
   - `BotPolicy` signature: (view: GameView, rng: RandomSource) => GameCommand | null
   - Implement deterministic-first and random policies with tests.

2. Simulator CLI baseline
   - CLI that runs N games sequentially with a configured seed; output aggregated results in JSON.
   - Acceptance criteria: deterministic simulations for fixed seed, sample report outputs.

3. Workerized simulator (later)
   - Add `worker_threads` option and NDJSON streaming output for long runs.

PHASE D — Types, telemetry, tests & docs

Overview
Late-stage work to harden the project and support AI agents and contributors.

Deliverables
1. Types for `@graph-battle/core`
   - Add `index.d.ts` for the public API (GameEngine, GameView, NodeState). Optionally migrate the `core` package to TypeScript.

2. Event-based telemetry and metrics
   - Provide a stable `EventBus` contract and a `Telemetry` subscriber; aggregate metrics for attack iterations, per-player wins, and game durations.

3. CI & Integration tests
   - Add snapshot tests for the UI re: board states; property-based tests for reinforcements and fairness; e2e tests for core flows.

Prioritized immediate action items (first 48 hours)
- Add `docs/glossary.md` with canonical terms.
- Create Ruleset factory in `packages/core` and add tests for a couple of parameter sets.
- Add `ATTACK_ITERATION` event to `GameEngine` and write tests asserting emission sequence and final state.
- Update `docs/design/implementation-plan.md` and `docs/design/architecture.md` to include new events and `Ruleset` factory.

Acceptance details & agent hints
- For each new engine event:
  - Write a test that uses a deterministic RNG and asserts exact event counts and sequence.
  - Use small board fixtures to simplify iteration counts.
- For UI updates:
  - Provide a small example harness showing subscription to `ATTACK_ITERATION` and playing back a recorded sequence so AI agents can implement animation steps.
  - Provide an example CSS snippet demonstrating board-level active player class and node owner classes.

Notes
- The old implementation log is intentionally removed from this document; use `docs/implementation-log.md` for chronological notes if desired — or prefer ephemeral change notes via PR messages.
- This plan is action-oriented and written so AI coding agents can implement it directly; if you want I can produce executable PR-ready patches and test stubs.

---

If you want an immediate PR-ready patch for any of the Phase A items (Ruleset factory, per-iteration events, reinforcement tie-breaker), tell me which and I'll prepare the patch in detail along with tests and a concise commit message. Otherwise I will prepare `docs/glossary.md` next per the plan.
*** End Patch

Each phase yields tangible functionality:
- **Phase 1**: Clickable UI that can step through turns with event feedback.
- **Phase 2**: Fully playable human-vs-human game with working bots.
- **Phase 3**: Automation via simulator and bot-enabled UI.
- **Phase 4**: Hardened project ready for experimentation.

