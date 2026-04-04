# Input Layer

The input layer captures keyboard input and translates it into `WorldCommand` values, which are buffered and applied during the world tick.

## Responsibilities
- Listen for keyboard events
- Map keyboard keys to world commands (for example, arrow keys to move commands)
- Buffer commands for the next world tick
- Suppress gameplay command enqueueing while the conversation modal is open
- Do not modify world state directly; only enqueue commands
- Handle input debouncing if needed

## Core Concepts

### CommandBuffer
A queue of `WorldCommand` values waiting to be applied to the world. Three operations:
- `enqueue(command)` - adds a command to the buffer (called by the keyboard handler)
- `drain()` - atomically returns and clears all pending commands; called once per tick by `RuntimeController.stepSimulation()`
- `clear()` - discards all pending commands without returning them; called by `RuntimeController` on conversation pause entry and exit to prevent buffered inputs from leaking into resumed ticks

### WorldCommand
Represents a player action. Examples: `MoveForward`, `MoveBackward`, `TurnLeft`, `TurnRight`, `Interact`.

### Keyboard Mapping
`bindKeyboardCommands()` in [src/input/keyboard.ts](../src/input/keyboard.ts) maps physical keyboard inputs to semantic world commands.

Current key map:
- `ArrowUp` / `w` -> move up
- `ArrowDown` / `s` -> move down
- `ArrowLeft` / `a` -> move left
- `ArrowRight` / `d` -> move right
- `e` -> interact
- `1`..`9` -> select inventory slot `0`..`8`
- `f` -> use selected inventory item

Command semantics:
- `selectInventorySlot` is deterministic state selection only; world applies bounds against current inventory length and clears selection when invalid.
- `useSelectedItem` represents a use attempt signal; deterministic resolution is handled by runtime + interaction resolver wiring.

### Keyboard Normalization Strategy

`mapKeyboardEventToWorldCommand(key: string)` performs deterministic key normalization:
- Input keys are case-normalized (lowercase) before lookup in the binding map
- Arrow keys (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`) are used as-is from `event.key`
- WASD keys (`w`, `a`, `s`, `d`) are available as lowercase alternatives for Arrow movement
- Numeric keys `1`..`9` are matched directly for inventory slot selection
- Unknown keys return `null` (mapped action exists but key is not recognized)

**Arrow/WASD Parity:** Both arrow keys and WASD produce identical movement commands, enabling player preference and accessibility.

Example:
```typescript
mapKeyboardEventToWorldCommand('W') -> null (uppercase W not in map)
mapKeyboardEventToWorldCommand('w') -> { type: 'move', dx: 0, dy: -1 }
mapKeyboardEventToWorldCommand('ArrowUp') -> { type: 'move', dx: 0, dy: -1 }
mapKeyboardEventToWorldCommand('z') -> null (z not mapped)
```

### Modal-Aware Input Suppression

The binding optionally accepts an `isModalOpen?: () => boolean` callback in `KeyboardBindingOptions`, which let the runtime suppress gameplay commands while UI modals are visible:

```typescript
bindKeyboardCommands(window, commandBuffer, {
  isModalOpen: () => chatModal.isOpen(),
});
```

**Suppression behavior:**
- When `isModalOpen()` returns `true`, keyboard events that map to movement or interact commands return early and do not enqueue
- The chat input component manages its own key event propagation separately; typing in chat input does not emit global keypresses
- The callback provides runtime with control over modal state visibility without requiring the input layer to know which modal is open
- Inventory selection keys (`1`..`9`) are *not* suppressed; inventory slot selection remains available while modals are visible for future interaction routing

## Conversation Pause Input Policy

Current paused-conversation input behavior is split across layers on purpose:
1. `bindKeyboardCommands()` returns early when `isModalOpen()` is true, so mapped gameplay keys do not enqueue movement or interact commands while chat is open.
2. `RuntimeController` still clears the command buffer on conversation open and close, and drains/discards any queued commands during paused ticks. Input suppression and runtime draining are complementary protections.
3. The chat input in [src/render/chatModal.ts](../src/render/chatModal.ts) stops `keydown` and `keyup` propagation so typing does not reach the global keyboard binding. Enter submission stays local to the modal, and Escape is handled by the modal close path instead of producing a `WorldCommand`.
4. Viewport focus and pointer blocking are not handled in the input layer. That policy lives in [src/render/viewportOverlay.ts](../src/render/viewportOverlay.ts), which makes only the viewport inert.

## Extension Pattern: Add a new command

See [Add a Command](ADD_COMMAND.md) for the full pattern.

## Implementation Guideline

Keep the input layer simple and event-driven:
- Do not poll state
- Do not perform game logic
- Do not call other layers directly
- Simply map input to command to buffer

---

*See [System Architecture](ARCHITECTURE.md) for the input contract.*