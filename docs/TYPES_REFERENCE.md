# Type Reference

This document tracks the core serializable types and selected transient runtime interfaces used by the runtime.

Source of truth:
- `src/world/types.ts`
- `src/interaction/npcPromptContext.ts`
- `src/interaction/objectInteraction.ts`
- `src/interaction/adjacencyResolver.ts`
- `src/runtimeController.ts`
- `src/render/viewportOverlay.ts`

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
Extends `Interactable`:
- `guardState: 'idle' | 'patrolling' | 'alert'`
- `honestyTrait?: 'truth-teller' | 'liar'`
- `spriteAssetPath?: string`
- `spriteSet?: SpriteSet`
- `instanceKnowledge?: string` - Instance-specific knowledge this guard has; included in prompt context output when set
- `instanceBehavior?: string` - Instance-specific behavior traits for this guard; included in prompt context output when set

### Door
Extends `Interactable`:
- `doorState: 'open' | 'closed' | 'locked'`
- `outcome?: 'safe' | 'danger'`
- `spriteAssetPath?: string`
- `spriteSet?: SpriteSet`

### InteractiveObject
Extends `Interactable`:
- `objectType: 'supply-crate'`
- `interactionType: 'inspect' | 'use' | 'talk'`
- `state: 'idle' | 'used'`
- `pickupItem?: { itemId: string; displayName: string }`
- `idleMessage?: string`
- `usedMessage?: string`
- `firstUseOutcome?: 'win' | 'lose'`
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
- `levelObjective: string`
- `player: Player`
- `npcs: Npc[]`
- `guards: Guard[]`
- `doors: Door[]`
- `interactiveObjects: InteractiveObject[]`
- `actorConversationHistoryByActorId: ActorConversationHistoryByActorId`
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

### ACTOR_PROMPT_PROFILE_REGISTRY
`Record<string, ActorPromptProfile>` keyed by normalized actor-type values.

Current built-in keys:
- `guard`
- `archive_keeper`
- `engineer`
- `scholar`
- `villager`

### NPC_PROMPT_PROFILE_REGISTRY
Legacy alias to `ACTOR_PROMPT_PROFILE_REGISTRY` retained for compatibility in NPC-specific call sites.

### DEFAULT_NPC_PROMPT_PROFILE
Deterministic fallback profile used when a normalized `npcType` has no registry match.

## Prompt Context Shape

`buildNpcPromptContext(npc, player, worldState)` returns a serialized JSON object with:
- `actor: { id, npcType }`
- `npcProfile: ResolvedNpcPromptProfile`
- `npcInstance: { displayName, position: { x, y }, dialogueContextKey }`
- `typeWorldKnowledge?: unknown` — actor-type-specific world facts; omitted when `buildActorTypeWorldKnowledge` returns `null`
- `instanceKnowledge?: string` — instance-specific knowledge from the NPC; included only when set on the `Npc` object
- `instanceBehavior?: string` — instance-specific behavior traits from the NPC; included only when set on the `Npc` object
- `player: { id, displayName }`

This separates shared type-level prompt policy (`npcProfile`) from per-instance world facts (`npcInstance`) and type-scoped world context (`typeWorldKnowledge`).

`buildGuardPromptContext(guard, worldState)` returns a serialized JSON object with:
- `guard: { id, displayName, position: { x, y }, truth }`
- `guardPersonaContract: string`
- `world: GuardWorldContextPayload`
- `instanceKnowledge?: string` — instance-specific knowledge from the guard; included only when set on the `Guard` object
- `instanceBehavior?: string` — instance-specific behavior traits from the guard; included only when set on the `Guard` object

### ACTOR_TYPE_WORLD_KNOWLEDGE_BUILDERS

`Record<string, ActorTypeWorldKnowledgeBuilder>` — registry of world knowledge builders keyed by normalized actor-type values.

Current entries and payload shapes:
- `guard`: `{ player, guards[], doors[] }` — all guards/doors with truth and outcome flags
- `villager`: `{ player, otherVillagers[] }` — other villagers in the level, excluding the requesting actor

### ACTOR_WORLD_KNOWLEDGE_BUILDER_ALIASES

`Record<string, string>` — maps actor types without a direct registry entry to an existing builder key.

Current entries:
- `archive_keeper → villager`

### buildActorTypeWorldKnowledge

`buildActorTypeWorldKnowledge(actorType, worldState, actorId): unknown | null`

Resolves the world knowledge builder for `actorType` (checking `ACTOR_TYPE_WORLD_KNOWLEDGE_BUILDERS` first, then `ACTOR_WORLD_KNOWLEDGE_BUILDER_ALIASES`) and invokes it with `worldState` and `actorId`. Returns `null` when no builder resolves. Called by both `buildGuardPromptContext` and `buildNpcPromptContext`.

## Level File Shape

