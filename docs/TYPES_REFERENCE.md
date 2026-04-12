# Type Reference

This document tracks the core serializable types and selected transient runtime interfaces used by the runtime.

Source of truth:
- `src/world/types.ts` (barrel export; organized across domain-focused modules in `src/world/types/`)
  - `src/world/types/grid.ts` - GridPosition, SpriteDirection, SpriteSet
  - `src/world/types/entity.ts` - GameEntity, EntityCapabilities
  - `src/world/types/player.ts` - Player
  - `src/world/types/inventory.ts` - Inventory and item-use types
  - `src/world/types/guard.ts` - Guard
  - `src/world/types/npc.ts` - Npc, NpcTradeRule, NpcTradeState, RiddleClue, RiddleClueConstraint
  - `src/world/types/door.ts` - Door
  - `src/world/types/object.ts` - InteractiveObject, ObjectCapabilities
  - `src/world/types/environment.ts` - Environment
  - `src/world/types/conversation.ts` - ConversationMessage, ActorConversationHistoryByActorId
  - `src/world/types/quest.ts` - QuestState, QuestChainDefinition, QuestProgressEvent
  - `src/world/types/knowledge.ts` - KnowledgeState, KnowledgeTokenOutcome, KnowledgeTokenValidationResult
  - `src/world/types/world-state.ts` - WorldState, WorldGrid, LevelMetadata
  - `src/world/types/level.ts` - LevelData, Level*Dto types
  - `src/world/types/command.ts` - WorldCommand, Intent, World interface
- `src/world/entities/base/Entity.ts`
- `src/world/entities/base/Actor.ts`
- `src/world/entities/npcs/Npc.ts`
- `src/world/entities/npcs/GuardNpc.ts`
- `src/world/entities/objects/WorldObject.ts`
- `src/world/entities/objects/ContainerObject.ts`
- `src/world/entities/objects/MechanismObject.ts`
- `src/world/entities/objects/DoorObject.ts`
- `src/world/entities/items/Item.ts`
- `src/world/entities/environment/Environment.ts`
- `src/world/entities/dtoRuntimeSeams.ts`
- `src/interaction/npcPromptContext.ts`
- `src/interaction/npcDialogueConsequenceHook.ts`
- `src/interaction/objectInteraction.ts`
- `src/interaction/adjacencyResolver.ts`
- `src/runtime/runtimeController.ts`
- `src/render/viewportOverlay.ts`
- `src/render/chatModal.ts`
- `src/render/inventoryOverlay.ts`

## Runtime Session Types

### RuntimeConversationSession
- `actorId: string` - ID of the guard or NPC currently in conversation

Set when a conversational interaction opens the chat modal. Persists until the conversation is closed.

### RuntimeActionModalSession
- `targetId: string` - ID of the target (guard/npc) that opened the action modal
- `targetKind: 'guard' | 'npc'` - Type of actor (for routing to correct prompt context builder)
- `displayName: string` - Display name of the actor for modal header

Forward-looking type for action modal routing. Represents a session where the player can choose between:
- **Chat:** Open conversational modal with LLM
- **Inventory:** Display current inventory (view-only or select item)
- **Back:** Close modal and resume gameplay

### NpcDialogueOutcome
- `giveItem?: string`
- `takeItem?: string`
- `requireKnowledgeTokens?: string[]`
- `grantKnowledgeTokens?: string[]`
- `questProgressEvent?: QuestProgressEvent`

Serializable dialogue-consequence payload consumed by deterministic validators/executors.

### NpcDialogueConsequenceRequest
- `npcId: string`
- `worldState: WorldState`
- `outcome: unknown`

Boundary request contract used by `applyNpcDialogueConsequences(...)`.

### NpcDialogueConsequenceTrace
- `outcomeStatus: 'none' | 'accepted' | 'rejected'`
- `missingKnowledgeTokens: string[]`
- `inventoryMutated: boolean`
- `tradeRuleIdApplied: string | null`
- `questStateMutated: boolean`

Deterministic trace metadata for testing/debugging dialogue consequence evaluation.

### NpcDialogueConsequenceResult
- `updatedWorldState: WorldState`
- `trace: NpcDialogueConsequenceTrace`

Deterministic output contract from `applyNpcDialogueConsequences(...)`.

### ActionModalEligibleTarget

Type guard alias for conversational targets that can open action modal:
```typescript
type ActionModalEligibleTarget = Extract<AdjacentTarget, { kind: 'guard' | 'npc' }>;
```

