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

Character entities now support optional sprite metadata in serializable level JSON:
- `player.spriteAssetPath?: string`
- `guard.spriteAssetPath?: string`
- `npc.spriteAssetPath?: string`

Validation follows existing typing-only schema patterns: when present, each `spriteAssetPath` must be a string. Path format correctness and loadability are intentionally handled by render fallback behavior, not world-level rejection.

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
  dialogueContextKey: 'npc_archive_keeper', // deterministic derivation: npc_${npcType.toLowerCase()}
  spriteAssetPath: '/assets/medieval_npc_villager.svg' // optional passthrough metadata
}
```

Deserialization remains deterministic: the same `npcType` always produces the same `dialogueContextKey`, enabling consistent LLM prompt context routing and reproducible conversation flows.

### Interactive Object Deserialization

Interactive object instance fields now deserialize directly:
- `idleMessage`
- `usedMessage`
- `firstUseOutcome`
- `spriteAssetPath`

This enables shared behavior per object type while preserving instance-specific text, outcomes, and asset metadata.

## Shipped Starter Level Demonstration

The shipped starter level demonstrates the optional character sprite metadata flowing through world validation and deserialization:
- `player.spriteAssetPath: /assets/medieval_player_town_guard.svg`
- `guards[*].spriteAssetPath: /assets/medieval_guard_spear.svg`
- `npcs[*].spriteAssetPath: /assets/medieval_npc_villager.svg`

References:
- Level JSON: [public/levels/starter.json](../public/levels/starter.json)
- Integration proof: [src/integration/starterLevel.test.ts](../src/integration/starterLevel.test.ts)

## Interaction State Updates

Conversational interactions write immutable updates into `actorConversationHistoryByActorId`, keyed by the interacting actor id. Object interactions return immutable state updates (for `interactiveObjects` and optional `levelOutcome`) and are then committed through world reset in `src/main.ts`.

## Testing Strategy

- `src/world/level.test.ts`: schema validation + deserialization coverage
- `src/integration/starterLevel.test.ts`: full level pipeline including sprite metadata assertions
- `src/world/spatialRules.test.ts` and `src/world/world.test.ts`: occupancy and world invariants with interactive objects

Determinism rule remains unchanged: identical starting state + identical command/interaction sequence => identical resulting state.
