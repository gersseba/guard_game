# Testing Patterns

Guard Game uses a layered testing approach aligned with architectural boundaries.

## Layer Testing Strategy

### World Layer Tests
- **What to test:** Command application, state transitions, determinism
- **Type:** Unit tests
- **Pattern:** Given state + commands -> expected state (snapshot testing)
- **Example:**
  ```typescript
  const initialState = createWorldState({ player: { position: [5, 5] } });
  const result = world.applyCommands(initialState, [new MoveForward()]);
  expect(result.player.position).toEqual([6, 5]);
  ```
- **No mocking:** World is pure logic; test the full stack

### Render Layer Tests
- **What to test:** Sprite positioning, sprite lifecycle, viewport math
- **Type:** Unit tests
- **Pattern:** Render state to PixiJS container, assert sprite properties
- **Caveat:** Rendering is mostly integration; focus on coordinate transforms

### Interaction Layer Tests
- **What to test:** Interaction orchestration, dispatcher routing, prompt context building, thread updates
- **Type:** Unit tests
- **Pattern:** Mock LLM client, assert interaction flow and state transitions
- **Required parity checks:**
  - conversational open path is synchronous
  - conversational player-message path is asynchronous
  - deterministic door/object paths stay synchronous
- **Prompt-profile checks (NPC):**
  - same `npcType` resolves to same profile contract
  - different `npcType` values resolve to distinct profiles
  - unknown/missing `npcType` falls back to deterministic default profile
  - serialized prompt context is deterministic for identical snapshots
- **Example:** Verify that a player interaction is routed by dispatcher kind and the correct result handler callback fires in order

### Input Layer Tests
- **What to test:** Keyboard mapping, command buffering
- **Type:** Unit tests
- **Pattern:** Simulate keyboard events, assert commands in buffer
- **Example:**
  ```typescript
  input.onKeyDown({ key: 'ArrowUp' });
  expect(commandBuffer.dequeue()).toBe(MoveForward);
  ```

### LLM Layer Tests
- **What to test:** Context serialization, response parsing, API fallbacks
- **Type:** Unit tests
- **Pattern:** Mock external API, assert request construction and deterministic fallback handling
- **Caveat:** Real API integration testing is separate

## Integration Tests

When features cross layer boundaries, write integration tests:
- **Player movement + rendering:** World updates position, render layer reflects it
- **Input + world:** Keyboard input flows through buffer and updates world state
- **Interaction + result routing:** Interact command resolves target, dispatcher returns result, result dispatcher applies side effect
- **NPC interaction + LLM:** Player message triggers LLM call and updates conversation thread

**Pattern:** End-to-end flow through multiple layers, assert final observable state.

## Determinism Verification

For any feature that touches world state:
1. Record initial state
2. Apply commands sequence N times
3. Assert final state is identical each time
4. Can assert anywhere in the sequence for intermediate states

**Example:**
```typescript
const commands = [MoveForward, TurnRight, Interact];
const state1 = applyCommands(initialState, commands);
const state2 = applyCommands(initialState, commands);
expect(state1).toEqual(state2); // Determinism check
```

## Dispatcher Timing Regression Pattern

When interaction routing is refactored, add regression tests for callback timing order.

Minimum assertions:
1. Sync path callbacks fire between `before-dispatch` and `after-dispatch` markers.
2. Async path callbacks only fire after promise resolution.
3. Existing level-outcome and world-state update effects are unchanged.

Reference: `src/interaction/interactionDispatcher.test.ts` timing parity tests.

## Debugging World State

Use JSON serialization to inspect state:
```javascript
// In browser console
console.log(JSON.stringify(world.getState(), null, 2));
```

The debug panel in the UI also displays serialized state after each tick.

---

*Test organization: test files live alongside source files with `.test.ts` suffix.*
