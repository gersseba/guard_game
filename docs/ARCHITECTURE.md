# Guard Game System Architecture

## Overview

Guard Game enforces strict layer separation to support deterministic world updates and LLM-driven gameplay:

```
/src
  /world          — Deterministic world model (state, command application, ticks)
  /render         — PixiJS rendering port (grid, sprites, camera, viewport)
  /interaction    — NPC interaction orchestration and response formatting
  /input          — Input command buffering and keyboard mapping
  /llm            — LLM client boundary and context generation stubs
  main.ts         — Runtime bootstrap and frame/tick loop
```

## Design Principles

### Deterministic World Updates
All game state changes are deterministic and command-driven. There are no random events or time-based calculations in the world model. Every tick produces identical results given the same command sequence.

**Implication:** The world model is testable, serializable for LLM context, and can be replayed or mutated by external systems.

### JSON-Serializable State
All world state must serialize to JSON. This enables LLM systems to reason about game state, and allows debugging via inspection in the browser console.

**Implication:** Avoid circular references, functions, or non-serializable objects in `WorldState` and related types.

### Layer Isolation
- Game logic lives in the world model only.
- Rendering code contains zero game logic; it reads state and draws.
- Input layer maps keyboard to commands; it does not modify world state.
- Interaction layer orchestrates NPC flows; it does not directly call render code.
- LLM layer provides stubs and context only; it is not invoked by core game loop.

**Implication:** Any feature can be tested by manipulating world state; rendering changes never require testing game logic.

### Descriptive Naming
Types and interfaces use clear, semantic names. This supports LLM prompt generation and makes code self-documenting.

**Examples:**
- `WorldCommand` (not just `Command`)
- `InteractionRequest`, `InteractionResponse` (not generic `Message`)
- `NpcThread` (for conversation context, not `Dialog`)

## Data Flow

### Frame Loop
1. **Input Phase:** Keyboard input is captured and mapped to `WorldCommand` values, enqueued into `CommandBuffer`.
2. **Tick Phase** (fixed 100ms): Buffered commands are drained and applied to world state via `world.applyCommands(commands)`.
3. **World Update:** If an `interact` command was issued, nearby NPC interaction is resolved through the interaction service.
4. **Render Phase:** Every animation frame renders the latest world state through the PixiJS render port.
5. **Debug Phase:** Current JSON world state is serialized and printed to the debug panel.

```
[Keyboard Input]
       ↓
[Command Buffer]
       ↓
[World.applyCommands()] ← deterministic state update
       ↓
[Interaction Service] ← if interact command issued
       ↓
[Render Port] ← reads updated state, draws sprites
       ↓
[Debug Panel] ← serializes and displays JSON state
```

## Layer Contracts

### World Layer
- **Responsibility:** Maintain deterministic game state and apply commands.
- **Input:** `WorldCommand[]` from the input buffer.
- **Output:** Updated `WorldState` and emission of interaction events if queued.
- **Guarantee:** Same commands always produce same state.

### Render Layer
- **Responsibility:** Translate world state into visual representation.
- **Input:** `WorldState` (read-only reference).
- **Output:** PixiJS display objects and viewport positioning.
- **Guarantee:** No game logic; only read and draw.

### Interaction Layer
- **Responsibility:** Orchestrate NPC interactions and LLM communication.
- **Input:** Interaction event from world (NPC proximity detected, player initiated `interact`).
- **Output:** Interaction response (dialog, state change, LLM call).
- **Guarantee:** Interaction flows are initiated by world events; no autonomous polling.

### Input Layer
- **Responsibility:** Map keyboard input to game commands.
- **Input:** Keyboard events.
- **Output:** `WorldCommand[]` enqueued into `CommandBuffer`.
- **Guarantee:** Commands are created from input; no world state modification.

### LLM Layer
- **Responsibility:** Provide context and API boundary for LLM calls.
- **Input:** Interaction context (NPC, player state, conversation thread).
- **Output:** LLM response (text, action suggestions, behavior modification).
- **Guarantee:** LLM layer is optional; game continues without it.

## Extension Pattern

When implementing a new feature:
1. **Identify the layer:** Which layer's responsibility does this touch?
2. **Extend the contract:** Add types, commands, or state fields as needed.
3. **Update other layers:** Render layer displays it, input layer accepts commands for it, etc.
4. **Test the boundary:** Verify that layer separation is preserved (no game logic in render, no render in world, etc.).

See the relevant layer guide for detailed extension patterns.
