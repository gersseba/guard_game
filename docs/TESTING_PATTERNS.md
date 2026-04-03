# Testing Patterns

Guard Game uses a layered testing approach aligned with architectural boundaries.

## Layer Testing Strategy

### World Layer Tests
- **What to test:** Command application, state transitions, determinism, and level schema validation
- **Type:** Unit tests
- **Pattern:** Given state + commands -> expected state (snapshot testing)
- **Example:**
  ```typescript
  const initialState = createWorldState({ player: { position: [5, 5] } });
  const result = world.applyCommands(initialState, [new MoveForward()]);
  expect(result.player.position).toEqual([6, 5]);
  ```
- **No mocking:** World is pure logic; test the full stack
- **Schema regression checks (`src/world/level.test.ts`):**
  - `spriteSet` is accepted for player/guards/doors (and optional entities sharing the same schema)
  - invalid `spriteSet` shapes throw descriptive errors (non-object, non-string directional values, empty object)
  - deserialized world state keeps sprite metadata JSON-serializable via round-trip assertion
  - player-facing direction defaults to `front` on level load
- **Movement intent regression checks (`src/world/world.test.ts`):**
  - directional movement intents deterministically map to `player.facingDirection` (`left`, `right`, `away`, `front`)
  - facing direction still updates from directional intent when movement is blocked
  - `selectInventorySlot` stores `{ slotIndex, itemId }` for valid indexes using the current deterministic inventory order
  - invalid inventory indexes clear `player.inventory.selectedItem` to `null`

### Render Layer Tests
- **What to test:** Sprite positioning, sprite lifecycle, viewport math, deterministic asset fallback, and DOM render utility behavior
- **Type:** Unit tests
- **Pattern:** Render world state to the PixiJS container or mount a DOM render helper, then assert sprite properties or DOM attributes/events
- **Caveat:** Rendering is mostly integration; focus on coordinate transforms and stable UI contracts
- **Directional fallback regression checks (`src/render/scene.test.ts`):**
  - `resolveSpriteAssetPathForDirection` honors deterministic fallback order for missing keys
  - mixed contracts (`spriteSet` and legacy `spriteAssetPath`) still resolve to stable render behavior
  - player sprite selection uses world-owned `player.facingDirection` and defaults to `front` when not present
  - marker fallback still applies when resolved sprite path is unavailable or failed to load
- **Paused-world UI regression checks:**
  - pause overlay starts hidden and becomes visible only after `show()`
  - viewport `inert` toggles on `show()` / `hide()`
  - paused viewport cannot gain focus and paused viewport click handlers do not fire
  - close button and Escape both call `onClose` and close the modal
  - closing the modal restores focus to `document.body`
- **Level UI control checks** (`src/render/levelUi.test.ts`):
  - controls start disabled with a single empty placeholder option before any levels are loaded
  - empty level list passed to `populateLevels` keeps controls disabled
  - non-empty level list enables select and reset button and populates one option per entry
  - `onLevelSelect` fires with the selected level id on `change` event; `onReset` fires on button click
  - `setSelectedLevel` updates the select value without triggering `onLevelSelect`
- **Outcome overlay checks** (`src/render/outcomeOverlay.test.ts`):
  - overlay starts with no DOM children in the container
  - `show()` inserts one child element; `hide()` removes it
  - `show('win')` renders "You Won!" text; `show('lose')` renders "You Lost!" text
  - repeated `show()` calls are idempotent - does not add additional elements or change the existing element reference
  - `hide()` is safe to call when already hidden (no error, no children remain)

### Interaction Layer Tests
- **What to test:** Interaction orchestration, dispatcher routing, prompt context building, thread updates
- **Type:** Unit tests
- **Pattern:** Mock LLM client, assert interaction flow and state transitions
- **Required parity checks:**
  - conversational open path is synchronous
  - conversational player-message path is asynchronous
  - deterministic door/object paths stay synchronous
  - door/object results do not trigger paused-world UI side effects
- **Prompt-profile checks (NPC):**
  - same `npcType` resolves to same profile contract
  - different `npcType` values resolve to distinct profiles
  - unknown/missing `npcType` falls back to deterministic default profile
  - serialized prompt context is deterministic for identical snapshots
- **Example:** Verify that a player interaction is routed by dispatcher kind and the correct result handler callback fires in order

### Input Layer Tests
- **What to test:** Keyboard mapping, command buffering, modal-open suppression
- **Type:** Unit tests
- **Pattern:** Simulate keyboard events, assert commands in buffer or that no command is enqueued when chat is open
- **Example:**
  ```typescript
  input.onKeyDown({ key: 'ArrowUp' });
  expect(commandBuffer.dequeue()).toBe(MoveForward);
  ```
- **Command buffer checks** (`src/input/commands.test.ts`):
  - `drain()` returns enqueued commands in FIFO order
  - `drain()` returns a snapshot - mutating the returned array does not affect the buffer
  - a second `drain()` after the first returns an empty array until new commands are enqueued
  - `clear()` discards all pending commands without preventing future `enqueue()` operations
- **Keyboard mapping checks** (`src/input/keyboard.test.ts`):
  - `f` maps to `useSelectedItem`
  - numeric keys `1`..`9` map to `selectInventorySlot` with zero-based `slotIndex`
  - unrelated keys still resolve to `null`

### Runtime Orchestration Tests
- **What to test:** Tick-time command gating, pause semantics, command-indexed callbacks, and state-commit orchestration that intentionally lives outside the pure world layer
- **Type:** Unit tests
- **Pattern:** Enqueue commands into `CommandBuffer`, step `RuntimeController`, then assert callback order and payloads against the resulting world snapshot
- **Item-use pipeline checks** (`src/runtimeController.test.ts`):
  - each `useSelectedItem` command emits exactly one deterministic `ItemUseAttemptResultEvent`
  - emitted events preserve the original command index from the drained tick list
  - no selected item resolves to `no-selection`
  - selected item with no target rules resolves to `no-target`
  - multiple use commands in one tick emit stable ordered callbacks
  - paused runtime and level-outcome gating prevent item-use callbacks from leaking through unintended ticks

### LLM Layer Tests
- **What to test:** Context serialization, response parsing, API fallbacks
- **Type:** Unit tests
- **Pattern:** Mock external API, assert request construction and deterministic fallback handling
- **Caveat:** Real API integration testing is separate

## Integration Tests

When features cross layer boundaries, write integration tests:
- **Player movement + rendering:** World updates position and facing direction, render layer reflects the selected sprite orientation
- **Input + world:** Keyboard input flows through buffer and updates world state
- **Input + runtime item-use:** Keyboard input or buffered commands trigger stable selected-item use callbacks without mutating render or LLM layers directly
- **Interaction + result routing:** Interact command resolves target, dispatcher returns result, result dispatcher applies side effect
- **NPC interaction + LLM:** Player message triggers LLM call and updates conversation thread
- **Conversation pause lifecycle:** Conversational open pauses the runtime, shows pause UI, and close/Escape resume the runtime through the shared `onClose` path
- **Level wiring checks:** Assert shipped level JSON deserializes expected gameplay positions and sprite metadata (`src/integration/starterLevel.test.ts`, `src/integration/riddleLevel.test.ts`)

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
4. Only conversational results trigger pause UI wiring.

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
