# Interaction Layer

The interaction layer resolves player-triggered interactions and routes them through a two-stage dispatcher architecture:
- interaction dispatch (target kind -> handler)
- result dispatch (result kind -> side-effect callback)

It supports both conversational interactions (guards/NPCs) and deterministic interactions (doors/interactive objects).

It also defines the deterministic item-use resolver boundary used by runtime selected-item use commands.

## Responsibilities
- Resolve one adjacent interaction target deterministically
- Classify targets as conversational or deterministic (action modal routing)
- Route target kinds to registered interaction handlers
- Keep deterministic interactions local and synchronous
- Keep LLM-backed conversational turns behind the LLM boundary
- Route normalized results through result handlers to main-loop side effects

## Action Modal Routing

**Action Modal Eligible Targets** are the classes of adjacent targets that open modal-based interaction flows:
- `guard` (conversational via chat modal with LLM)
- `npc` (conversational via chat modal with LLM)

**Non-Modal Eligible Targets** are handled deterministically without modal presentation:
- `door` (deterministic open/locked/safe/danger outcome)
- `interactiveObject` (deterministic state transition and optional outcome)

This classification enables the runtime to route interactions appropriately:
1. If target is action-modal-eligible (guard/npc), the interaction dispatcher forwards to conversational handlers and result dispatcher opens chat modal on success.
2. If target is deterministic (door/object), the interaction dispatcher handles locally and commits result-world-state mutations without opening any modal.

**Type Guard Pattern:**

`isActionModalEligibleTarget(target: AdjacentTarget): target is Extract<AdjacentTarget, { kind: 'guard' | 'npc' }>`

Useful for runtime branching when deciding whether to open the chat modal after interaction resolution.

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

## Item-Use Resolver Boundary

`createDefaultItemUseResolver()` in `src/interaction/itemUse.ts` provides deterministic resolution for `useSelectedItem` commands.

Current behavior:
- Reads `worldState.player.inventory.selectedItem`.
- Emits one `ItemUseAttemptResultEvent` per `useSelectedItem` command, preserving the command index from the tick command list.
- Returns `no-selection` when no selected item exists.
- Returns `no-target` when an item is selected but no adjacent target exists or the adjacent target doesn't accept item-use.
- Emits target info (door/guard/npc/interactiveObject) for debugging and event logging.

### Guard and Object Item-Use Rules

When an adjacent target is a guard or interactive object, the resolver checks for data-driven item-use rules:
- **Guard rules**: `guard.itemUseRules?: Record<string, ItemUseRule>`
  - If selected item has a matching rule entry:
    - `rule.allowed === true`: returns `result='success'` with `affectedEntityType='guard'`, `affectedEntityId`, and `ruleResponseText`
    - `rule.allowed === false`: returns `result='blocked'` with `ruleResponseText` (no entity mutation)
  - If selected item has no matching rule: returns `result='no-rule'` (unsupported item for this guard)
  - Successful use marks guard state to `'alert'` via runtime integration (world layer mutation)

- **Object rules**: `interactiveObject.itemUseRules?: Record<string, ItemUseRule>`
  - If selected item has a matching rule entry:
    - `rule.allowed === true`: returns `result='success'` with `affectedEntityType='object'`, `affectedEntityId`, and `ruleResponseText`
    - `rule.allowed === false`: returns `result='blocked'` with `ruleResponseText` (no entity mutation)
  - If selected item has no matching rule: returns `result='no-rule'` (unsupported item for this object)
  - Successful use marks object state to `'used'` via runtime integration (world layer mutation)

All rules are deterministic and code-owned. No LLM involvement in item-use success/failure determination. Response text is narrative only.

Main-loop wiring in `src/main.ts` commits the latest emitted event to `worldState.lastItemUseAttemptEvent` via immutable `world.resetToState(...)`.

LLM boundary note:
- Item-use attempt resolution is deterministic and code-owned.
- No LLM call is involved in item-use result determination.
- Guard and object item-use rules are entirely code-determined; success/failure outcomes cannot be negotiated with the LLM.

## Conversation Pause Lifecycle

When the result dispatcher opens a guard or NPC conversation (`onConversationStarted` in [src/main.ts](../src/main.ts)), the runtime bridge performs three side effects in order:
1. `runtimeController.openConversation(actorId)` sets the runtime to paused state, records the active `RuntimeConversationSession`, and clears buffered commands.
2. `viewportPauseOverlay.show()` reveals the grey viewport overlay and makes `#viewport` inert.
3. `chatModal.open(targetId, displayName, conversationHistory)` opens the conversation UI and focuses the input.

While paused, `runtimeController.stepSimulation()` drains and discards buffered commands each tick without updating world state or dispatching interactions.

When the chat modal closes, both exit controls follow the same path:
1. The close button or Escape key triggers `closePanel()` in [src/render/chatModal.ts](../src/render/chatModal.ts).
2. `closePanel()` hides the modal, removes the Escape listener, invokes `onClose`, and then restores focus to `document.body` if focus was still inside the modal.
3. `onClose` in [src/main.ts](../src/main.ts) calls `runtimeController.closeConversation()` and `viewportPauseOverlay.hide()`.
4. `runtimeController.closeConversation()` clears the active conversation session, clears buffered commands accumulated during the conversation, and resumes simulation on the next tick.

Door and interactive object results never trigger `onConversationStarted`, so they never cause a pause and never show the viewport overlay. This is enforced by the result dispatcher and verified in `src/interaction/interactionDispatcher.test.ts` under the `result dispatcher timing parity` suite.

Gameplay pause state is kept outside `WorldState`. UI pause presentation is also transient render-layer DOM state. Neither belongs in serialized world state or LLM context.

