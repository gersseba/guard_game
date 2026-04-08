# Render Layer

The render layer translates `WorldState` into visual state and DOM-only runtime chrome. It never mutates gameplay state.

## Responsibilities
- Initialize and own PixiJS app/container setup
- Render grid, boundary band, character sprites (when available), and marker fallbacks
- Keep viewport/camera centered around player with clamped world bounds
- Map world entities to deterministic visuals by type and optional asset metadata
- Consume world-owned player-facing direction when choosing player directional sprites
- Manage DOM-only render utilities for runtime layout, level controls UI, chat UI, viewport pause presentation, and level-outcome presentation

Implementation entry points:
- [src/render/scene.ts](../src/render/scene.ts)
- [src/render/runtimeLayout.ts](../src/render/runtimeLayout.ts)
- [src/render/levelUi.ts](../src/render/levelUi.ts)
- [src/render/chatModal.ts](../src/render/chatModal.ts)
- [src/render/inventoryOverlay.ts](../src/render/inventoryOverlay.ts)
- [src/render/viewportOverlay.ts](../src/render/viewportOverlay.ts)
- [src/render/outcomeOverlay.ts](../src/render/outcomeOverlay.ts)

## Current Rendering Model

### Pixi Viewport Scene

`createPixiRenderPort()` returns a render port with `render(worldState)`.

Per render pass:
1. Resolve character asset paths from `spriteSet`, legacy `spriteAssetPath`, and world-provided player facing direction.
2. Request sprite loads for player, guards, and NPCs using resolved character asset paths.
3. Resolve character render mode (`sprite` or `marker`) from sprite load status.
4. Ensure canvas size from tile-grid viewport config.
5. Draw boundary band and grid.
6. Draw character sprites that have loaded successfully.
7. Draw marker circles for doors, interactive objects, and any character still in fallback mode.
8. Draw player marker only when the player is in fallback mode.
9. Update camera offset from player center and world bounds.

### Directional Sprite Resolution

`scene.ts` resolves directional assets through `resolveSpriteAssetPathForDirection(spriteSet, requestedDirection)` with deterministic fallback order.

For player rendering, the requested direction is read from `worldState.player.facingDirection` and defaults to `front` when missing. Fallback order is:
- `front`
- `default`
- `away`
- `left`
- `right`

If no `spriteSet` key resolves, renderer falls back to legacy `spriteAssetPath`, then to marker circles if loading fails or no path exists.

World owns direction intent; render owns visual resolution and fallback behavior.

This keeps rendering deterministic even with partially configured sprite sets.

### DOM Render Utilities

The runtime mounts a small set of DOM-only helpers alongside the Pixi canvas:
- `getRuntimeLayoutMarkup()` creates the host structure for viewport, side panels, modal host, and outcome host.
- `createLevelUi()` manages level picker controls and the objective text panel in the runtime controls area.
- `createChatModal()` manages the conversation dialog DOM and local focus behavior.
- `createViewportOverlay()` manages the grey paused-world overlay inside `#viewport`.
- `createOutcomeOverlay()` manages win/lose overlay messaging.

These utilities are wired in [src/runtime/createRuntimeApp.ts](../src/runtime/createRuntimeApp.ts) and remain presentation-only. They do not hold gameplay state.

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
1. Conversational open results are routed from [src/runtime/interactionResultBridge.ts](../src/runtime/interactionResultBridge.ts) into [src/runtime/modalCoordinator.ts](../src/runtime/modalCoordinator.ts), which calls `runtimeController.openConversation(actorId)`, `viewportPauseOverlay.show()`, and `chatModal.open(...)`.
2. `createViewportOverlay(viewportElement)` appends a hidden `.viewport-pause-overlay` child inside `#viewport`.
3. `show()` reveals the overlay and sets the `inert` attribute on the viewport element.
4. `hide()` hides the overlay and removes `inert`.
5. While visible, capture-phase listeners on the viewport block `focusin`, `pointerdown`, `pointerup`, `mousedown`, `mouseup`, and `click`, so paused viewport descendants cannot gain focus and world click handlers do not run.
6. The scope is viewport-only. This utility does not gate global gameplay keyboard commands and does not make the rest of the runtime shell inert.

## Inventory Overlay Component

`createInventoryOverlay(hostElement, options)` in [src/render/inventoryOverlay.ts](../src/render/inventoryOverlay.ts) manages the player's inventory display as a pure DOM component without PixiJS rendering.

### Grid Layout
- **Grid dimensions:** 3 columns × 3 rows (9 slots total)
- **Tile size:** 60×60 pixels
- **Container:** Positioned fixed relative to the viewport using inline styles

### Inventory Slot Structure

