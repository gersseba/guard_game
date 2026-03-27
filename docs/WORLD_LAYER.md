# World Layer

The world layer maintains the deterministic game state and applies commands to advance the game. All game logic lives here.

## Responsibilities
- Maintain `WorldState` (current player position, NPC positions, interactive objects, tick count, etc.)
- Apply `WorldCommand` values to update state
- Emit interaction events when commands trigger NPC interactions
- Preserve determinism: given the same command sequence, produce identical state
- Keep state JSON-serializable for LLM context generation

## Core Concepts

### WorldState
The complete snapshot of game state at any tick. Must be JSON-serializable.

### WorldCommand
Represents a player action or system event. Examples: `move_forward`, `move_backward`, `turn_left`, `turn_right`, `interact`.

### Tick
Fixed-rate world update. Current interval: 100ms. Each tick applies buffered commands and advances the game clock.

### Determinism Guarantee
Running `world.applyCommands([cmd1, cmd2])` on state `S` always produces the same resulting state, regardless of when it runs or the render state.

## Extension Pattern: Add a new WorldCommand

See [Add a Command](ADD_COMMAND.md) for the full pattern.

## Testing Strategy

- Unit tests for `applyCommands()` with known command sequences
- State snapshots: start state → commands → expected end state
- No time-based or random events in tests; all state is deterministic
- See [Testing Patterns](TESTING_PATTERNS.md) for layer testing strategy

---

*See [System Architecture](ARCHITECTURE.md) for layer contract details.*
