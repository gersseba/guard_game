# Render Layer

The render layer translates `WorldState` into visual state and DOM-only runtime chrome. It never mutates gameplay state.

## Responsibilities
- Initialize and own PixiJS app/container setup
- Render grid, boundary band, character sprites (when available), and marker fallbacks
- Keep viewport/camera centered around player with clamped world bounds
- Map world entities to deterministic visuals by type and optional asset metadata
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
1. Request sprite loads for player, guards, and NPCs with configured `spriteAssetPath`.
2. Resolve character render mode (`sprite` or `marker`) from sprite load status.
3. Ensure canvas size from tile-grid viewport config.
4. Draw boundary band and grid.
5. Draw character sprites that have loaded successfully.
6. Draw marker circles for doors, interactive objects, and any character still in fallback mode.
7. Draw player marker only when the player is in fallback mode.
8. Update camera offset from player center and world bounds.

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

Character and object entities can carry `spriteAssetPath` metadata in world state (for example, `/assets/medieval_player_town_guard.svg` or `/assets/medieval_supply_crate_inspect.svg`).

Current character contract:
- `player.spriteAssetPath?: string`
- `guard.spriteAssetPath?: string`
- `npc.spriteAssetPath?: string`

Current renderer behavior:
- Attempts to load configured character sprite assets via Pixi asset loading.
- Renders characters as sprites only when the asset has loaded.
- Falls back to deterministic marker circles when path metadata is missing, loading is in progress, or loading failed.
- Keeps door and interactive-object rendering marker-based.

Render-layer boundary:
- Sprite load status (`loading` | `loaded` | `failed`) and Pixi `Sprite` instances are transient render state only.
- No sprite loading status is written back into `WorldState`.

This preserves render-only ownership of visual decisions while keeping gameplay logic and world determinism unchanged.

## Shipped Starter Level Demonstration

The shipped starter level now demonstrates configured character sprite paths for all character kinds:
- Player: `/assets/medieval_player_town_guard.svg`
- Guards: `/assets/medieval_guard_spear.svg`
- NPC: `/assets/medieval_npc_villager.svg`

Source and verification:
- Level data: [public/levels/starter.json](../public/levels/starter.json)
- Integration assertions: [src/integration/starterLevel.test.ts](../src/integration/starterLevel.test.ts)
- Render mode/fallback assertions: [src/render/scene.test.ts](../src/render/scene.test.ts)

## Tests

- `src/render/scene.test.ts`: color mapping, marker specs, and rendering invariants
- `src/render/runtimeLayout.test.ts`: viewport/layout behavior
- `src/render/viewportOverlay.test.ts`: overlay visibility, `inert` toggling, focus blocking, and pointer blocking
- `src/render/chatModal.test.ts`: close button and Escape exit behavior, modal visibility, and focus cleanup
