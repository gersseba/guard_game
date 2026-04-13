# World Layer

The world layer owns deterministic, JSON-serializable state and validation/deserialization of level packages (layout text + level JSON).

## Responsibilities
- Define and maintain `WorldState` as the source of truth
- Validate level JSON payloads (`LevelData`) against parsed layout bounds
- Deserialize level package data into runtime world state
- Preserve determinism for interaction and movement outcomes
- Derive player-facing direction from movement intent as deterministic world data
- Keep world state independent from rendering and LLM infrastructure

## Intent Pipeline

The **Intent Pipeline** provides a unified, source-agnostic mechanism for all actors (player, NPC, scripted) to request state changes.

### Intent Model

`Intent` in `src/world/types/command.ts` (exported from `src/world/types.ts`) has the structure:
```typescript
interface Intent {
  actorId: string;
  type: IntentType;  // 'move' | 'wait' | 'interact'
  payload?: {
    direction?: 'up' | 'down' | 'left' | 'right';
    targetId?: string;
    delta?: { dx: number; dy: number };  // backward compatibility for arbitrary movement
  };
}
```

### Intent Resolution

`resolveIntent()` in `src/world/intentResolver.ts` is the deterministic handler that processes intents:

1. **Move Intent** — calls `resolveMoveIntent()`
   - Accepts movement via cardinal direction or arbitrary delta vector
   - Applies collision checking using `canMovePlayerTo()` from spatial rules
   - Returns updated `WorldState` with player position (if valid) and updated facing direction
   - Even when movement is blocked, facing direction updates to represent player intent

2. **Wait Intent** — no-op; returns state unchanged
   - Used by NPCs for scheduled delays or explicit pause points

3. **Interact Intent** — currently a no-op (interaction logic remains in `interaction/ layer`)
   - Routed through separate `interactionDispatcher` path
   - Exists here for future unified interaction pipeline

### Command-to-Intent Bridge

Legacy `WorldCommand` objects (`move`, `selectInventorySlot`, `useSelectedItem`, `interact`) flow through the world layer via `applyCommands()` and `applyCommand()`. Move commands are converted to Intent format and resolved through `resolveIntent()`, preserving all existing tests and behavior while routing new actor actions through the unified pipeline.

**Future Work:** As the system evolves, direct Intent-based input (from LLM, NPC schedulers, etc.) will bypass the WorldCommand bridge entirely.

## Current Deterministic State Model

`WorldState` in `src/world/types/world-state.ts` (exported from `src/world/types.ts`) includes:
- `tick`
- `grid`
- `levelMetadata`
- `levelObjective`
- `player`
- `npcs`
- `guards`
- `doors`
- `interactiveObjects`
- `environments`
- `questState`
- `knowledgeState`
- `actorConversationHistoryByActorId`
- `lastItemUseAttemptEvent`
- `levelOutcome`

All fields remain JSON-serializable; some collections are now backed by runtime class instances with enumerable data fields.

## Domain Class Foundation

The world layer now includes a domain-class foundation in `src/world/entities/`:
- base classes: `Entity`, `Actor`
- specialized classes: `Npc`, `GuardNpc`, `Item`, `Environment`, `WorldObject`
- seam adapters: `dtoRuntimeSeams.ts` (`mapEntityDtoToRuntime`, `mapNpcDtoToRuntime`, `mapGuardDtoToRuntime`, `mapInteractiveObjectDtoToRuntime`, `mapLevelInteractiveObjectDtoToRuntime`, `mapEnvironmentDtoToRuntime`, `mapInventoryItemDtoToRuntime`)

These classes establish a typed DTO-to-runtime boundary for future incremental migration away from direct object-literal construction.

### DTO vs Runtime Class Boundary

- **DTO boundary:** `LevelData` and nested `Level*Dto` shapes in `src/world/types/level.ts` (exported from `src/world/types.ts`) define file/network JSON contracts.
- **Runtime boundary:** `src/world/entities/*` classes provide constructor guarantees, polymorphic behavior hooks, and explicit conversion helpers.
- **Seam boundary:** `src/world/entities/dtoRuntimeSeams.ts` is the only place that should map DTO shapes into runtime classes.