Used by runtime to distinguish between:
- **Eligible:** Targets that open action modal (guards, NPCs)
- **Ineligible:** Targets handled deterministically (doors, objects)

## World Domain Runtime-Class Seams

These interfaces and classes provide a typed construction seam between serializable DTOs in `src/world/types/` modules and runtime class instances in `src/world/entities/`. (All types are re-exported from `src/world/types.ts` for import stability.)

### EntityInit
- `id: string`
- `position: GridPosition`
- `displayName: string`
- `spriteAssetPath?: string`
- `spriteSet?: SpriteSet`
- `traits?: Record<string, string>`
- `facts?: Record<string, string | number | boolean>`

### ActorInit
Extends `EntityInit`:
- `facingDirection?: SpriteDirection`

### NpcInit
Extends `ActorInit`:
- `npcType: string`
- `dialogueContextKey: string`
- `patrol?: { path: Array<{ x: number; y: number }> }`
- `triggers?: NpcTriggers`
- `inventory?: InventoryItem[]`
- `tradeRules?: NpcTradeRule[]`
- `tradeState?: NpcTradeState`
- `instanceKnowledge?: string`
- `instanceBehavior?: string`
- `riddleClue?: RiddleClue`

### GuardNpcInit
Extends `NpcInit` with guard-specialized constraints:
- omits `npcType`, `dialogueContextKey`, `patrol`, `triggers`, `inventory`, `tradeRules`, `tradeState`, `riddleClue` from constructor input
- `guardState: 'idle' | 'patrolling' | 'alert'`
- `itemUseRules?: Record<string, ItemUseRule>`

### WorldObjectInit
Extends `EntityInit`:
- `objectType: string`
- `interactionType: 'inspect' | 'use' | 'talk'`
- `state: 'idle' | 'used'`
- `pickupItem?: { itemId: string; displayName: string }`
- `idleMessage?: string`
- `usedMessage?: string`
- `firstUseOutcome?: 'win' | 'lose'`
- `capabilities?: ObjectCapabilities`
- `itemUseRules?: Record<string, ItemUseRule>`

### WorldObjectInteractionRequest
- `interactiveObject: InteractiveObject`
- `player: Player`
- `worldState: WorldState`

Serializable input contract consumed by `WorldObject.interact(...)` implementations.

### WorldObjectInteractionResult
- `responseText: string`
- `updatedWorldState: WorldState`

Deterministic output contract returned by `WorldObject.interact(...)` implementations.

### ItemInit
- `itemId: string`
- `displayName: string`
- `sourceObjectId: string`
- `pickedUpAtTick: number`

Runtime constructor contract for the item domain model used in inventory and transfer flows.

### PickupItemDescriptor
- `sourceObjectId: string`
- `pickedUpAtTick: number`
- `pickupItem: { itemId: string; displayName: string }`

Deterministic input contract for converting world pickup descriptors into `Item` instances.

### ItemTransferResult
- `item: Item | null`
- `remainingItems: InventoryItem[]`

Deterministic transfer result contract used for NPC/player give/take flows.

### EnvironmentInit
Extends `EntityInit`:
- `isBlocking: boolean`

### DtoToRuntimeAdapter<TDto, TRuntime>
- `fromDto(dto: TDto): TRuntime`

Used by seam adapter contracts in `src/world/entities/dtoRuntimeSeams.ts`.

### GuardDtoContract
Alias of serializable level ingress guard DTO used by the guard runtime seam adapter:
- `type GuardDtoContract = LevelGuardDto`

Mapped by `mapGuardDtoToRuntime(dto)` to runtime `GuardNpc` while preserving guard JSON shape.

### NpcDtoContract
Alias of serializable level ingress NPC DTO used by the NPC runtime seam adapter:
- `type NpcDtoContract = LevelNpcDto`

Mapped by `mapNpcDtoToRuntime(dto)` to runtime `Npc` with deterministic `dialogueContextKey` derivation.

### InteractiveObjectDtoContract
Alias of serializable `InteractiveObject` DTO used by the world-object runtime seam adapter:
- `type InteractiveObjectDtoContract = InteractiveObject`

Mapped by `mapInteractiveObjectDtoToRuntime(dto)` to `ContainerObject`, `MechanismObject`, `DoorObject`, or `null` for inert/unsupported objects.

### LevelInteractiveObjectDtoContract
Alias of serializable level ingress object DTO used at load time:
- `type LevelInteractiveObjectDtoContract = LevelInteractiveObjectDto`

Mapped by `mapLevelInteractiveObjectDtoToRuntime(dto)` to `ContainerObject`, `MechanismObject`, `DoorObject`, or `InertObject` for deterministic runtime storage.

