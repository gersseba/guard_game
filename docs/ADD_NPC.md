# Add an NPC

This pattern describes how to introduce a new NPC to Guard Game.

## Overview

NPCs are agents with a type, position, and conversation history. They are defined in level JSON files and are deterministically deserialized into runtime state. Their dialogue behavior is driven by their `npcType` and derived `dialogueContextKey`.

## Steps

### 1. Define the NPC in a Level File
Add the NPC to the `npcs` array in `public/levels/*.json`:

```json
{
  "npcs": [
    {
      "id": "archivist-1",
      "displayName": "The Archivist",
      "x": 8,
      "y": 5,
      "npcType": "archive_keeper"
    }
  ]
}
```

**Required fields:**
- `id`: Unique identifier for the NPC
- `displayName`: Display name shown in the UI  
- `x`, `y`: Grid coordinates
- `npcType`: String categorizing the NPC's role (e.g., `archive_keeper`, `scholar`, `merchant`). This determines the `dialogueContextKey`.

**Deserialization:**
When the level loads, `deserializeLevel()` automatically maps NPC entries from level JSON into runtime `Npc` objects and derives `dialogueContextKey` from `npcType`:

```typescript
// Input from level JSON
{ id: 'archivist-1', displayName: 'The Archivist', x: 8, y: 5, npcType: 'archive_keeper' }

// Becomes runtime Npc
{
  id: 'archivist-1',
  displayName: 'The Archivist',
  position: { x: 8, y: 5 },
  npcType: 'archive_keeper',
  dialogueContextKey: 'npc_archive_keeper'  // derived: `npc_${npcType.toLowerCase()}`
}
```

### 2. Handle Rendering (if needed)
NPCs are rendered as grid sprites in `src/render/scene.ts`. If you need custom rendering for a specific `npcType`:

```typescript
// Example: custom sprite for archive_keeper NPCs
function getNpcSpriteColor(npc: Npc): number {
  switch (npc.npcType) {
    case 'archive_keeper':
      return 0x9933ff; // purple
    case 'scholar':
      return 0x0099ff; // blue
    default:
      return 0xcccccc; // gray
  }
}
```

Rendering uses the NPC's `position` and `displayName`:

```typescript
for (const npc of state.npcs) {
  const sprite = createOrUpdateNpcSprite(npc, getNpcSpriteColor(npc));
  container.addChild(sprite);
}
```

### 3. Define Interaction and Dialogue
Define interaction behavior in `src/interaction/npcInteraction.ts`. Route interaction based on `npcType`:

```typescript
export async function resolveNpcInteraction(
  player: Player,
  npc: Npc,
  direction: DirectionKey
): Promise<InteractionResponse> {
  // Check adjacency
  const adjacencyResolution = resolveAdjacentNpc(player, npc, direction);
  
  if (!adjacencyResolution.canInteract) {
    return { text: 'Cannot reach that NPC.' };
  }
  
  // Route to NPC type handler
  switch (npc.npcType) {
    case 'archive_keeper':
      return resolveArchiveKeeperInteraction(player, npc);
    case 'scholar':
      return resolveScholarInteraction(player, npc);
    default:
      return { text: `Hello, I'm a ${npc.displayName}.` };
  }
}
```

The NPC's `dialogueContextKey` (derived from `npcType`) is used when building LLM prompt context:

```typescript
// In guardPromptContext.ts or similar
function buildNpcPromptContext(npc: Npc, player: Player): string {
  return `
You are a ${npc.npcType}. The player's key to unlock your dialogue is: ${npc.dialogueContextKey}
NPC name: ${npc.displayName}
Player: ${player.displayName}
  `;
}
```


### 4. Add Tests
Test that the NPC loads correctly and can be interacted with:

```typescript
// In src/world/level.test.ts
describe('NPC loading', () => {
  it('deserializes level NPCs with correct dialogueContextKey', () => {
    const level: LevelData = {
      ...minimalLevel,
      npcs: [{ 
        id: 'npc-1', 
        displayName: 'Archivist', 
        x: 8, 
        y: 3, 
        npcType: 'archive_keeper' 
      }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    const state = deserializeLevel(validateLevelData(level));

    expect(state.npcs).toHaveLength(1);
    expect(state.npcs[0].npcType).toBe('archive_keeper');
    expect(state.npcs[0].dialogueContextKey).toBe('npc_archive_keeper');
  });

  it('derives dialogueContextKey lowercase from npcType', () => {
    const level: LevelData = {
      ...minimalLevel,
      npcs: [{ 
        id: 'npc-1', 
        displayName: 'Captain', 
        x: 5, 
        y: 5, 
        npcType: 'GUARD_CAPTAIN' 
      }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    const state = deserializeLevel(validateLevelData(level));
    expect(state.npcs[0].dialogueContextKey).toBe('npc_guard_captain');
  });
});
```

## Checklist

- [ ] NPC added to level JSON (`public/levels/*.json`) with `id`, `displayName`, `x`, `y`, `npcType`
- [ ] `npcType` matches the interaction handler routing (e.g., `'archive_keeper'`)
- [ ] Interaction handler defined in `src/interaction/npcInteraction.ts` for the `npcType`
- [ ] Rendering (if custom) handles the `npcType` in `src/render/scene.ts`
- [ ] Tests verify NPC loads with correct `dialogueContextKey` derived from `npcType`
- [ ] `dialogueContextKey` is used in LLM prompt context building
- [ ] Level passes `validateLevelData()` and `deserializeLevel()` without errors
- [ ] NPC position does not overlap with other entities (validated by `validateSpatialLayout()`)

---

See [World Layer](WORLD_LAYER.md), [Type Reference](TYPES_REFERENCE.md), and [Interaction Layer](INTERACTION_LAYER.md) for more context.

