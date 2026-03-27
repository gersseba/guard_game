# Type Reference

This document is a living data dictionary of key types used throughout Guard Game.

## World State

### WorldState
The complete game state snapshot at any tick. Must be JSON-serializable.

**Fields:**
- `tick: number` — Current game tick (100ms intervals)
- `player: Player` — Player entity (position, orientation, inventory)
- `npcs: Npc[]` — All NPCs in the current level
- `interactiveObjects: InteractiveObject[]` — Doors, items, etc.
- `levelId: string` — Current level identifier

**Example:**
```json
{
  "tick": 42,
  "player": { "id": "player_0", "position": [5, 5], "orientation": 0 },
  "npcs": [
    { "id": "guard_1", "position": [7, 5], "behavior": "patrol", "seenPlayer": false }
  ],
  "interactiveObjects": [
    { "id": "door_1", "position": [10, 5], "type": "door", "locked": true }
  ],
  "levelId": "starter"
}
```

### Player
Represents the player character.

**Fields:**
- `id: string` — Unique identifier
- `position: [number, number]` — [x, y] grid coordinates
- `orientation: number` — Direction in degrees (0 = East, 90 = North, etc.)
- `inventory: string[]` — List of held item IDs

### Npc
Represents a non-player character.

**Fields:**
- `id: string` — Unique identifier
- `position: [number, number]` — [x, y] grid coordinates
- `behavior: string` — Current behavior mode (e.g., "patrol", "idle", "alerted")
- `thread: NpcThread` — Conversation context and history
- `metadata: Record<string, unknown>` — Extensible NPC-specific data

### InteractiveObject
Represents an interactable entity in the world.

**Fields:**
- `id: string` — Unique identifier
- `position: [number, number]` — [x, y] grid coordinates
- `type: string` — Object type (e.g., "door", "item", "trigger")
- `state: Record<string, unknown>` — State data (e.g., `{ locked: true }`)

## Commands

### WorldCommand
Base type for all player and system actions.

**Variants:**
- `MoveForward`
- `MoveBackward`
- `TurnLeft` (rotate counterclockwise)
- `TurnRight` (rotate clockwise)
- `Interact` (initiate interaction with adjacent NPC)
- `Wait` (no-op; advance tick)

## Interaction

### InteractionRequest
Context for an NPC interaction.

**Fields:**
- `player: Player` — Current player state
- `npc: Npc` — Target NPC
- `direction: number` — Player's facing direction at time of interaction
- `thread: NpcThread` — Existing conversation thread (or new empty thread)

### InteractionResponse
Result of an NPC interaction.

**Fields:**
- `text: string` — Dialog text to display
- `thread: NpcThread` — Updated conversation thread
- `stateChanges?: Record<string, unknown>` — Optional world state modifications
- `npcBehaviorSuggestion?: string` — Optional suggested NPC behavior change

### NpcThread
Stores conversation history and context for an NPC.

**Fields:**
- `npcId: string` — ID of the NPC in this thread
- `messages: ThreadMessage[]` — Conversation history
- `context: Record<string, unknown>` — Conversation-specific metadata

### ThreadMessage
A single message in an NPC conversation thread.

**Fields:**
- `speaker: "player" | "npc"` — Who said it
- `text: string` — Message content
- `tick: number` — When it was said (for temporal awareness)

---

All types are defined in `src/world/types.ts` and `src/interaction/npcThread.ts`. Keep this reference in sync with actual type definitions during development.