Each inventory slot renders as a DOM `<div>` with `class="inventory-slot"`:
- Background color indicates slot state (selected/unselected)
- Slot index displayed as text inside the tile (0–8)
- Slot id (itemId) available for tooltip display
- Keyboard navigation via item numbers `1`..`9` (mapped to slots 0–8 by `selectInventorySlot` commands)

### Tooltip System

`positionTooltip(tooltip, x, y, tileId)` dynamically positions item tooltips with viewport awareness:
- **Default position:** Below the hovered tile (x + 10px, y + tileSize + 10px)
- **Viewport clipping detection:**
  - If tooltip would overflow right edge: reposition to left of tile (x - width - 10px)
  - If tooltip would overflow bottom edge: reposition above tile (y - height - 10px)
- **Tooltip styling:** Fixed position, z-index 1001, dark background (#222), white text, max-width 150px
- **Tooltip content:** Displays the item's `tileId` (used for debugging and item identification)

### API

`InventoryOverlay` interface:
```typescript
interface InventoryOverlay {
  open(inventory: PlayerInventory): void;  // Render grid with current items
  close(): void;                            // Hide overlay and cleanup
}
```

**Lifecycle:**
- `open(inventory)` is called when the player triggers inventory display via `isOpen` callback
- Grid renders up to 9 items from `inventory.items`, with focused slot highlighting for selected items
- `close()` cleans up event listeners and hides the overlay
- The overlay remains mounted in the DOM; open/close controls visibility only

### Event Handling

- Keyboard input: `1`..`9` keys trigger `selectInventorySlot` commands (handled by global keyboard binding, not overlay)
- Mouse hover: Shows item tooltip with viewport-aware positioning
- Escape key: Handled by runtime close logic (not owned by overlay)
- Click events: Not currently implemented; inventory is view-only in current design

### Pause Semantics

The inventory overlay does not pause gameplay directly. Pause state is managed externally by runtime logic:
- If a conversational interaction is open (chat modal visible), the inventory remains accessible as a view-only reference
- The overlay visibility is controlled by runtime callbacks, not by modal open state
- Inventory slot selection remains available while any modal is visible

## Conversation Exit Controls

`createChatModal()` provides the current conversation exit behavior:
- The close button and the document-level Escape listener both route through the same `closePanel()` path.
- `closePanel()` hides the modal, unregisters the Escape listener, invokes `onClose`, and then restores focus to `document.body` if focus was still inside the modal.
- In [src/runtime/modalCoordinator.ts](../src/runtime/modalCoordinator.ts), `onClose` is wired to `runtimeController.closeConversation()` and `viewportPauseOverlay.hide()`.
- The chat input stops `keydown` and `keyup` propagation so typing does not reach the global movement binding. Enter submission stays local to the modal.

## Asset Metadata and Usage

Character and object entities can carry sprite metadata in world state:
- `spriteAssetPath` for single-asset usage
- `spriteSet` for optional directional/default usage

Current character contract:
- `player.spriteAssetPath?: string`, `player.spriteSet?: SpriteSet`, `player.facingDirection?: SpriteDirection`
- `guard.spriteAssetPath?: string`, `guard.spriteSet?: SpriteSet`
- `npc.spriteAssetPath?: string`, `npc.spriteSet?: SpriteSet`

Current renderer behavior:
- attempts to load resolved character sprite assets via Pixi asset loading
- resolves player sprite direction from world-facing state, defaulting to `front` when absent
- renders characters as sprites only when the resolved asset has loaded
- falls back to deterministic marker circles when metadata is missing, loading is in progress, or loading failed
- keeps door and interactive-object rendering marker-based

Render-layer boundary:
- sprite load status (`loading` | `loaded` | `failed`) and Pixi `Sprite` instances are transient render state only
- no sprite loading status is written back into `WorldState`

This preserves render-only ownership of visual decisions while keeping gameplay logic and world determinism unchanged.

## Shipped Level Demonstration

The shipped level demonstrates directional `spriteSet` metadata:
- riddle level: directional `spriteSet` on player and guards, default-only `spriteSet` on doors

Source and verification:
- level data: [public/levels/riddle.json](../public/levels/riddle.json)
- integration assertions: [src/integration/riddleLevel.test.ts](../src/integration/riddleLevel.test.ts)
- render fallback assertions: [src/render/scene.test.ts](../src/render/scene.test.ts)

## Tests

- `src/render/scene.test.ts`: color mapping, marker specs, sprite-mode behavior, player directional sprite selection from world-facing state, and deterministic directional fallback order
- `src/render/runtimeLayout.test.ts`: viewport/layout behavior
- `src/render/levelUi.test.ts`: level selector behavior and objective text rendering updates
- `src/render/viewportOverlay.test.ts`: overlay visibility, `inert` toggling, focus blocking, and pointer blocking
- `src/render/chatModal.test.ts`: close button and Escape exit behavior, modal visibility, and focus cleanup
