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

### Player
- `id: string`
- `displayName: string`
- `position: GridPosition`
- `spriteAssetPath?: string`

### Npc
- `id: string`
- `displayName: string`
- `position: GridPosition`
- `npcType: string` - Categorizes the NPC's role (for prompt profile resolution)
- `dialogueContextKey: string` - Deterministically derived from `npcType` via `npc_${npcType.toLowerCase()}`
- `spriteAssetPath?: string`

### Guard
Extends `Interactable`:
- `guardState: 'idle' | 'patrolling' | 'alert'`
- `honestyTrait?: 'truth-teller' | 'liar'`
- `spriteAssetPath?: string`

### Door
Extends `Interactable`:
- `doorState: 'open' | 'closed' | 'locked'`
- `outcome?: 'safe' | 'danger'`

### InteractiveObject
Extends `Interactable`:
- `objectType: 'supply-crate'`
- `interactionType: 'inspect' | 'use' | 'talk'`
- `state: 'idle' | 'used'`
- `idleMessage?: string`
- `usedMessage?: string`
- `firstUseOutcome?: 'win' | 'lose'`
- `spriteAssetPath?: string`

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
- `player: Player`
- `npcs: Npc[]`
- `guards: Guard[]`
- `doors: Door[]`
- `interactiveObjects: InteractiveObject[]`
- `actorConversationHistoryByActorId: ActorConversationHistoryByActorId`
- `levelOutcome: 'win' | 'lose' | null`

## NPC Prompt Context Types

Defined in `src/interaction/npcPromptContext.ts`.

### NpcPromptProfile
- `personaContract: string`
- `knowledgePolicy?: string`
- `responseStyleConstraints?: string`

### ResolvedNpcPromptProfile
Extends `NpcPromptProfile` with:
- `profileKey: string` - Registry key used; `default` when fallback is applied
- `requestedNpcType: string` - Normalized incoming type (`trim().toLowerCase()`, or `default` for missing/empty)

### NPC_PROMPT_PROFILE_REGISTRY
`Record<string, NpcPromptProfile>` keyed by normalized `npcType` values.

Current built-in keys:
- `archive_keeper`
- `engineer`
- `scholar`

### DEFAULT_NPC_PROMPT_PROFILE
Deterministic fallback profile used when a normalized `npcType` has no registry match.

## Prompt Context Shape

`buildNpcPromptContext(npc, player)` returns a serialized JSON object with:
- `actor: { id, npcType }`
- `npcProfile: ResolvedNpcPromptProfile`
- `npcInstance: { displayName, position: { x, y }, dialogueContextKey }`
- `player: { id, displayName }`

This separates shared type-level prompt policy (`npcProfile`) from per-instance world facts (`npcInstance`).

## Level File Shape

### LevelData
Flat JSON level definition used by files in `public/levels/*.json`.

Required fields:
- `version: 1`
- `name: string`
- `width: number`
- `height: number`
- `player: { x: number; y: number }`
- `guards: Array<{ id, displayName, x, y, guardState, honestyTrait?, spriteAssetPath? }>`
- `doors: Array<{ id, displayName, x, y, doorState, outcome }>`

Optional fields:
- `player.spriteAssetPath?: string`
- `npcs: Array<{ id, displayName, x, y, npcType, spriteAssetPath? }>`
- `interactiveObjects: Array<...>` with the same object fields as `InteractiveObject`, but `x/y` instead of `position`

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