### EnvironmentDtoContract
- `type EnvironmentDtoContract = LevelEnvironmentDto`

Mapped by `mapEnvironmentDtoToRuntime(dto)` to runtime `Environment`.

### ItemDtoContract
- `type ItemDtoContract = InventoryItem`

Mapped by `mapInventoryItemDtoToRuntime(dto)` to runtime `Item`.

## World Types

### GridPosition
`{ x: number; y: number }`

### SpriteDirection
`'front' | 'away' | 'left' | 'right'`

### SpriteSet
Serializable optional directional sprite metadata:
- `default?: string`
- `front?: string`
- `away?: string`
- `left?: string`
- `right?: string`

`default` is the deterministic base asset for missing directional keys.

### GameEntity
Base interface shared by all world entities. JSON-serializable.
- `id: string`
- `position: GridPosition`
- `displayName: string`
- `spriteSet?: SpriteSet`
- `spriteAssetPath?: string`
- `traits?: Record<string, string>` - Open-ended behavioral traits bag, directly readable by LLM prompt builders. E.g. `{ truthMode: 'truth-teller' | 'liar' }` on guards.
- `facts?: Record<string, string | number | boolean>` - Open-ended facts bag for arbitrary key/value data, directly readable by LLM prompt builders.

### EntityCapabilities
Opt-in capability container for game entities. Omit a key if the entity lacks that capability.
- `inventory?: { items: InventoryItem[] }` - Entity can carry items
- `dialogue?: { threadId?: string }` - Entity participates in conversation threads
- `patrol?: { path: GridPosition[] }` - Entity follows a patrol path
- `lock?: { isLocked: boolean; requiredItemId?: string }` - Entity has a lock mechanism

### TriggerEffect
- `setFact: string` - Fact key to update on the NPC facts bag
- `value: string | boolean | number` - Value to assign to that fact key

Serializable trigger mutation used by NPC approach/talk hooks.

### NpcTriggers
- `onApproach?: TriggerEffect`
- `onTalk?: TriggerEffect`

Optional trigger hooks for deterministic NPC state updates.

### NpcTradeRewardItem
- `itemId: string`
- `displayName: string`

Serializable reward descriptor used by deterministic NPC trade rules.

### NpcTradeRule
- `ruleId: string`
- `requiredItemIds: string[]`
- `rewardItems: NpcTradeRewardItem[]`

Declarative deterministic NPC exchange rule. Satisfied requirements consume player inventory items and grant reward items through world logic.

### NpcTradeState
- `completedRuleIds: string[]`

Serializable replay guard for one-time NPC trade rewards.

### Player
- `id: string`
- `displayName: string`
- `position: GridPosition`
- `inventory: PlayerInventory`
- `facingDirection?: SpriteDirection` - world-owned orientation token derived from latest directional movement intent
- `spriteAssetPath?: string`
- `spriteSet?: SpriteSet`

### InventoryItem
- `itemId: string`
- `displayName: string`
- `sourceObjectId: string`
- `pickedUpAtTick: number`

Serializable DTO shape. Runtime item logic is modeled by `Item` in `src/world/entities/items/Item.ts`, with explicit conversion helpers (`fromInventoryItem`, `fromPickup`, `toInventoryItem`) to keep JSON boundaries intact.

### PlayerInventory
- `items: InventoryItem[]`
- `selectedItem?: SelectedInventoryItem | null`

### SelectedInventoryItem
- `slotIndex: number`
- `itemId: string`

References one selected inventory slot by index and item id. Invalid slot selection clears this field to `null`.

### ItemUseAttemptResult
`'no-selection' | 'no-target' | 'blocked' | 'success' | 'no-rule'`

### ItemUseRule
- `allowed: boolean` - Whether use of the item is permitted on this entity
- `responseText: string` - Narrative response shown to player when rule is evaluated

Deterministic item-use rule for guards or objects. Enables data-driven puzzle interactions without LLM authority over outcomes.

### ItemUseAttemptResultEvent
- `tick: number`
- `commandIndex: number`
- `selectedItem: SelectedInventoryItem | null`
- `result: ItemUseAttemptResult`
- `target: { kind: 'door' | 'guard' | 'npc' | 'interactiveObject'; targetId: string } | null`
- `doorUnlockedId?: string` - If a door was unlocked via correct item-use, this field contains the door id. Used by runtime to apply door unlock mutations.

Represents one deterministic selected-item use attempt resolved for a specific command index in a tick.