### LevelData
Flat JSON level definition used by files in `public/levels/*.json`.

Required fields:
- `version: 1`
- `name: string`
- `objective: string`
- `width: number`
- `height: number`
- `player: { x: number; y: number; spriteAssetPath?: string; spriteSet?: SpriteSet }`
- `guards: Array<{ id, displayName, x, y, guardState, honestyTrait?, spriteAssetPath?, spriteSet?, instanceKnowledge?, instanceBehavior? }>`
- `doors: Array<{ id, displayName, x, y, doorState, outcome, spriteAssetPath?, spriteSet? }>`

Optional fields:
- `npcs: Array<{ id, displayName, x, y, npcType, spriteAssetPath?, spriteSet?, instanceKnowledge?, instanceBehavior? }>`
- `interactiveObjects: Array<...>` with the same object fields as `InteractiveObject`, but `x/y` instead of `position`

Shipped level sprite metadata examples:
- `public/levels/starter.json` shows single-path `spriteAssetPath` usage.
- `public/levels/riddle.json` shows directional `spriteSet` usage for player and guards, and `default` door sprite sets.

Example NPC entry:

```json
{
  "id": "archivist-1",
  "displayName": "The Archivist",
  "x": 8,
  "y": 5,
  "npcType": "archive_keeper"
}
```

When deserialized, becomes:

```typescript
{
  id: 'archivist-1',
  displayName: 'The Archivist',
  position: { x: 8, y: 5 },
  npcType: 'archive_keeper',
  dialogueContextKey: 'npc_archive_keeper'
}
```

Example interactive object entry:

```json
{
  "id": "crate-supplies",
  "displayName": "Supply Crate",
  "x": 11,
  "y": 10,
  "objectType": "supply-crate",
  "interactionType": "inspect",
  "state": "idle",
  "pickupItem": {
    "itemId": "starter-storage-key",
    "displayName": "Storage Key"
  },
  "idleMessage": "You crack open the crate and find emergency supplies.",
  "usedMessage": "The supply crate is already open and empty.",
  "spriteAssetPath": "/assets/medieval_supply_crate_inspect.svg"
}
```

## Interaction Types

### AdjacentTarget
Defined in `src/interaction/adjacencyResolver.ts`:
- `{ kind: 'guard'; target: Guard }`
- `{ kind: 'door'; target: Door }`
- `{ kind: 'npc'; target: Npc }`
- `{ kind: 'interactiveObject'; target: InteractiveObject }`

### InteractiveObjectInteractionRequest
Defined in `src/interaction/objectInteraction.ts`:
- `interactiveObject: InteractiveObject`
- `player: Player`
- `worldState: WorldState`

### InteractiveObjectInteractionResult
Defined in `src/interaction/objectInteraction.ts`:
- `objectId: string`
- `responseText: string`
- `updatedWorldState: WorldState`

## Commands

### WorldCommand
Defined in `src/world/types.ts`:
- `{ type: 'move'; dx: number; dy: number }`
- `{ type: 'interact' }`

### CommandBuffer
Defined in `src/input/commands.ts`:
- `enqueue(command: WorldCommand): void` - adds a command (called by the keyboard handler)
- `drain(): WorldCommand[]` - atomically returns and empties the buffer; called once per tick
- `clear(): void` - discards all pending commands without returning them; called by `RuntimeController` on pause entry and exit

## Runtime Controller Types

Defined in `src/runtimeController.ts`. These types are **not** part of `WorldState`; pause state is transient runtime orchestration and must not be serialized or included in LLM context.

### RuntimeConversationSession
- `actorId: string` - id of the currently active conversational actor (guard or NPC)

### RuntimeControllerDependencies
- `world: Pick<World, 'getState' | 'applyCommands'>`
- `commandBuffer: Pick<CommandBuffer, 'drain' | 'clear'>`
- `runInteractions: (worldState: WorldState, commands: WorldCommand[]) => void`

### RuntimeController
- `stepSimulation(): void` - advances one fixed tick; if paused, drains and discards the buffer without updating world state
- `openConversation(actorId: string): void` - pauses simulation, records active actor, and clears the command buffer
- `closeConversation(): void` - resumes simulation, clears the active session, and clears the command buffer
- `isPaused(): boolean` - returns current pause state
- `getCurrentInteraction(): RuntimeConversationSession | null` - returns the active session or `null`

## Render Runtime Interfaces

### ViewportOverlay
Defined in `src/render/viewportOverlay.ts`:
- `show(): void` - reveals `.viewport-pause-overlay` and sets `inert` on the viewport root
- `hide(): void` - hides the overlay and removes `inert` from the viewport root
- `isVisible(): boolean` - returns whether the viewport pause overlay is currently visible

`ViewportOverlay` is transient DOM state only. It is not serialized and is not stored in `WorldState`.
