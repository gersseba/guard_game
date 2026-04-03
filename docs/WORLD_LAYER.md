# World Layer

The world layer owns deterministic, JSON-serializable state and validation/deserialization of level files.

## Responsibilities
- Define and maintain `WorldState` as the source of truth
- Validate flat level JSON payloads (`LevelData`)
- Deserialize level data into runtime world state
- Preserve determinism for interaction and movement outcomes
- Derive player-facing direction from movement intent as deterministic world data
- Keep world state independent from rendering and LLM infrastructure

## Current Deterministic State Model

`WorldState` in `src/world/types.ts` includes:
- `tick`
- `grid`
- `levelMetadata`
- `levelObjective`
- `player`
- `npcs`
- `guards`
- `doors`
- `interactiveObjects`
- `actorConversationHistoryByActorId`
- `lastItemUseAttemptEvent`
- `levelOutcome`

All fields are serializable primitives, arrays, or plain objects.

`actorConversationHistoryByActorId` stores chat history keyed by actor id. It remains JSON-serializable and actor-neutral even though the current conversational actors are guards and NPCs.

### Player Facing Direction State

`player.facingDirection` is a serializable directional token (`front | away | left | right`) owned by the world layer.

Deterministic rules:
- New runtime state initializes `player.facingDirection` to `front` (`createInitialWorldState()` in `src/world/state.ts`)
- Level deserialization initializes loaded player state to `front` (`deserializeLevel()` in `src/world/level.ts`)
- Move commands map input intent to facing direction in world update logic (`src/world/world.ts`)
- Facing direction updates even when movement is blocked, so intent is still represented in world state

Render consumes this token but does not author it.

### Player Inventory State

`player.inventory` is world-owned deterministic state with shape:
- `items: Array<{ itemId, displayName, sourceObjectId, pickedUpAtTick }>`
- `selectedItem: { slotIndex, itemId } | null` (optional in type for compatibility, initialized to `null` in current runtime)

Deterministic rules:
- New runtime state initializes `player.inventory.items` to `[]`.
- Level deserialization also initializes `player.inventory.items` to `[]`.
- New runtime state initializes `player.inventory.selectedItem` to `null`.
- Level deserialization also initializes `player.inventory.selectedItem` to `null`.
- `selectInventorySlot` chooses an item by index from current inventory, or clears selection when the index is invalid.
- Inventory entries are only appended by deterministic interaction logic in the interaction layer.

### Item-Use Attempt Event State

`lastItemUseAttemptEvent` is a serializable world field that stores the latest deterministic selected-item use attempt result.

Deterministic rules:
- New runtime state initializes `lastItemUseAttemptEvent` to `null`.
- Level deserialization also initializes `lastItemUseAttemptEvent` to `null`.
- Runtime emits one event per `useSelectedItem` command using command index ordering within the tick.
- Main-loop wiring commits each emitted event immutably, so the last one in a tick becomes the stored event.

## Level JSON Validation

`validateLevelData()` in `src/world/level.ts` validates:
- Required level metadata (`version`, `name`, `goal`, dimensions)
- Optional level objective override (`objective`)
- `player`, `guards`, and `doors`
- Optional `npcs` - array of level-defined NPCs with required `id`, `displayName`, `x`, `y`, and `npcType` fields
- Optional `interactiveObjects`

Sprite metadata contracts:
- `spriteAssetPath?: string` remains optional for player, guards, doors, npcs, and interactive objects.
- `spriteSet?: SpriteSet` is now optional for player, guards, doors, npcs, and interactive objects.

Guard instance fields:
- optional `instanceKnowledge?: string` and `instanceBehavior?: string` — validated as strings when provided; passed through to runtime `Guard` objects

When `spriteSet` is present, validation enforces:
- it must be an object
- only known keys are read (`default`, `front`, `away`, `left`, `right`)
- each provided key must be a string path
- at least one sprite path must be present

Path format correctness and asset loadability are intentionally handled by render fallback behavior, not world-level rejection.

For `npcs`, validation enforces:
- required identity/position fields (`id`, `displayName`, `x`, `y`)
- required `npcType: string` - categorizes the NPC's role (for example, `'archive_keeper'`, `'scholar'`)
- optional `instanceKnowledge?: string` and `instanceBehavior?: string` — validated as strings when provided; passed through to runtime `Npc` objects

