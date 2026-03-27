# Add an Interaction

This pattern covers both interaction flows currently in the game:
- conversational interactions (guard/NPC via chat and optional LLM)
- deterministic interactive-object interactions (object-type dispatcher)

## Choose the Interaction Kind

1. Use conversational flow when the target should open chat history and possibly call the LLM boundary.
2. Use deterministic object flow when the interaction should be fully local and replayable from state.

## Pattern A: Add or Extend Conversational Interactions

### 1. Extend prompt/context builder
- Add context fields in `src/interaction/guardPromptContext.ts` (or equivalent NPC context module).
- Keep payload JSON-serializable.

### 2. Update interaction service
- Guard path: `src/interaction/guardInteraction.ts`
- NPC path: `src/interaction/npcInteraction.ts`

### 3. Route in main interaction loop
- Ensure `runInteractionIfRequested()` in `src/main.ts` handles the target kind and opens chat with existing history.

### 4. Test
- Unit tests in `src/interaction/*Interaction.test.ts`
- Integration coverage in `src/integration/*.test.ts`

## Pattern B: Add a New Interactive Object Type

### 1. Extend world types
In `src/world/types.ts`:
- add new `objectType` union member on `InteractiveObject`
- add any new optional per-instance fields required by the behavior

### 2. Validate and deserialize level data
In `src/world/level.ts`:
- update `validateLevelData()` for the new type and any new constrained fields
- map new fields in `deserializeLevel()`

### 3. Add object-type handler
In `src/interaction/objectInteraction.ts`:
- implement a handler function for the new object type
- register it in `OBJECT_TYPE_HANDLERS`
- keep handler deterministic and immutable (return new world state)

### 4. Ensure adjacency resolution includes target kind
`src/interaction/adjacencyResolver.ts` must include `interactiveObject` candidates and preserve deterministic priority ordering.

### 5. Wire runtime routing
`src/main.ts` should route `adjacentTarget.kind === 'interactiveObject'` to `handleInteractiveObjectInteraction()` and commit returned state.

### 6. Add tests
- unit tests: `src/interaction/objectInteraction.test.ts`
- resolver tests: `src/interaction/adjacencyResolver.test.ts`
- integration tests: `src/integration/starterLevel.test.ts`

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

- [ ] Target kind chosen (chat vs deterministic object)
- [ ] Types updated in `src/world/types.ts`
- [ ] Level validation/deserialization updated in `src/world/level.ts`
- [ ] Runtime routing updated in `src/main.ts`
- [ ] Deterministic tests added/updated
- [ ] Integration test verifies end-to-end interaction behavior
- [ ] State remains JSON-serializable
