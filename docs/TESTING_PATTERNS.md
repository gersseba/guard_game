# Testing Patterns

Guard Game uses a layered testing approach aligned with architectural boundaries.

## Layer Testing Strategy

### World Layer Tests
- **What to test:** Command application, state transitions, determinism
- **Type:** Unit tests
- **Pattern:** Given state + commands → expected state (snapshot testing)
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
- **What to test:** Interaction orchestration, prompt context building, thread updates
- **Type:** Unit tests
- **Pattern:** Mock LLM client, assert interaction flow and state transitions
- **Example:** Verify that a player interaction triggers the correct NPC thread update

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
- **What to test:** Context serialization, response parsing, API stubs
- **Type:** Unit tests
- **Pattern:** Mock external API, assert prompt construction and response handling
- **Caveat:** Real API integration testing is separate

## Integration Tests

When features cross layer boundaries, write integration tests:
- **Player movement + rendering:** World updates position, render layer reflects it
- **Input + world:** Keyboard input flows through buffer and updates world state
- **NPC interaction + LLM:** Player interaction triggers LLM call and updates conversation thread

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

## Debugging World State

Use JSON serialization to inspect state:
```javascript
// In browser console
console.log(JSON.stringify(world.getState(), null, 2));
```

The debug panel in the UI also displays serialized state after each tick.

---

*Test organization: test files live alongside source files with `.test.ts` suffix.*
