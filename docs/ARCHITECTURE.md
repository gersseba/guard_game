# Guard Game System Architecture

## Overview

Guard Game enforces strict layer separation to support deterministic world updates and LLM-driven gameplay:

```
/src
  /world               - Deterministic world model (state, command application, ticks)
/world/entities      - Domain class foundation and DTO-to-runtime seam mappings
  /render              - PixiJS rendering port plus DOM overlays for viewport pause, chat, and outcomes
  /interaction         - Interaction dispatch + result routing across target kinds
  /input               - Input command buffering and keyboard mapping
  /llm                 - LLM client boundary and context generation stubs
  runtimeController.ts - Runtime orchestration: simulation pause/resume and conversation gating
  main.ts              - Runtime bootstrap and frame/tick loop
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
- Interaction layer orchestrates dispatch and result handling; it does not directly call render code.
- LLM layer provides client access and context only; it is invoked only through interaction handlers.
- Character sprite fallback decisions belong to render code; world code only stores optional `spriteAssetPath` metadata.

**Implication:** Any feature can be tested by manipulating world state; rendering changes never require testing game logic.

### Descriptive Naming
Types and interfaces use clear, semantic names. This supports LLM prompt generation and makes code self-documenting.

**Examples:**
- `WorldCommand` (not just `Command`)
- `InteractionHandlerResult` and `ResultDispatcher` (not ad-hoc branches in runtime)
- `ActorConversationThread` (for shared actor-scoped conversation context, not `Dialog`)

## Data Flow

### Frame Loop
1. **Input Phase:** Keyboard input is captured and mapped to `WorldCommand` values, enqueued into `CommandBuffer`.
   - If a modal is open (`isModalOpen()` returns true), gameplay commands are suppressed before enqueueing.
   - Inventory slot selection commands (`1`..`9`) remain available while modals are open for future modal routing.

2. **Tick Phase** (fixed 100ms): `runtimeController.stepSimulation()` is called. It drains the command buffer, gates commands based on current pause state and level outcome, then applies the resolved command set to world state via `world.applyCommands(commands)`. This same step also captures every `useSelectedItem` command index from the drained tick list and, after command application, routes those use attempts through the deterministic item-use resolver boundary. If the runtime is paused (a guard or NPC conversation is open), buffered commands are discarded and no world update, item-use resolution, or interaction dispatch occurs for that tick.

3. **Deterministic Use-Attempt Routing:** When `useSelectedItem` commands are present, `RuntimeController` calls the injected item-use resolver with the post-command `WorldState` and each original command index. `main.ts` commits the latest emitted `ItemUseAttemptResultEvent` back into serialized world state through `world.resetToState(...)`. When a door is unlocked (event.doorUnlockedId is present), the corresponding door's `isUnlocked` flag is set to true, allowing future movement through that door via spatial rules checks.

4. **Interaction Dispatch:** If an `interact` command was issued and the runtime is not paused, `runInteractionIfRequested()` resolves one adjacent target and calls `interactionDispatcher.dispatch(...)`.
   - **Action Modal Routing:** If target is action-modal-eligible (guard/npc), dispatcher returns conversational result. Result dispatcher routes to either action modal open (if available) or directly to chat modal (backward compatible).
   - **Deterministic Routing:** If target is non-modal (door/object), dispatcher resolves interaction locally and returns deterministic result. Result dispatcher commits world state mutations without opening modals.

5. **Result Routing:** Returned `InteractionHandlerResult` (sync or async) is routed through `resultDispatcher.dispatch(...)` into main-loop side effects.
   - Conversational results (guard/npc, `isConversational: false` or `true`) call `runtimeController.openConversation(actorId)`, `viewportPauseOverlay.show()`, and `chatModal.open(...)`.
   - Deterministic results (door/object) stay local to world-state reset and level-outcome callbacks.
   - Door and object interactions do not open modals and do not pause gameplay.

6. **Render Phase:** Every animation frame renders the latest world state through the PixiJS render port. Character sprite assets are loaded and resolved to sprite/marker mode inside the render layer only. Separate DOM render utilities manage the chat modal, inventory overlay, paused-viewport overlay, and level-outcome overlay.

7. **Debug Phase:** Current JSON world state is serialized and printed to the debug panel.

```
[Keyboard Input]
       |
[Command Buffer]
       |
[RuntimeController.stepSimulation()] <- gates on pause state & level outcome
       |
[World.applyCommands()] <- deterministic state update
       |
[Interaction Dispatcher] <- target-kind handler registry
       |
[Result Dispatcher] <- result-kind side-effect registry
       |
[Render Layer] <- Pixi scene + DOM overlays
       |