For `interactiveObjects`, validation enforces:
- required identity/position fields
- `objectType` currently restricted to `supply-crate`
- `interactionType` in `inspect | use | talk`
- `state` in `idle | used`
- optional `pickupItem` with non-empty string `itemId` and `displayName`
- optional `firstUseOutcome` in `win | lose`

## Deserialization

`deserializeLevel()` in `src/world/level.ts` maps level JSON into runtime entities and applies `validateSpatialLayout()` before returning state.

Deserialization now passes through both optional sprite forms:
- `spriteAssetPath`
- `spriteSet`

It also initializes player-facing state for loaded levels:
- `player.facingDirection: 'front'`

Objective mapping is deterministic:
- `levelObjective` is set to `levelData.objective ?? levelData.goal`

The world layer does not resolve directional variants. It preserves serializable metadata and deterministic orientation tokens only; render chooses final visual assets.

### NPC Deserialization
NPCs from level JSON are transformed to runtime `Npc` objects with deterministically derived `dialogueContextKey`:

```typescript
// Input from level JSON
{
  id: 'npc-1',
  displayName: 'Archivist',
  x: 8,
  y: 5,
  npcType: 'archive_keeper',
  spriteAssetPath: '/assets/medieval_npc_villager.svg'
}

// Output at runtime
{
  id: 'npc-1',
  displayName: 'Archivist',
  position: { x: 8, y: 5 },
  npcType: 'archive_keeper',
  dialogueContextKey: 'npc_archive_keeper',
  spriteAssetPath: '/assets/medieval_npc_villager.svg',
  // instanceKnowledge and instanceBehavior are included when present in the level JSON
}
```

Deserialization remains deterministic: the same `npcType` always produces the same `dialogueContextKey`, enabling consistent LLM prompt context routing and reproducible conversation flows.

### Interactive Object Deserialization

Interactive object instance fields deserialize directly:
- `pickupItem`
- `idleMessage`
- `usedMessage`
- `firstUseOutcome`
- `spriteAssetPath`
- `spriteSet`

This enables shared behavior per object type while preserving instance-specific text, outcomes, and asset metadata.

## Shipped Level Demonstrations

Starter level demonstrates single-asset character metadata via `spriteAssetPath`:
- `player.spriteAssetPath: /assets/medieval_player_town_guard.svg`
- `guards[*].spriteAssetPath: /assets/medieval_guard_spear.svg`
- `npcs[*].spriteAssetPath: /assets/medieval_npc_villager.svg`

Riddle level demonstrates directional and default sprite-set wiring:
- player `spriteSet` includes `default/front/away/left/right`
- both guards include `default/front/away/left/right`
- both doors include `spriteSet.default`

References:
- [public/levels/starter.json](../public/levels/starter.json)
- [public/levels/riddle.json](../public/levels/riddle.json)
- [src/integration/starterLevel.test.ts](../src/integration/starterLevel.test.ts)
- [src/integration/riddleLevel.test.ts](../src/integration/riddleLevel.test.ts)

## Interaction State Updates

Conversational interactions write immutable updates into `actorConversationHistoryByActorId`, keyed by the interacting actor id. Object interactions return immutable state updates (for `interactiveObjects` and optional `levelOutcome`) and are then committed through world reset in `src/main.ts`.

Movement commands also update immutable player-facing state in `src/world/world.ts`, coupling orientation to input intent while preserving deterministic world transitions.

## Testing Strategy

- `src/world/level.test.ts`: schema validation + deserialization coverage for `spriteAssetPath` and `spriteSet`, including player default `facingDirection` on load
- `src/world/world.test.ts`: deterministic movement mapping from command intent to `player.facingDirection`, including blocked movement intent
- `src/integration/starterLevel.test.ts`: starter level pipeline and sprite metadata assertions
- `src/integration/riddleLevel.test.ts`: riddle-level sprite-set wiring assertions for player/guards/doors and player default `facingDirection`
- `src/world/spatialRules.test.ts`: occupancy invariants

Determinism rule remains unchanged: identical starting state + identical command/interaction sequence => identical resulting state.