Boundary invariants:
- Validation (`validateLevelData`) remains DTO-only.
- Deserialization (`deserializeLevel`) performs DTO-to-runtime mapping, then spatial validation.
- Runtime class instances must remain enumerable/serializable so `JSON.stringify(worldState)` stays stable.

Determinism/serialization contract remains unchanged:
- `WorldState` remains JSON-serializable data
- command application and interaction outcomes remain code-owned and deterministic
- NPCs, guards, interactive objects, environments, and loaded NPC inventory items are instantiated through explicit DTO-to-runtime seam mappers in deserialization

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
- `src/runtime/runtimeController.ts` emits one event per `useSelectedItem` command using command index ordering within the tick.
- The callback wiring in `src/runtime/createRuntimeApp.ts` commits each emitted event immutably, so the last one in a tick becomes the stored event.

### Quest State

`questState` is a serializable world field storing deterministic quest-chain definitions and progression state.

Deterministic rules:
- New runtime state initializes `questState` to an empty schema (`version: 1`, no chains, empty progress map).
- Level deserialization initializes `questState` from optional `levelData.questChains` with safe defaults when omitted.
- Quest progression is advanced only from validated item-use events emitted by the deterministic item-use resolver (`ItemUseAttemptResultEvent`) and never from LLM response text.
- Quest transitions are pure world-layer reducer logic (`src/world/questState.ts`), so identical event sequences produce identical progression state.

### Knowledge Token State

`knowledgeState` is a serializable world field storing deterministic, persistent knowledge-token grants and validation readiness.

Deterministic rules:
- New runtime state initializes `knowledgeState` to an empty schema (`version: 1`, empty token map).
- Level deserialization initializes `knowledgeState` with the same empty default, so levels without token content remain backward-compatible.
- Token requirement checks are deterministic and non-consuming (persistent policy): validating required tokens never removes granted tokens.
- Token grant and requirement evaluation are handled by pure world-layer reducers in `src/world/knowledgeState.ts`.
- Token application is keyed only by structured outcome fields (`requireKnowledgeTokens`, `grantKnowledgeTokens`) and never by free-form LLM response text.

### NPC Trade State

`npc.tradeRules` and `npc.tradeState` are serializable world-owned fields that define deterministic item-required reward exchanges and one-time completion tracking.

Deterministic rules:
- Levels may omit `tradeRules` entirely; NPC loading remains backward-compatible.
- Trade requirements are evaluated from player inventory by pure world logic in `src/world/npcTrade.ts`.
- Successful trades consume the configured required items and grant configured reward items exactly once per `ruleId`.
- Repeated interactions from an already-completed resulting world state cannot duplicate rewards because `tradeState.completedRuleIds` blocks replay.
- NPC trade success or failure is never inferred from free-form LLM wording.

### Door Unlock State

`door.isUnlocked` is a serializable boolean flag that tracks whether a door has been unlocked via item-use interaction.

