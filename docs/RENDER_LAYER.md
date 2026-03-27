# Render Layer

The render layer translates `WorldState` into visual state and DOM-only runtime chrome. It never mutates gameplay state.

## Responsibilities
- Initialize and own PixiJS app/container setup
- Render grid, boundary band, entity markers, and player marker
- Keep viewport/camera centered around player with clamped world bounds
- Map world entities to deterministic marker visuals by type
- Manage DOM-only render utilities for runtime layout, chat UI, viewport pause presentation, and level-outcome presentation

Implementation entry points:
- [src/render/scene.ts](../src/render/scene.ts)
- [src/render/runtimeLayout.ts](../src/render/runtimeLayout.ts)
- [src/render/chatModal.ts](../src/render/chatModal.ts)
- [src/render/viewportOverlay.ts](../src/render/viewportOverlay.ts)
- [src/render/outcomeOverlay.ts](../src/render/outcomeOverlay.ts)

## Current Rendering Model

### Pixi Viewport Scene

`createPixiRenderPort()` returns a render port with `render(worldState)`.

Per render pass:
1. Ensure canvas size from tile-grid viewport config.
2. Update camera offset from player center and world bounds.
3. Draw boundary band and grid.
4. Build and draw entity circles for NPCs, guards, doors, and interactive objects.
5. Draw player marker.

### DOM Render Utilities

The runtime mounts a small set of DOM-only helpers alongside the Pixi canvas:
- `getRuntimeLayoutMarkup()` creates the host structure for viewport, side panels, modal host, and outcome host.
- `createChatModal()` manages the conversation dialog DOM and local focus behavior.
- `createViewportOverlay()` manages the grey paused-world overlay inside `#viewport`.
- `createOutcomeOverlay()` manages win/lose overlay messaging.

These utilities are wired in [src/main.ts](../src/main.ts) and remain presentation-only. They do not hold gameplay state.

## Entity Marker Mapping

`buildEntityCircleSpecs()` maps entities to type keys:
- `npc`
- `guard`
- `door`
- `interactive-object:<interactionType>` for interactive objects

Known type keys use fixed colors; unknown keys fall back to a deterministic hash palette.

## Pause UI Policy

The paused-world presentation is intentionally split from gameplay pause state:
- `runtimeController` owns whether simulation is paused.
- `createViewportOverlay()` owns how the paused viewport is presented in the DOM.

Current behavior:
1. Conversational open results in [src/main.ts](../src/main.ts) call `runtimeController.openConversation(actorId)`, `viewportPauseOverlay.show()`, and `chatModal.open(...)`.
2. `createViewportOverlay(viewportElement)` appends a hidden `.viewport-pause-overlay` child inside `#viewport`.
3. `show()` reveals the overlay and sets the `inert` attribute on the viewport element.
4. `hide()` hides the overlay and removes `inert`.
5. While visible, capture-phase listeners on the viewport block `focusin`, `pointerdown`, `pointerup`, `mousedown`, `mouseup`, and `click`, so paused viewport descendants cannot gain focus and world click handlers do not run.
6. The scope is viewport-only. This utility does not gate global gameplay keyboard commands and does not make the rest of the runtime shell inert.

## Conversation Exit Controls

`createChatModal()` provides the current conversation exit behavior:
- The close button and the document-level Escape listener both route through the same `closePanel()` path.
- `closePanel()` hides the modal, unregisters the Escape listener, invokes `onClose`, and then restores focus to `document.body` if focus was still inside the modal.
- In [src/main.ts](../src/main.ts), `onClose` is wired to `runtimeController.closeConversation()` and `viewportPauseOverlay.hide()`.
- The chat input stops `keydown` and `keyup` propagation so typing does not reach the global movement binding. Enter submission stays local to the modal.

## Asset Metadata and Usage

Interactive objects can carry `spriteAssetPath` metadata in world state (for example, `/assets/medieval_supply_crate_inspect.svg`).

Current renderer behavior:
- Uses marker circles only.
- Does not yet load or draw `spriteAssetPath`.

This is intentional for now and keeps rendering decoupled from interaction logic while preserving forward-compatible asset metadata in level files.

## Tests

- `src/render/scene.test.ts`: color mapping, marker specs, and rendering invariants
- `src/render/runtimeLayout.test.ts`: viewport/layout behavior
- `src/render/viewportOverlay.test.ts`: overlay visibility, `inert` toggling, focus blocking, and pointer blocking
- `src/render/chatModal.test.ts`: close button and Escape exit behavior, modal visibility, and focus cleanup
