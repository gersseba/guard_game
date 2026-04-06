# Type Reference

This document tracks the core serializable types and selected transient runtime interfaces used by the runtime.

Source of truth:
- `src/world/types.ts`
- `src/interaction/npcPromptContext.ts`
- `src/interaction/objectInteraction.ts`
- `src/interaction/adjacencyResolver.ts`
- `src/runtimeController.ts`
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

### ActionModalEligibleTarget

Type guard alias for conversational targets that can open action modal:
```typescript
type ActionModalEligibleTarget = Extract<AdjacentTarget, { kind: 'guard' | 'npc' }>;
```

Used by runtime to distinguish between:
- **Eligible:** Targets that open action modal (guards, NPCs)
- **Ineligible:** Targets handled deterministically (doors, objects)

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

### EntityCapabilities
Opt-in capability container for game entities. Omit a key if the entity lacks that capability.
- `inventory?: { items: InventoryItem[] }` - Entity can carry items
- `dialogue?: { threadId?: string }` - Entity participates in conversation threads
- `patrol?: { path: GridPosition[] }` - Entity follows a patrol path
- `lock?: { isLocked: boolean; requiredItemId?: string }` - Entity has a lock mechanism

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

### PlayerInventory
- `items: InventoryItem[]`
- `selectedItem?: SelectedInventoryItem | null`

### SelectedInventoryItem
- `slotIndex: number`
- `itemId: string`

References one selected inventory slot by index and item id. Invalid slot selection clears this field to `null`.

### ItemUseAttemptResult
`'no-selection' | 'no-target' | 'blocked' | 'success'`

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
- `spriteAssetPath?: string`
- `spriteSet?: SpriteSet`
- `instanceKnowledge?: string` - Instance-specific knowledge this NPC has; included in prompt context output when set
- `instanceBehavior?: string` - Instance-specific behavior traits for this NPC; included in prompt context output when set

### Guard
Extends `GameEntity`:
- `guardState: 'idle' | 'patrolling' | 'alert'`
- `honestyTrait?: 'truth-teller' | 'liar'`
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
- `consumeOnUse?: boolean` - Whether the required item should be consumed when used to unlock (default: false)
- `isUnlocked?: boolean` - Whether this door has been unlocked via item-use. Once set to true, door allows traversal regardless of doorState. Persists through world state serialization (default: false).
- `spriteAssetPath?: string`
- `spriteSet?: SpriteSet`

### InteractiveObject
Extends `GameEntity`:
- `objectType: 'supply-crate'`
- `interactionType: 'inspect' | 'use' | 'talk'`
- `state: 'idle' | 'used'`
- `pickupItem?: { itemId: string; displayName: string }`
- `idleMessage?: string`
- `usedMessage?: string`
- `firstUseOutcome?: 'win' | 'lose'`
- `itemUseRules?: Record<string, ItemUseRule>` - Deterministic item-use rules keyed by item ID. When player uses a matching item on this object, the rule determines success/blocked outcome. Successful use transitions object state to 'used'.
- `affectedEntityType?: 'guard' | 'object'` - Type of entity affected by successful item-use rule (guard or object)
- `affectedEntityId?: string` - ID of entity affected by successful item-use rule
- `ruleResponseText?: string` - Response text from the applied item-use rule
- `spriteAssetPath?: string`
- `spriteSet?: SpriteSet`

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
- `actorConversationHistoryByActorId: ActorConversationHistoryByActorId`
- `lastItemUseAttemptEvent?: ItemUseAttemptResultEvent | null` - latest resolved selected-item use attempt
- `levelOutcome: 'win' | 'lose' | null`

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