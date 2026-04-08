# Add an Interaction

This pattern covers interaction flows currently in the game:
- conversational interactions (guard/NPC via chat and optional LLM)
- deterministic interactions (doors and interactive objects)

## Choose the Interaction Kind

1. Use conversational flow when the target should open chat history and possibly call the LLM boundary.
2. Use deterministic flow when the interaction should be fully local and replayable from state.

## Pattern A: Add or Extend Conversational Interactions

### 1. Extend prompt/context builder
- Add context fields in `src/interaction/guardPromptContext.ts` (or equivalent NPC context module).
- Keep payload JSON-serializable.

### 2. Update interaction service
- Guard path: `src/interaction/guardInteraction.ts`
- NPC path: `src/interaction/npcInteraction.ts`

### 3. Register interaction handler
In `src/interaction/interactionDispatcher.ts`:
- implement or extend the kind-specific handler
- register it in the interaction registry
- preserve timing parity:
  - no `playerMessage` -> synchronous initial open result for action modal routing
  - with `playerMessage` -> asynchronous conversational result for chat continuation

**Modal Routing Behavior:**
Conversational handlers return `isConversational: false` on initial open (no player message yet). The result dispatcher routes this to callbacks that open the action modal selector (Chat vs Inventory vs Back) or directly to the chat modal depending on runtime config.

### 4. Register result handler behavior
In `src/interaction/interactionDispatcher.ts` result registry:
- map conversational result kind with `isConversational: false` to action modal open callback (if implemented) or directly to `onConversationStarted(...)` for backward compatibility
- map conversational result kind with `isConversational: true` to `onConversationStarted(...)` for LLM response display
- rely on `getConversationHistory(...)` for modal preload consistency

### 5. Keep runtime bridge generic
`src/runtime/interactionResultBridge.ts` should not branch by target kind for interaction logic.
- `runInteractionIfRequested()` dispatches once and forwards result to `resultDispatcher`
- chat submit path resolves target by id and reuses dispatcher with `playerMessage`
- action modal routing (if present) handles player choice to Chat/Inventory/Back without runtime bridge changes

### 6. Test
- Unit tests in `src/interaction/*Interaction.test.ts`
- Dispatcher parity tests in `src/interaction/interactionDispatcher.test.ts`
- Integration coverage in `src/integration/*.test.ts`

## Pattern B: Add a New Deterministic Interaction Kind

### 1. Extend world types
In `src/world/types.ts`:
- add/extend the required model fields
- keep JSON-serializable shape

### 2. Validate and deserialize level data
In `src/world/level.ts`:
- update `validateLevelData()` for new fields and constraints
- map new fields in `deserializeLevel()`

### 3. Implement interaction behavior
Use or create an interaction module in `src/interaction/` that:
- accepts plain serializable inputs
- returns immutable updated state/results
- avoids render/UI concerns

### 4. Register handler in interaction dispatcher
In `src/interaction/interactionDispatcher.ts`:
- add handler to interaction registry
- return normalized `InteractionHandlerResult`

### 5. Register side-effect mapping in result dispatcher
In `src/interaction/interactionDispatcher.ts`:
- add result handler for the new kind
- route through existing callbacks (`onWorldStateUpdated`, `onLevelOutcomeChanged`, etc.) or add callback extension points if required

### 6. Ensure adjacency resolution includes target kind
`src/interaction/adjacencyResolver.ts` must include the kind and preserve deterministic priority ordering.

### 7. Add tests
- unit tests for interaction logic
- resolver tests for deterministic target selection
- dispatcher tests for sync/async behavior expectations
- integration tests for end-to-end behavior

## Supply-Crate Example (Current Implementation)

Current object type: `supply-crate`

Behavior highlights:
- first interaction: `state` moves `idle -> used`
- response text comes from `idleMessage` fallback
- repeat interaction uses `usedMessage` fallback
- optional `firstUseOutcome` sets `levelOutcome` only on first use and only if no outcome is already set

Reference implementation:
- `src/interaction/objectInteraction.ts`

## Checklist