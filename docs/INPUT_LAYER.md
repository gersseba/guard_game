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

The binding optionally accepts `isModalOpen()`, which lets the runtime suppress gameplay commands while the chat modal is visible.

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