## Actor Prompt Context

NPC and guard conversational turns build prompt context through `src/interaction/npcPromptContext.ts` (shared builders) and `src/interaction/guardPromptContext.ts`.

### Prompt Profile Resolution

Prompt profile resolution behavior (shared by all actor types):
- `npcType` is normalized via `trim().toLowerCase()`
- profile lookup is performed against `ACTOR_PROMPT_PROFILE_REGISTRY`
- `NPC_PROMPT_PROFILE_REGISTRY` remains as a legacy alias to the same shared registry for compatibility
- unknown, empty, or missing `npcType` values deterministically fall back to `DEFAULT_NPC_PROMPT_PROFILE`
- fallback responses expose `profileKey: 'default'`

### World Knowledge Builder Registry

World knowledge is resolved separately from prompt profiles via `buildActorTypeWorldKnowledge(actorType, worldState, actorId)` in `src/interaction/npcPromptContext.ts`. Both `buildGuardPromptContext` and `buildNpcPromptContext` route through this function.

Resolution order:
1. Normalize `actorType` via `trim().toLowerCase()`
2. Look up a builder directly in `ACTOR_TYPE_WORLD_KNOWLEDGE_BUILDERS`
3. If not found, check `ACTOR_WORLD_KNOWLEDGE_BUILDER_ALIASES` and resolve to the alias target's builder
4. If neither resolves, return `null` — `typeWorldKnowledge` is omitted from the context deterministically

Current registry keys and payload shapes:
- `guard`: `{ player, guards[], doors[] }` — all guards/doors with truth and outcome flags
- `villager`: `{ player, otherVillagers[] }` — other villagers in the level, excluding the requesting actor by `actorId`

Current aliases:
- `archive_keeper → villager`

Unknown actor types produce `null` and omit `typeWorldKnowledge` without throwing.

### NPC Prompt Context Shape

`buildNpcPromptContext(npc, player, worldState)` returns serialized JSON with up to five sections:
- `actor`: stable actor identifier and raw `npcType`
- `npcProfile`: resolved shared profile (`profileKey`, `requestedNpcType`, persona/knowledge/style constraints)
- `npcInstance`: per-instance data (`displayName`, `position`, `dialogueContextKey`)
- `typeWorldKnowledge` _(conditional)_: actor-type-specific world facts; present only when `buildActorTypeWorldKnowledge` returns a non-null value
- `player`: player identifier and display name

This split keeps shared type-level prompt policy (`npcProfile`) separate from per-instance world facts (`npcInstance`) and type-scoped world context (`typeWorldKnowledge`).

## Behavior Parity Expectations

The following timing guarantees are intentional and must remain stable:
- **Sync chat-open path:** opening a guard/NPC conversation without a player message stays synchronous so modal opening order remains deterministic.
- **Async player-message path:** sending a player message in chat stays asynchronous for LLM-backed turns; UI loading + response append happen after promise resolution.
- **Sync deterministic path:** doors and interactive objects remain synchronous and do not depend on LLM I/O.

Related tests live in `src/interaction/interactionDispatcher.test.ts` under dispatch routing and result dispatcher timing parity cases.

## Interactive Object Polymorphic Dispatch

`src/interaction/objectInteraction.ts` now routes interactive objects through runtime class mapping:
- `mapInteractiveObjectDtoToRuntime(...)` in `src/world/entities/dtoRuntimeSeams.ts` adapts JSON DTOs to a `WorldObject` subclass
- `handleObjectInteraction(...)` calls `worldObject.interact(...)` for polymorphic behavior
- current subclasses:
  - `ContainerObject` (pickup/container behavior)
  - `MechanismObject` (activation behavior)
  - `DoorObject` (door-like object behavior with safe/danger fact fallback)
- unsupported object DTOs map to `null` and remain inert through fallback behavior

This keeps serialized `interactiveObjects` state unchanged while moving behavior branching out of the interaction module and into deterministic world-object subclasses.

Pickup behavior is deterministic and code-owned:
- if an interactive object has `pickupItem` and is interacted with in `idle` state, the item is added to `player.inventory.items`
- pickup entries include `sourceObjectId` and `pickedUpAtTick` to keep state auditable and replay-friendly
- repeated interactions on the same object instance cannot duplicate pickup entries
- no LLM call participates in pickup rule enforcement

## LLM Boundary

Only conversational player-message flows route to the LLM layer (guard/NPC chat services). Chat-open flows and deterministic door/object interactions do not call the LLM client.

NPC interactions build context in the interaction layer and call `llmClient.complete(...)` from `src/llm/client.ts`.

See `src/interaction/guardInteraction.ts`, `src/interaction/npcInteraction.ts`, and `src/llm/client.ts`.

## Tests

- `src/interaction/interactionDispatcher.test.ts`: dispatch routing by kind, sync/async behavior parity, result dispatcher timing parity, door/object non-pause guarantee
- `src/runtimeController.test.ts`: pause entry/exit lifecycle, command gating while paused, resume without command leak, level-outcome gating independent of pause state
- `src/interaction/npcPromptContext.test.ts`: profile registry resolution, deterministic fallback, world knowledge builder registry keys, alias resolution (`archive_keeper → villager`), self-exclusion from `otherVillagers`, unknown-type `null` fallback, context shape determinism
- `src/interaction/objectInteraction.test.ts`: polymorphic object dispatch, first-use outcomes, repeat interactions
- `src/integration/riddleLevel.test.ts`: end-to-end adjacent door resolution and deterministic outcome mapping
- `src/interaction/adjacencyResolver.test.ts`: deterministic target resolution with interactive objects
