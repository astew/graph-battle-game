# Graph Battle Standard Rules Architecture

## 1. Conceptual Overview
Graph Battle is composed of four collaborating packages plus shared documentation:

| Package | Role | Key Responsibilities |
|---------|------|----------------------|
| `packages/core` | Rule engine | Pure domain models, deterministic game logic, validation, and pluggable rule sets. |
| `apps/ui` | Player interface | Presents the board, gathers player intent, and visualizes results of core actions. |
| `packages/bots` | Policy library | Provides reusable policies that choose legal actions for non-human players. |
| `packages/simulator` | Experiment harness | Orchestrates large batches of games, capturing results for statistical analysis. |

All workspaces share TypeScript types generated from the core package. The UI never mutates game state directly; it dispatches high-level intents through a controller that delegates to `core`, receives immutable snapshots, and then re-renders.

## 2. Core Package Design
### 2.1 Architectural Layers
1. **Domain Layer** (entities & value objects)
   - `PlayerId`, `NodeId`, `Strength`, `Color`, `CoinFlipOutcome` enumerations or branded types.
   - Entities: `NodeState`, `BoardState`, `GameState`, `TurnState`.
   - All objects immutable; transitions performed via pure functions returning new copies.
2. **Rule Services Layer**
   - `BoardGenerator` strategy interface with `StandardBoardGenerator` implementation.
   - `ReinforcementService`, `AttackResolver`, `TurnManager`, each exposing stateless functions that accept and return domain structures.
3. **Game Orchestrator**
   - `GameEngine` class coordinates phases of the game, exposes a thin API (`applyAction`, `advanceTurn`, `getView`).
   - Emits domain events (`GameEvent`) to observers (UI, bots, simulator) through an `EventBus` interface using publish/subscribe.

### 2.2 Core Modules & Classes
- `entities.ts`: definitions and constructors for board, node, game state.
- `actions.ts`: discriminated union for legal actions (e.g., `AttackAction`, `EndTurnAction`, `AllocateReinforcementsAction`).
- `rules/attack.ts`, `rules/reinforcements.ts`, `rules/turn.ts` implementing service interfaces.
- `engine/game-engine.ts`: orchestrator, ensures actions legal before calling rule services.
- `engine/game-controller.ts`: higher-level façade for consumers, bundling engine + event bus.
- `events.ts`: `GameEvent` union covering `TurnStarted`, `AttackResolved`, `ReinforcementsAwarded`, etc.
- `view/selectors.ts`: selectors that derive read-optimized views for UI (e.g., `BoardView`, `PlayerSummary`).

### 2.3 Key Patterns & Guidelines
- **Command Pattern** for player actions: UI constructs `GameCommand` objects that `GameEngine` validates and executes.
- **Strategy Pattern** for board generation, attack resolution randomness (injectable RNG), and reinforcement allocation algorithms.
- **Observer Pattern** for event bus so UI/bots/simulator can react without tight coupling.
- **Avoid** Service Locator or shared mutable singletons; inject dependencies explicitly.
- **Determinism**: isolate randomness through injected `RandomSource`. Facilitates tests and reproducibility.

### 2.4 Runtime Considerations
- Core functions are synchronous and CPU-light; no blocking I/O.
- UI thread safety ensured because UI only receives new state snapshots; no shared mutable state.
- Simulator can run games in worker threads by creating isolated engine instances per simulation.

## 3. UI Application Design
### 3.1 Conceptual Model
- React + Vite front-end, using Redux Toolkit or Zustand for state management (choose minimal global store; default: Redux Toolkit because of tooling support).
- UI state includes `gameView` (derived from core), `pendingCommand`, `interactionMode`, and asynchronous metadata (loading, error).
- Communication with core occurs through a web worker or local WASM-like call? For MVP, instantiate engine directly in browser thread, but run heavy simulations elsewhere.

