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

`runInteractionIfRequested()` in `src/main.ts` uses one routing path:
1. Resolve adjacent target.
2. Call `interactionDispatcher.dispatch(...)`.
3. If promise-like, resolve asynchronously then call `resultDispatcher.dispatch(...)`.
4. If sync result, call `resultDispatcher.dispatch(...)` immediately.

This removes target-kind branching from `main.ts` and preserves behavior parity from pre-refactor logic.

The runtime bridge and tests use the shared actor-neutral helper in `src/interaction/actorConversationThread.ts` to read and render conversation history.

## Conversation Pause Lifecycle

When the result dispatcher opens a guard or NPC conversation (`onConversationStarted`), it calls `runtimeController.openConversation(actorId)`, which:
1. Sets the runtime to paused state.
2. Records the target actor id as the active `RuntimeConversationSession`.
3. Clears any buffered commands so pre-conversation inputs do not bleed into the first resumed tick.

While paused, `runtimeController.stepSimulation()` drains and discards buffered commands each tick without updating world state or dispatching interactions.

When the chat modal closes (`onClose`), it calls `runtimeController.closeConversation()`, which:
1. Clears the active conversation session.
2. Clears buffered commands accumulated during the conversation.
3. Resumes normal simulation on the next tick.

Door and interactive object results never trigger `onConversationStarted`, so they never cause a pause. This is enforced by the result dispatcher and verified in `src/interaction/interactionDispatcher.test.ts` under the `result dispatcher timing parity` suite.

Pause state is kept outside `WorldState`. It is transient runtime orchestration state managed by `RuntimeController` and must not be serialized or included in LLM context.

## NPC Prompt Profile Context

NPC conversational turns call `buildNpcPromptContext()` from `src/interaction/npcPromptContext.ts`.

Prompt profile resolution behavior:
- `npcType` is normalized via `trim().toLowerCase()`
- profile lookup is performed against `NPC_PROMPT_PROFILE_REGISTRY`
- unknown, empty, or missing `npcType` values deterministically fall back to `DEFAULT_NPC_PROMPT_PROFILE`
- fallback responses expose `profileKey: 'default'`

The serialized prompt context includes four top-level sections:
- `actor`: stable actor identifier and raw `npcType`
- `npcProfile`: resolved shared profile (`profileKey`, `requestedNpcType`, persona/knowledge/style constraints)
- `npcInstance`: per-instance data (`displayName`, `position`, `dialogueContextKey`)
- `player`: player identifier and display name

This split keeps shared type-level prompt policy separate from per-instance world facts.

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

NPC interactions build context in the interaction layer and call `llmClient.complete(...)` from `src/llm/client.ts`.

See `src/interaction/guardInteraction.ts`, `src/interaction/npcInteraction.ts`, and `src/llm/client.ts`.

## Tests

- `src/interaction/interactionDispatcher.test.ts`: dispatch routing by kind, sync/async behavior parity, result dispatcher timing parity, door/object non-pause guarantee
- `src/runtimeController.test.ts`: pause entry/exit lifecycle, command gating while paused, resume without command leak, level-outcome gating independent of pause state
- `src/interaction/npcPromptContext.test.ts`: profile registry resolution, deterministic fallback, context shape determinism
- `src/interaction/objectInteraction.test.ts`: object-type dispatcher behavior, first-use outcomes, repeat interactions
- `src/integration/starterLevel.test.ts`: end-to-end adjacent object resolution and state updates
- `src/interaction/adjacencyResolver.test.ts`: deterministic target resolution with interactive objects
