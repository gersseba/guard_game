# Extend World State

This pattern describes how to expand `WorldState` safely while preserving determinism and JSON serializability.

## Principles

1. Keep world data JSON-serializable (plain objects, arrays, strings, numbers, booleans, null).
2. Keep updates immutable in interaction/world logic.
3. Keep world logic out of render and UI modules.
4. Preserve deterministic outcomes for identical initial state and command/interaction sequences.

## Current State Anchors

Source types:
- `src/world/types.ts`

Validation/deserialization:
- `src/world/level.ts`

Runtime state commit:
- `src/world/world.ts` and runtime composition wiring in `src/runtime/createRuntimeApp.ts`

## State Extension Workflow

### 1. Define or extend type fields
Update type interfaces in `src/world/types.ts` (for example `InteractiveObject` or `WorldState`).

Prefer explicit unions over free-form strings when the allowed values are known.

### 2. Update level JSON schema enforcement (if level-authored)
If fields originate in level JSON, update `validateLevelData()` in `src/world/level.ts`.

Typical checks:
- required/optional fields
- allowed enum literals
- cross-field validity when needed

If fields are runtime-derived (for example from command intent), keep them out of level JSON schema and initialize them deterministically in world state creation/deserialization paths.

### 3. Update deserialization mapping
Map every validated field in `deserializeLevel()` so runtime state exactly reflects level data.

For runtime-derived fields that are not authored in level JSON, initialize deterministic defaults in deserialization (for example `player.facingDirection: 'front'`).

### 4. Update deterministic handlers
If the new field changes interaction behavior, update deterministic handlers (for example in `src/interaction/objectInteraction.ts`) to produce immutable next state.

### 5. Update fixtures and tests
Update tests that construct world fixtures and add focused tests for new behavior.

Recommended coverage:
- world-level validation/deserialization tests (`src/world/level.test.ts`)
- handler-level tests (`src/interaction/*.test.ts`)
- integration tests (`src/integration/*.test.ts`)

## Example: Interactive Object Expansion (Ticket #70)

Added fields on `InteractiveObject`:
- `objectType`
- `idleMessage`
- `usedMessage`
- `firstUseOutcome`
- `spriteAssetPath`

Required follow-up updates:
- type updates in `src/world/types.ts`
- validation + mapping in `src/world/level.ts`
- deterministic use in `src/interaction/objectInteraction.ts`
- fixture updates in tests such as `src/world/state.ts` and `src/world/world.test.ts`

## Example: Character Sprite Metadata (Ticket #86)

Added optional metadata fields:
- `Player.spriteAssetPath?: string`
- `Guard.spriteAssetPath?: string`
- `Npc.spriteAssetPath?: string`
- matching optional fields in `LevelData.player`, `LevelData.guards[*]`, and `LevelData.npcs[*]`

Required follow-up updates:
- type updates in `src/world/types.ts`
- optional string validation in `validateLevelData()` for player/guard/NPC
- passthrough mapping in `deserializeLevel()`
- integration proof via `public/levels/riddle.json` + `src/integration/riddleLevel.test.ts`

Boundary reminder:
- world layer validates serializable shape only
- sprite loading success/failure and fallback rendering remain render-layer responsibilities

## Example: Player Facing Direction (Ticket #92)

Added optional world field:
- `Player.facingDirection?: SpriteDirection`

Why optional:
- preserves backward compatibility with existing serialized snapshots
- render can still default to `front` if the field is absent

Required follow-up updates:
- type update in `src/world/types.ts`
- deterministic default in world initialization (`src/world/state.ts`) and level deserialization (`src/world/level.ts`)
- deterministic command-intent mapping in `src/world/world.ts` (`dx/dy` -> `left/right/away/front`)
- blocked movement still updates facing direction from intent
- render consumption of world-facing token in `src/render/scene.ts`
- regression tests in `src/world/world.test.ts`, `src/world/level.test.ts`, `src/render/scene.test.ts`, and `src/integration/riddleLevel.test.ts`

## Example: Selected Inventory + Item-Use Attempt Event (Ticket #117)

Added world fields:
- `PlayerInventory.selectedItem?: { slotIndex: number; itemId: string } | null`
- `WorldState.lastItemUseAttemptEvent?: ItemUseAttemptResultEvent | null`

Why optional in type:
- preserves compatibility for older serialized snapshots and fixtures while still allowing deterministic initialization in current runtime paths

Required follow-up updates:
- type updates in `src/world/types.ts`
- deterministic default initialization in `src/world/state.ts` and `src/world/level.ts`
- deterministic command handling in `src/world/world.ts` for `selectInventorySlot`
- runtime command-indexed event emission in `src/runtimeController.ts` using an item-use resolver boundary
- immutable event commit wiring in `src/runtime/createRuntimeApp.ts`
- regression tests in `src/world/world.test.ts`, `src/runtimeController.test.ts`, and `src/input/keyboard.test.ts`

## Checklist

- [ ] Type changes are explicit and serializable
- [ ] Validation updated for incoming level JSON (if level-authored)
- [ ] Deserializer maps all new fields or initializes deterministic defaults for runtime-derived fields
- [ ] Deterministic logic updated immutably
- [ ] Fixtures/tests updated across impacted layers
- [ ] Relevant docs updated (`WORLD_LAYER.md`, `RENDER_LAYER.md`, `TYPES_REFERENCE.md`, and pattern docs)