#### Standard Board Visualization
- The standard rules always render the board as a rectangular, evenly spaced grid honoring the underlying 8-connected graph structure.
- Each node appears as a circle positioned by its row/column coordinates. Non-existent nodes are omitted entirely so gaps remain visually obvious.
- Node fill color communicates ownership, while an integer label centered inside the circle shows the node's current strength.
- All existing edges are visible as straight-line connectors between nodes. These edges double as future animation anchors when showing attack resolution.

#### Title Screen Requirements
- Before entering a match the UI displays a title screen with the project branding and a "New Game" action.
- The title screen creates a consistent entry point even while only a single game mode exists today, and it will grow to include tutorials and alternate rule sets later.

### 3.2 Module Breakdown
1. **State Management (`apps/ui/src/state`)**
   - `gameSlice.ts`: stores `GameView` snapshot and dispatches thunks to invoke core engine.
   - `interactionSlice.ts`: manages UI-specific modes (selected node, hovered attack target, reinforcement allocation state).
   - `engineService.ts`: wrapper that instantiates `GameController` from core and exposes async-friendly methods returning promises (future-proofing for worker usage).
2. **Components (`apps/ui/src/components`)**
   - `GameCanvas`: renders board grid; uses memoized selectors for nodes, edges.
   - `NodeCell`: clickable element, dispatches actions based on current interaction state.
   - `Sidebar`: lists players, turn order, reinforcement status, command log.
   - `ActionPanel`: context-sensitive instructions (e.g., "Select attacker", "Confirm reinforcements").
3. **Hooks & Utilities**
   - `useGameController` to access engine service.
   - `useInteractionFlow` orchestrates multi-step actions, ensures UI doesn't block main thread—heavy calculations are done in core before UI updates.
4. **Styling**
   - CSS modules or Tailwind (follow repo conventions once defined). Emphasize accessibility (color-blind friendly palettes).

### 3.3 UI Interaction Flow
- User clicks a node → `interactionSlice` updates selection.
- When sufficient context exists (attacker + target) the UI builds a `GameCommand` and dispatches `executeCommand` thunk.
- Thunk calls `engineService.execute(command)` which forwards to `GameController` and resolves to new `GameView` + emitted events.
- Redux updates triggers re-render. Event log component displays chronological events.
- Reinforcement allocation uses wizard-like overlay ensuring legal distribution by asking core for allowed nodes and validating totals before dispatch.

### 3.4 Performance & UX Considerations
- Board re-render optimized through memoization and keyed components (node id as key).
- Commands executed synchronously; to avoid blocking, thunks wrap engine calls in `setTimeout(0)` when simulating long operations.
- Provide optimistic UI for simple commands but fall back to authoritative state from core after command resolves.
- Keyboard accessibility: arrow keys to navigate selection, Enter to confirm actions.

### 3.5 Avoided Patterns
- Avoid storing derived data (e.g., adjacency lists) in Redux; compute via selectors from `GameView` to prevent desynchronization.
- Avoid directly mutating engine internals from components; always go through controller façade.

## 4. Bots Package Design
### 4.1 Responsibilities
- Export standardized `BotPolicy` interface: `(view: GameView, rng: RandomSource) => GameCommand | null`.
- Policies operate on read-only `GameView` from core; never mutate.
- Provide factory functions for deterministic (first-action) and stochastic (random) policies.

### 4.2 Module Structure
- `policies/base.ts`: defines interface, helper to enumerate legal commands using core-provided `ActionGenerator`.
- `policies/deterministic.ts`: selects lexicographically smallest attacker+target pair.
- `policies/random.ts`: selects uniformly random legal command.
- `policy-runner.ts`: orchestrates step-by-step play for a single bot-controlled player (used by simulator or UI hot-seat mode).

### 4.3 Extensibility
- Policies accept configuration (aggression level, territory bias) but default to simple heuristics.
- Provide utilities for filtering legal commands by command type to encourage consistent behavior.

## 5. Simulator Package Design
### 5.1 Purpose
- Execute large batches of games for testing policies and generating analytics.

