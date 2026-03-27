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
- `actorConversationHistoryByActorId`
- `levelOutcome`

All fields are serializable primitives, arrays, or plain objects.

`actorConversationHistoryByActorId` stores chat history keyed by actor id. It remains JSON-serializable and actor-neutral even though the current conversational actors are guards and NPCs.

## Level JSON Validation

`validateLevelData()` in `src/world/level.ts` validates:
- Required level metadata (`version`, `name`, dimensions)
- `player`, `guards`, and `doors`
- Optional `npcs` - array of level-defined NPCs with required `id`, `displayName`, `x`, `y`, and `npcType` fields
- Optional `interactiveObjects`

Sprite metadata contracts:
- `spriteAssetPath?: string` remains optional for player, guards, doors, npcs, and interactive objects.
- `spriteSet?: SpriteSet` is now optional for player, guards, doors, npcs, and interactive objects.

When `spriteSet` is present, validation enforces:
- it must be an object
- only known keys are read (`default`, `front`, `away`, `left`, `right`)
- each provided key must be a string path
- at least one sprite path must be present

Path format correctness and asset loadability are intentionally handled by render fallback behavior, not world-level rejection.

For `npcs`, validation enforces:
- required identity/position fields (`id`, `displayName`, `x`, `y`)
- required `npcType: string` - categorizes the NPC's role (for example, `'archive_keeper'`, `'scholar'`)

For `interactiveObjects`, validation enforces:
- required identity/position fields
- `objectType` currently restricted to `supply-crate`
- `interactionType` in `inspect | use | talk`
- `state` in `idle | used`
- optional `firstUseOutcome` in `win | lose`

## Deserialization

`deserializeLevel()` in `src/world/level.ts` maps level JSON into runtime entities and applies `validateSpatialLayout()` before returning state.

Deserialization now passes through both optional sprite forms:
- `spriteAssetPath`
- `spriteSet`

The world layer does not resolve directional variants. It preserves serializable metadata only; render chooses final visual assets.

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
  spriteAssetPath: '/assets/medieval_npc_villager.svg'
}
```

Deserialization remains deterministic: the same `npcType` always produces the same `dialogueContextKey`, enabling consistent LLM prompt context routing and reproducible conversation flows.

### Interactive Object Deserialization

Interactive object instance fields deserialize directly:
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

## Testing Strategy

- `src/world/level.test.ts`: schema validation + deserialization coverage for `spriteAssetPath` and `spriteSet`
- `src/integration/starterLevel.test.ts`: starter level pipeline and sprite metadata assertions
- `src/integration/riddleLevel.test.ts`: riddle-level sprite-set wiring assertions for player/guards/doors
- `src/world/spatialRules.test.ts` and `src/world/world.test.ts`: occupancy and world invariants with interactive objects

Determinism rule remains unchanged: identical starting state + identical command/interaction sequence => identical resulting state.