### Npc
- `id: string`
- `displayName: string`
- `position: GridPosition`
- `npcType: string` - Categorizes the NPC's role (for prompt profile resolution)
- `dialogueContextKey: string` - Deterministically derived from `npcType` via `npc_${npcType.toLowerCase()}`
- `patrol?: { path: Array<{ x: number; y: number }> }` - Optional scripted patrol path, advanced by world tick in loop order
- `triggers?: NpcTriggers` - Optional deterministic trigger hooks for approach/talk
- `inventory?: InventoryItem[]` - Optional NPC-carried items used for deterministic dialogue item transfer
- `spriteAssetPath?: string`
- `spriteSet?: SpriteSet`
- `instanceKnowledge?: string` - Instance-specific knowledge this NPC has; included in prompt context output when set
- `instanceBehavior?: string` - Instance-specific behavior traits for this NPC; included in prompt context output when set

### Guard
Extends `GameEntity`:
- `guardState: 'idle' | 'patrolling' | 'alert'`
- `traits.truthMode?: 'truth-teller' | 'liar'` - Guard honesty mode, now stored in the shared `traits` bag. Defaults to `'truth-teller'` when absent.
- `spriteAssetPath?: string`
- `spriteSet?: SpriteSet`
- `instanceKnowledge?: string` - Instance-specific knowledge this guard has; included in prompt context output when set
- `instanceBehavior?: string` - Instance-specific behavior traits for this guard; included in prompt context output when set
- `itemUseRules?: Record<string, ItemUseRule>` - Deterministic item-use rules keyed by item ID. When player uses a matching item on this guard, the rule determines success/blocked outcome.

### Door
Extends `GameEntity`:
- `doorState: 'open' | 'closed' | 'locked'`
- `outcome?: 'safe' | 'danger'`
- `requiredItemId?: string` - Item id required to unlock this door via item-use. If set, door must be interacted with using this item before traversal is allowed.
- `isUnlocked?: boolean` - Whether this door has been unlocked via item-use. Once set to true, door allows traversal regardless of doorState. Persists through world state serialization (default: false).
- `spriteAssetPath?: string`
- `spriteSet?: SpriteSet`

### ObjectCapabilities
Capability flags that annotate object behavior capabilities:
- `containsItems?: boolean` - Object contains items that can be inspected and picked up
- `isActivatable?: boolean` - Object can be activated to trigger an effect (e.g., mechanism, lever)
- `isLockable?: boolean` - Object has a lock mechanism (reserved for future use)

Capabilities are consumed by runtime seam mapping for container and mechanism selection. Objects without a supported mapping remain inert.

### InteractiveObject
Extends `GameEntity`:
- `objectType: string` - Object classification token (e.g., "supply-crate", "mechanism", "service-door", "decoration") used by runtime seam mapping alongside capabilities.
- `interactionType: 'inspect' | 'use' | 'talk'`
- `state: 'idle' | 'used'`
- `pickupItem?: { itemId: string; displayName: string }` - Item available for pickup when this object is inspected (only used if capabilities.containsItems is true)
- `idleMessage?: string` - Narrative response on first interaction
- `usedMessage?: string` - Narrative response on subsequent interactions
- `firstUseOutcome?: 'win' | 'lose'` - Level outcome triggered on first use (if any)
- `capabilities?: ObjectCapabilities` - Optional capability flags used by runtime seam mapping (for example container/mechanism classification).
- `itemUseRules?: Record<string, ItemUseRule>` - Deterministic item-use rules keyed by item ID. When player uses a matching item on this object, the rule determines success/blocked outcome. Successful use transitions object state to 'used'.
- `spriteAssetPath?: string`
- `spriteSet?: SpriteSet`

### Environment
- `id: string`
- `displayName: string`
- `position: GridPosition`
- `isBlocking: boolean`

Environment entities are world-level spatial entities only. They can block movement when `isBlocking` is true and are not interaction targets.

### LevelData (environments excerpt)
- `environments?: Array<{ id: string; displayName: string; x: number; y: number; isBlocking: boolean }>`

Optional level schema section for environment entries. During deserialization, level coordinates (`x`, `y`) are mapped to runtime `position`.

## Subclass Extension Guidelines

### Adding a New NPC Subclass
1. Keep serializable data in `src/world/types.ts` (`LevelNpcDto` / `Npc`) and avoid runtime-only fields at DTO boundaries.
2. Implement subclass behavior in `src/world/entities/npcs`.
3. Add deterministic mapping in `mapNpcDtoToRuntime` (or adjacent seam helper).
4. Preserve JSON parity (`JSON.parse(JSON.stringify(instance))`) for world snapshots.
5. Add tests for class instantiation and deterministic behavior impact.

