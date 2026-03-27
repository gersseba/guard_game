# Input Layer

The input layer captures keyboard input and translates it into `WorldCommand` values, which are buffered and applied during the world tick.

## Responsibilities
- Listen for keyboard events
- Map keyboard keys to world commands (e.g., arrow keys → move commands)
- Buffer commands for the next world tick
- Do not modify world state directly; only enqueue commands
- Handle input debouncing if needed

## Core Concepts

### CommandBuffer
A queue of `WorldCommand` values waiting to be applied to the world. Drained once per tick.

### WorldCommand
Represents a player action. Examples: `MoveForward`, `MoveBackward`, `TurnLeft`, `TurnRight`, `Interact`.

### Keyboard Mapping
Maps physical keyboard inputs (key codes, combinations) to semantic world commands.

## Extension Pattern: Add a new command

See [Add a Command](ADD_COMMAND.md) for the full pattern.

## Implementation Guideline

Keep the input layer simple and event-driven:
- Do not poll state
- Do not perform game logic
- Do not call other layers directly
- Simply map input → command → buffer

---

*See [System Architecture](ARCHITECTURE.md) for the input contract.*
