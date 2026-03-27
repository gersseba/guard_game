# World Layer

The world layer owns deterministic, JSON-serializable state and validation/deserialization of level files.

## Responsibilities
- Define and maintain `WorldState` as the source of truth
- Validate flat level JSON payloads (`LevelData`)
- Deserialize level data into runtime world state
- Preserve determinism for interaction and movement outcomes
- Keep world state independent from rendering and LLM infrastructure

## Current Deterministic State Model

`WorldState` in `src/world/types.ts` includes:
- `tick`
- `grid`
- `player`
- `npcs`
- `guards`
- `doors`
- `interactiveObjects`
- `npcConversationHistoryByNpcId`
- `levelOutcome`

All fields are serializable primitives, arrays, or plain objects.

## Level JSON Validation

`validateLevelData()` in `src/world/level.ts` validates:
- Required level metadata (`version`, `name`, dimensions)
- `player`, `guards`, and `doors`
- Optional `interactiveObjects`

For `interactiveObjects`, validation enforces:
- required identity/position fields
- `objectType` currently restricted to `supply-crate`
- `interactionType` in `inspect | use | talk`
- `state` in `idle | used`
- optional `firstUseOutcome` in `win | lose`

## Deserialization

`deserializeLevel()` in `src/world/level.ts` maps level JSON into runtime entities and applies `validateSpatialLayout()` before returning state.

Interactive object instance fields now deserialize directly:
- `idleMessage`
- `usedMessage`
- `firstUseOutcome`
- `spriteAssetPath`

This enables shared behavior per object type while preserving instance-specific text, outcomes, and asset metadata.

## Interaction State Updates

Object interactions return immutable state updates (for `interactiveObjects` and optional `levelOutcome`) and are then committed through world reset in `src/main.ts`.

## Testing Strategy

- `src/world/level.test.ts`: schema validation + deserialization coverage
- `src/integration/starterLevel.test.ts`: full level pipeline including interactive object behavior
- `src/world/spatialRules.test.ts` and `src/world/world.test.ts`: occupancy and world invariants with interactive objects

Determinism rule remains unchanged: identical starting state + identical command/interaction sequence => identical resulting state.