Deterministic rules:
- New runtime state initializes all doors with `isUnlocked: false` (default, omitted if false).
- Level deserialization also initializes all doors with `isUnlocked: false` unless explicitly set in the level JSON.
- Item-use resolver emits `doorUnlockedId` when deterministic key requirements are satisfied: legacy `requiredItemId` match, or multi-key `requiredItemIds` full-set possession with selected required key.
- The item-use callback wiring in `src/runtime/createRuntimeApp.ts` commits unlock mutations: when `event.doorUnlockedId` is present, the corresponding door is mutated to set `isUnlocked: true`.
- Once `isUnlocked` is true, the door allows traversal: `canMovePlayerTo()` in [src/world/spatialRules.ts](../src/world/spatialRules.ts#L38) skips blocked-door checks for unlocked doors.
- Unlock state persists through JSON serialization and level state save/restore, enabling preserved progress across play sessions.

## Level JSON Validation

`validateLevelData()` in `src/world/level.ts` is the public façade. It delegates to domain-specific validators in `src/world/levelValidation/`:

| Module | Responsibility |
|---|---|
| `validateHeader.ts` | `version`, `layoutPath`, `name`, `premise`, `goal` |
| `validatePlayer.ts` | player `x`/`y`, optional `spriteAssetPath` and `spriteSet` |
| `validateGuards.ts` | guards array: identity, position, guardState, traits, sprites, instance fields, itemUseRules |
| `validateDoors.ts` | doors array: identity, position, doorState, outcome, requiredItemId/requiredItemIds schema, sprites |
| `validateNpcs.ts` | npcs array: identity, position, npcType, patrol path bounds, triggers, inventory, tradeRules, riddleClue |
| `validateObjects.ts` | interactiveObjects array: identity, position, objectType, interactionType, state, pickupItem, sprites, capabilities, itemUseRules |
| `validateEnvironments.ts` | environments array: identity, position, isBlocking |
| `validateQuestChains.ts` | optional questChains array: chain identity, stage identity, and deterministic item-use event criteria |
| `shared.ts` | shared helper functions used across domain validators |

`src/world/levelValidation/shared.ts` contains reusable cross-domain helpers:
- `validateSpriteSet()` — enforces valid spriteSet object with at least one path
- `validateItemUseRules()` — enforces allowed:boolean + responseText:string per rule
- `validateObjectCapabilities()` — enforces known boolean capability flags
- `validateGridPositionInBounds()` — enforces numeric x/y within grid dimensions
- `validateTriggerEffect()` — enforces setFact + typed value
- `validateNpcTriggers()` — enforces known trigger keys and delegates to validateTriggerEffect
- `validateInventoryItems()` — enforces inventory item shape
- `validateNpcTradeRules()` — enforces deterministic NPC trade rule schema

Validation boundary rule:
- validation remains DTO-only and does not instantiate runtime classes
- layout geometry validation (`#` / `.` parsing, rectangular checks, and dimensions) is handled by `src/world/layout.ts`

To add validation for a new domain field: add it to the matching `src/world/levelValidation/` module. Add a new module for entirely new domains. Add shared utilities to `shared.ts` when they are used by two or more domain validators.

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
- `objectType` as a string domain token
- `interactionType` in `inspect | use | talk`
- `state` in `idle | used`
- optional `pickupItem` with non-empty string `itemId` and `displayName`
- optional `firstUseOutcome` in `win | lose`

For `environments`, validation enforces:
- required identity/position fields
- required `isBlocking: boolean`

## Deserialization

`deserializeLevel()` in `src/world/level.ts` is the public façade. It delegates to domain-specific mapping helpers in `src/world/levelMapping/` and seam adapters in `src/world/entities/dtoRuntimeSeams.ts`:

| Module | Responsibility |
|---|---|
| `levelMapping/mapPlayer.ts` | maps `LevelPlayerDto` to runtime `Player` |
| `levelMapping/mapDoor.ts` | maps `LevelDoorDto` to runtime `Door` |
| `levelMapping/mapNpcWithRiddleClue.ts` | maps `LevelNpcDto` to runtime `Npc` with resolved `mustStateDoorAs` |
| `entities/dtoRuntimeSeams.ts` | maps guards, npcs, interactiveObjects, environments to runtime class instances |

To add mapping for a new domain entity: add a mapping helper in `src/world/levelMapping/`, call it from `deserializeLevel()`, and add regression tests covering the new entity's shape.

Deserialization boundary rule:
- validated DTOs are mapped into runtime class instances via seam helpers
- JSON ingress/egress boundaries remain DTO-shaped; class instances are not required at file I/O boundaries

Layout composition rule:
- `WorldState.grid.width` and `WorldState.grid.height` are derived from parsed layout dimensions only
- blocking `#` cells are converted into deterministic blocking environment entries during deserialization

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

### Guard Deserialization

Guards from level JSON are transformed through `mapGuardDtoToRuntime` into runtime `GuardNpc` instances.

The guard serialization contract remains stable for world state snapshots:
- serialized shape still matches the existing `Guard` DTO fields (`id`, `displayName`, `position`, `guardState`, optional traits/sprite/instance fields, optional `itemUseRules`)
- runtime-only NPC base fields used for inheritance (`npcType`, `dialogueContextKey`) are intentionally non-enumerable on `GuardNpc`, so JSON output parity is preserved

This keeps interaction behavior and world-state JSON compatibility unchanged while introducing explicit runtime class specialization for guards.

### Interactive Object Deserialization

Interactive object DTOs are mapped through runtime `WorldObject` subclasses (`ContainerObject`, `MechanismObject`, `DoorObject`, `InertObject`) while preserving instance fields:
- `pickupItem`
- `idleMessage`
- `usedMessage`
- `firstUseOutcome`
- `spriteAssetPath`
- `spriteSet`

Environment fields deserialize directly:
- `id`
- `displayName`
- `position` (mapped from level `x`/`y`)
- `isBlocking`

This enables shared behavior per object type while preserving instance-specific text, outcomes, and asset metadata.

## Subclass Extension Guidelines

When adding a new world subclass, keep changes localized and deterministic:

1. Add/extend DTO shape in `src/world/types/` domain modules (see [TYPES_REFERENCE.md](TYPES_REFERENCE.md) for module organization) only if new serializable data is required. Types are re-exported from `src/world/types.ts` for import stability.
2. Implement runtime subclass under `src/world/entities/npcs` or `src/world/entities/objects`.
3. Wire DTO-to-runtime mapping in `src/world/entities/dtoRuntimeSeams.ts`.
4. Keep deterministic behavior in world/interaction layers; render only consumes resulting state.
5. Add/adjust tests for seam mapping, serialized runtime shape parity, and deterministic behavior.

NPC-specific checklist:
- Ensure `npcType` mapping remains deterministic.
- Keep `dialogueContextKey` derivation stable for prompt routing.
- Preserve optional instance fields (`instanceKnowledge`, `instanceBehavior`) as serializable strings.

Object-specific checklist:
- Map object classification deterministically (capabilities/objectType to subclass).
- Keep state transitions (`idle`/`used`) and item transfer behavior deterministic.
- Ensure first-use outcomes and item-use rules remain data-driven and LLM-independent.

## Shipped Level Demonstrations

Riddle level demonstrates directional and default sprite-set wiring:
- player `spriteSet` includes `default/front/away/left/right`
- both guards include `default/front/away/left/right`
- both doors include `spriteSet.default`

References:
- [public/levels/riddle.json](../public/levels/riddle.json)
- [src/integration/riddleLevel.test.ts](../src/integration/riddleLevel.test.ts)

## Interaction State Updates

Conversational interactions write immutable updates into `actorConversationHistoryByActorId`, keyed by the interacting actor id. Object interactions return immutable state updates (for `interactiveObjects` and optional `levelOutcome`) and are then committed through world reset in `src/runtime/interactionResultBridge.ts`.

Movement commands also update immutable player-facing state in `src/world/world.ts`, coupling orientation to input intent while preserving deterministic world transitions.

## Testing Strategy

- `src/world/level.test.ts`: schema validation + deserialization coverage for `spriteAssetPath`, `spriteSet`, and optional `environments`, including player default `facingDirection` on load
- `src/world/world.test.ts`: deterministic movement mapping from command intent to `player.facingDirection`, including blocked movement intent
- `src/integration/riddleLevel.test.ts`: riddle-level sprite-set wiring assertions for player/guards/doors and player default `facingDirection`
- `src/world/spatialRules.test.ts`: occupancy invariants, environment blocking checks, and environment overlap validation

Determinism rule remains unchanged: identical starting state + identical command/interaction sequence => identical resulting state.