### Adding a New Interactive Object Subclass
1. Keep object DTO shape serializable in `LevelInteractiveObjectDto` / `InteractiveObject`.
2. Implement subclass in `src/world/entities/objects`.
3. Route deterministic classification in `mapInteractiveObjectDtoToRuntime` and level-load mapping in `mapLevelInteractiveObjectDtoToRuntime`.
4. Ensure object interaction outcomes are deterministic and local to world/interaction layers.
5. Add tests for polymorphic mapping, state transitions, and serialized shape parity.

### Adding Environment Variants
1. Keep runtime variants under `src/world/entities/environment` while preserving serializable `Environment` shape.
2. Map DTOs in `mapEnvironmentDtoToRuntime`.
3. Verify blocking behavior through `canMovePlayerTo` / `getBlockingOccupants` tests.

### WorldGrid
- `width: number`
- `height: number`
- `tileSize: number`

### ConversationMessage
- `role: 'player' | 'assistant'`
- `text: string`

### ActorConversationHistoryByActorId
`Record<string, ConversationMessage[]>`

Stores conversation history by actor id. The current conversational actors are guards and NPCs, but the type and naming stay actor-neutral so shared thread helpers and world state do not encode NPC-only semantics.

### WorldState
- `tick: number`
- `grid: WorldGrid`
- `levelMetadata: LevelMetadata` - narrative setup and goal for the current level
- `levelObjective?: string` - explicit UI objective text (`levelMetadata.goal` remains fallback)
- `player: Player`
- `npcs: Npc[]`
- `guards: Guard[]`
- `doors: Door[]`
- `interactiveObjects: InteractiveObject[]`
- `environments?: Environment[]`
- `questState?: QuestState` - deterministic quest-chain definitions and progression snapshot
- `knowledgeState?: KnowledgeState` - deterministic persistent knowledge-token grant ledger
- `actorConversationHistoryByActorId: ActorConversationHistoryByActorId`
- `lastItemUseAttemptEvent?: ItemUseAttemptResultEvent | null` - latest resolved selected-item use attempt
- `levelOutcome: 'win' | 'lose' | null`

### KnowledgeState
- `version: 1`
- `tokensById: Record<string, KnowledgeTokenGrantRecord>`

### KnowledgeTokenGrantRecord
- `tokenId: string`
- `grantedAtTick: number`
- `grantedByActorId?: string`

### KnowledgeTokenOutcome
- `requireKnowledgeTokens?: string[]`
- `grantKnowledgeTokens?: string[]`

### KnowledgeTokenValidationResult
- `isValid: boolean`
- `missingKnowledgeTokens: string[]`

### QuestChainDefinition
- `chainId: string`
- `displayName: string`
- `npcId?: string`
- `stages: QuestStageDefinition[]`

### QuestStageDefinition
- `stageId: string`
- `description?: string`
- `completeWhen: QuestProgressCriteria`

### QuestProgressCriteria
Current deterministic event matcher shape:
- `eventType: 'item_use_resolved'`
- optional filters: `result`, `targetKind`, `targetId`, `selectedItemId`, `doorUnlockedId`, `affectedEntityType`, `affectedEntityId`

### QuestState
- `version: 1`
- `chains: QuestChainDefinition[]`
- `progressByChainId: Record<string, QuestChainProgress>`

### QuestChainProgress
- `chainId: string`
- `status: 'not_started' | 'in_progress' | 'completed'`
- `currentStageIndex: number`
- `completedStageIds: string[]`
- `lastAdvancedTick?: number`

## Actor and NPC Prompt Context Types

Defined in `src/interaction/npcPromptContext.ts`.

### ActorPromptProfile
- `personaContract: string`
- `knowledgePolicy?: string`
- `responseStyleConstraints?: string`

### NpcPromptProfile
Legacy NPC-focused alias for `ActorPromptProfile`.

### ResolvedActorPromptProfile
Extends `ActorPromptProfile` with:
- `profileKey: string` - Registry key used; `default` when fallback is applied
- `requestedActorType: string` - Normalized incoming type (`trim().toLowerCase()`, or `default` for missing/empty)

### ResolvedNpcPromptProfile
Extends `ActorPromptProfile` with:
- `profileKey: string` - Registry key used; `default` when fallback is applied
- `requestedNpcType: string` - NPC-focused compatibility field mapped from actor normalization
