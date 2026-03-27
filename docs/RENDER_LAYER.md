# Render Layer

The render layer translates `WorldState` into PixiJS visuals. It never mutates gameplay state.

## Responsibilities
- Initialize and own PixiJS app/container setup
- Render grid, boundary band, entity markers, and player marker
- Keep viewport/camera centered around player with clamped world bounds
- Map world entities to deterministic marker visuals by type

Implementation entry point: `src/render/scene.ts`.

## Current Rendering Model

`createPixiRenderPort()` returns a render port with `render(worldState)`.

Per render pass:
1. Ensure canvas size from tile-grid viewport config
2. Update camera offset from player center and world bounds
3. Draw boundary band and grid
4. Build and draw entity circles for NPCs, guards, doors, and interactive objects
5. Draw player marker

## Entity Marker Mapping

`buildEntityCircleSpecs()` maps entities to type keys:
- `npc`
- `guard`
- `door`
- `interactive-object:<interactionType>` for interactive objects

Known type keys use fixed colors; unknown keys fall back to a deterministic hash palette.

## Asset Metadata and Usage

Interactive objects can carry `spriteAssetPath` metadata in world state (for example, `/assets/medieval_supply_crate_inspect.svg`).

Current renderer behavior:
- Uses marker circles only
- Does not yet load or draw `spriteAssetPath`

This is intentional for now and keeps rendering decoupled from interaction logic while preserving forward-compatible asset metadata in level files.

## Tests

- `src/render/scene.test.ts`: color mapping, marker specs, and rendering invariants
- `src/render/runtimeLayout.test.ts`: viewport/layout behavior
