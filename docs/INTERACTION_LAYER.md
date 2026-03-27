# Interaction Layer

The interaction layer resolves player-triggered interactions and routes them through a two-stage dispatcher architecture:
- interaction dispatch (target kind -> handler)
- result dispatch (result kind -> side-effect callback)

It supports both conversational interactions (guards/NPCs) and deterministic interactions (doors/interactive objects).

## Responsibilities
- Resolve one adjacent interaction target deterministically
- Route target kinds to registered interaction handlers
- Keep deterministic interactions local and synchronous
- Keep LLM-backed conversational turns behind the LLM boundary
- Route normalized results through result handlers to main-loop side effects

## Target Resolution

`resolveAdjacentTarget()` in `src/interaction/adjacencyResolver.ts` resolves orthogonally adjacent targets in a deterministic order:
1. `guard`
2. `door`
3. `npc`
4. `interactiveObject`

Tie-break inside the same kind is lexical target id order.

This behavior is covered by `src/interaction/adjacencyResolver.test.ts`.

## Dispatcher Architecture

### Interaction Dispatcher
`createInteractionDispatcher()` in `src/interaction/interactionDispatcher.ts` owns a registry keyed by `AdjacentTarget['kind']`.

Registered handlers:
- `guard` -> conditional handler (sync chat-open, async player-message)
- `npc` -> conditional handler (sync chat-open, async player-message)
- `door` -> sync deterministic handler
- `interactiveObject` -> sync deterministic handler

Dispatcher contract:
- Input: `target`, `worldState`, optional `playerMessage`
- Output: `InteractionHandlerResult | Promise<InteractionHandlerResult>`

### Result Dispatcher
`createResultDispatcher()` in `src/interaction/interactionDispatcher.ts` owns a second registry keyed by `InteractionHandlerResult['kind']`.

Registered result handlers:
- `guard`/`npc` -> open chat modal with the latest actor conversation thread for that target id
- `door` -> apply level outcome callback if present
- `interactiveObject` -> apply immutable world-state reset callback if present

Result dispatcher keeps main-loop side effects centralized and testable.

## Main Loop Routing Pattern

`runInteractionIfRequested()` in `src/main.ts` now uses one routing path:
1. Resolve adjacent target.
2. Call `interactionDispatcher.dispatch(...)`.
3. If promise-like, resolve asynchronously then call `resultDispatcher.dispatch(...)`.
4. If sync result, call `resultDispatcher.dispatch(...)` immediately.

This removes target-kind branching from `main.ts` and preserves behavior parity from pre-refactor logic.

The runtime bridge and tests use the shared actor-neutral helper in `src/interaction/actorConversationThread.ts` to read and render conversation history.

## Behavior Parity Expectations

The following timing guarantees are intentional and must remain stable:
- **Sync chat-open path:** opening a guard/NPC conversation without a player message stays synchronous so modal opening order remains deterministic.
- **Async player-message path:** sending a player message in chat stays asynchronous for LLM-backed turns; UI loading + response append happen after promise resolution.
- **Sync deterministic path:** doors and interactive objects remain synchronous and do not depend on LLM I/O.

Related tests live in `src/interaction/interactionDispatcher.test.ts` under dispatch routing and result dispatcher timing parity cases.

## Interactive Object Type Handling

`src/interaction/objectInteraction.ts` provides object-type dispatch:
- `OBJECT_TYPE_HANDLERS` maps `InteractiveObject['objectType']` to a handler
- Current supported type: `supply-crate`
- Handler reads instance fields (`idleMessage`, `usedMessage`, `firstUseOutcome`) while reusing shared object-type logic

This allows multiple objects to share one behavior implementation while retaining per-instance outcomes/messages from level JSON.

## LLM Boundary

Only conversational player-message flows route to the LLM layer (guard/NPC chat services). Chat-open flows and deterministic door/object interactions do not call the LLM client.

See `src/interaction/guardInteraction.ts`, `src/interaction/npcInteraction.ts`, and `src/llm/client.ts`.

## Tests

- `src/interaction/interactionDispatcher.test.ts`: dispatch routing by kind, sync/async behavior parity, result dispatcher timing parity
- `src/interaction/objectInteraction.test.ts`: object-type dispatcher behavior, first-use outcomes, repeat interactions
- `src/integration/starterLevel.test.ts`: end-to-end adjacent object resolution and state updates
- `src/interaction/adjacencyResolver.test.ts`: deterministic target resolution with interactive objects