### 5.2 Architecture
- Node CLI built with Commander.
- `SimulationConfig` defines number of games, participating players (human or bot), board generator seed, RNG seeding per run.
- `SimulationRunner` spawns worker threads (`worker_threads`) or runs sequentially depending on config.
- Each worker instantiates isolated `GameController` and `BotPolicies`.
- Results collected via message passing and aggregated into `SimulationReport` (win counts, average turns, etc.).

### 5.3 Data Flow
1. CLI parses config and seeds RNG.
2. Creates `SimulationBatch` (list of tasks) distributed to workers.
3. Worker loops: create new `GameEngine`, play until `GameOver`, record events, send summary.
4. Main thread aggregates and outputs JSON + optional CSV.

### 5.4 Avoided Patterns
- Avoid sharing mutable state between workers; communicate exclusively through structured cloning.
- Avoid mixing CLI parsing with simulation logic—keep pure runner for programmatic use.

## 6. Cross-Cutting Concerns
### 6.1 Type Sharing
- Publish TypeScript types from `core` via `exports` field, consumed by UI, bots, simulator.
- Use `tsup` or `tsc` build output with declaration maps to ensure consumer packages can tree-shake.

### 6.2 Randomness Management
- Introduce `RandomSource` interface with deterministic seedable implementation (`Mulberry32`).
- `core` never calls `Math.random` directly.
- UI injects default RNG seeded from `crypto.getRandomValues`; simulator seeds per run for reproducibility.

### 6.3 Testing Strategy
- `core`: property-based tests for attack outcomes (fast-check), plus deterministic fixture tests.
- `ui`: component tests with React Testing Library; e2e tests later using Playwright.
- `bots`/`simulator`: integration tests verifying deterministic policy outcomes and reproducible simulation batches.

### 6.4 Error Handling
- Core returns `Result` objects (`{ok: true, state}` or `{ok: false, error}`) with typed error codes (`InvalidAction`, `OutOfTurn`, etc.).
- UI surfaces friendly messages; bots/simulator log and skip invalid commands.

### 6.5 Logging & Telemetry
- Event bus can be decorated with logging subscriber for debugging.
- Simulator outputs NDJSON stream of events for offline analysis.

## 7. Detailed Component Interactions
1. **Human Turn**
   - UI builds command → controller validates (synchronous) → on success emits events → UI state updates via subscriber.
2. **Bot Turn**
   - Turn manager notifies `BotCoordinator` (in UI or simulator) via event bus when `TurnStarted` for bot player.
   - Coordinator requests legal commands from core, passes to selected policy, executes command.
   - Repeat until `EndTurnAction` is issued.
3. **Simulation Loop**
   - `SimulationRunner` listens for `GameOver` events to mark completion.
   - Intermediate snapshots optional for debugging but not required for results.

### Sequence Diagram (Textual)
```
UI Component -> GameController: executeCommand(cmd)
GameController -> GameEngine: applyCommand(cmd)
GameEngine -> Rule Services: validate+resolve
Rule Services -> GameEngine: new GameState
GameEngine -> EventBus: emit events
EventBus -> UI Store/Bot Coordinator/Logger: notify
UI Store -> React Components: re-render
```

## 8. Trade-offs & Open Questions
- **UI Threading**: Running engine on main thread simplifies integration but may block on long simulations. Mitigation: wrap simulator in worker threads; consider migrating UI engine calls to worker once profiling indicates need.
- **Immutability vs Performance**: Copying board state each command may cost memory. Optimize later using structural sharing (Immer) if profiling demands it.
- **Reinforcement Distribution**: Core enforces fairness; UI wizard ensures compliance even if user interaction fails mid-allocation by allowing cancellation and restart.
- **Event Bus Implementation**: Simple synchronous pub/sub adequate now; asynchronous queue may be needed for analytics once volume grows.

## 9. Future Extensions
- Alternate rule sets implemented by providing new strategy implementations and plugging them into the engine via dependency injection.
- Networked multiplayer: replace local controller with websocket transport while retaining command/event contracts.
- Advanced bot policies hooking into simulator for training data.