[Debug Panel] <- serializes and displays JSON state
```

> **Pause state is external to `WorldState`.** `RuntimeController` owns the gameplay pause flag and the active `RuntimeConversationSession`. The render layer separately owns transient DOM pause presentation (`.viewport-pause-overlay`, chat modal visibility, inventory overlay visibility, focus cleanup). None of that state is serialized or included in LLM context and replay.

### Modal Lifecycle and Pause Semantics

**Conversation Pause Flow:**
1. Player presses `e` (interact) adjacent to a guard or NPC.
2. `interactionDispatcher.dispatch(target)` returns conversational result (initial open, `isConversational: false`).
3. `resultDispatcher.dispatch(result)` calls `runtimeController.openConversation(actorId)`, which:
   - Sets `paused = true` in runtime controller
   - Next `stepSimulation()` tick will drain buffered commands without processing
4. Main loop calls `viewportPauseOverlay.show()` → adds `.viewport-pause-overlay` div, sets `inert` on viewport, blocks pointer/focus
5. Chat modal opens: `chatModal.open(actorId, displayName, history)` → renders conversation interface in DOM
6. **While paused:**
   - Gameplay ticks don't advance (`stepSimulation()` drains but doesn't apply commands)
   - Input layer suppresses movement/interact commands via `isModalOpen()` callback
   - Inventory slot selection (`1`..`9`) remains available for future action modal routing
   - Player types in chat modal; Enter submits message to LLM via dispatcher
7. Player clicks Close or presses Escape in chat modal → `onClose()` callback
8. `runtimeController.closeConversation()` sets `paused = false`
9. Next `stepSimulation()` tick resumes world updates from queued commands
10. `viewportPauseOverlay.hide()` → removes overlay, clears `inert` attribute
11. **Gameplay resumes** with normal tick progression

**Deterministic Interaction (No Pause):**
1. Player presses `e` (interact) adjacent to a door or object.
2. `interactionDispatcher.dispatch(target)` returns deterministic result (no conversational open).
3. `resultDispatcher.dispatch(result)` commits world-state mutations (e.g., door open, object marked used, level outcome set).
4. `runtimeController` remains unpaused; world continues updating normally.
5. No modal opens; gameplay continues seamlessly.

**Inventory Overlay (View-Only During Conversations):**
- Inventory overlay is a separate HTML/CSS component; not tied directly to modal lifecycle
- When chat modal is open, inventory remains accessible as a view-only reference side-panel (if implemented)
- Slot selection commands remain available to support future action modal routing (inventory slot selection while conversing)
- Inventory overlay does not pause gameplay on its own; only chat modal triggers pause

## Layer Contracts

### World Layer
- **Responsibility:** Maintain deterministic game state and apply commands.
- **Input:** `WorldCommand[]` from the input buffer.
- **Output:** Updated `WorldState`.
- **Guarantee:** Same commands always produce same state. Runtime domain classes under `src/world/entities` are construction/mapping helpers only and do not change deterministic command semantics.

### Render Layer
- **Responsibility:** Translate world state into visual representation.
- **Input:** `WorldState` (read-only reference) plus runtime UI callbacks.
- **Output:** PixiJS display objects, DOM overlay state, and viewport positioning.
- **Guarantee:** No game logic; only read and draw. Sprite load status maps and Pixi sprite instances are transient render concerns and are never written into `WorldState`.

### Interaction Layer
Responsibilities:
- Route adjacent targets by kind using handler registries
- Preserve behavior parity between sync chat-open flow and async player-message flow
- Provide deterministic item-use resolver boundaries for runtime-orchestrated selected-item use commands
- Convert handler results into side-effect callbacks through result handlers

Input:
Resolved adjacent target + current `WorldState` (+ optional player message for conversational turns).

Output:
`InteractionHandlerResult` (or `Promise<InteractionHandlerResult>`).

Guarantees:
- Initial conversational open (`guard`/`npc` without player message) remains synchronous
- Conversational player-message turns remain asynchronous
- Selected-item use resolution remains synchronous, deterministic, and LLM-free
- Door/object deterministic interactions remain synchronous and local

### Input Layer
- **Responsibility:** Map keyboard input to game commands.
- **Input:** Keyboard events.
- **Output:** `WorldCommand[]` enqueued into `CommandBuffer`.
- **Guarantee:** Commands are created from input; no world state modification. When the chat modal is open, gameplay commands are suppressed before enqueueing.

### LLM Layer
- **Responsibility:** Provide context and API boundary for LLM calls.
- **Input:** Interaction context (target actor, player state, conversation thread).
- **Output:** LLM response text and conversation updates.
- **Guarantee:** LLM calls occur only for conversational player-message turns.

## Extension Pattern

When implementing a new feature:
1. **Identify the layer:** Which layer's responsibility does this touch?
2. **Extend the contract:** Add types, handlers, or state fields as needed.
3. **Update routing:** Register interaction and result handlers instead of adding ad-hoc branches in `main.ts`.
4. **Test the boundary:** Verify layer separation and sync/async behavior parity.

See the relevant layer guide for detailed extension patterns.