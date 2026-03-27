# Type Reference

This document tracks the core serializable types used by the runtime.

Source of truth:
- `src/world/types.ts`
- `src/interaction/objectInteraction.ts`
- `src/interaction/adjacencyResolver.ts`

## World Types

### GridPosition
`{ x: number; y: number }`

### Player
- `id: string`
- `displayName: string`
- `position: GridPosition`

### Npc
- `id: string`
- `displayName: string`
- `position: GridPosition`
- `npcType: string` — Categorizes the NPC's role (e.g., `'archive_keeper'`, `'scholar'`). This field is set at level definition time.
- `dialogueContextKey: string` — Deterministically derived from `npcType` via `npc_${npcType.toLowerCase()}`. Used for LLM prompt context routing.

### Guard
Extends `Interactable`:
- `guardState: 'idle' | 'patrolling' | 'alert'`
- `honestyTrait?: 'truth-teller' | 'liar'`

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

## Level File Shape

### LevelData
Flat JSON level definition used by files in `public/levels/*.json`.

Required fields:
- `version: 1`
- `name: string`
- `width: number`
- `height: number`
- `player: { x: number; y: number }`
- `guards: Array<{ id, displayName, x, y, guardState, honestyTrait? }>`
- `doors: Array<{ id, displayName, x, y, doorState, outcome }>`

Optional fields:
- `npcs: Array<{ id, displayName, x, y, npcType }>` — Level-defined NPCs. Each NPC has a `npcType` that categorizes its role (e.g., `'archive_keeper'`). During deserialization, `dialogueContextKey` is automatically derived as `npc_${npcType.toLowerCase()}`.
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
