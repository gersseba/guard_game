# Add an NPC

This pattern describes how to introduce a new NPC to Guard Game.

## Overview

NPCs are agents with behavior, position, and conversation threads. They live in the world state and can interact with the player.

## Steps

### 1. Define the NPC
Add the NPC instance to `src/world/world.ts` or level definition:

```typescript
const newNpc: Npc = {
  id: 'guard_2',
  position: [8, 5],
  behavior: 'patrol', // or 'idle', 'alerted', etc.
  thread: createEmptyNpcThread('guard_2'),
  metadata: {
    name: 'Guard Captain',
    personality: 'stern, suspicious of strangers',
    routePatrol: [[8, 5], [8, 6], [8, 7]], // Optional
  },
};

// Add to initial world state
initialState.npcs.push(newNpc);
```

### 2. Create Rendering for the NPC
Add sprite creation in `src/render/scene.ts`:

```typescript
function createNpcSprite(npc: Npc): PIXI.Sprite {
  const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
  sprite.tint = 0xff0000; // Example: red for guards
  sprite.width = 32;
  sprite.height = 32;
  sprite.x = npc.position[0] * TILE_SIZE;
  sprite.y = npc.position[1] * TILE_SIZE;
  return sprite;
}

// Update render loop to draw NPCs
for (const npc of state.npcs) {
  const sprite = spriteCache.get(npc.id) || createNpcSprite(npc);
  sprite.x = npc.position[0] * TILE_SIZE;
  sprite.y = npc.position[1] * TILE_SIZE;
  container.addChild(sprite);
}
```

### 3. Add Interaction Logic
Define what happens when the player talks to this NPC in `src/interaction/npcInteraction.ts`:

```typescript
export async function resolveGuardInteraction(
  player: Player,
  npc: Npc,
  thread: NpcThread
): Promise<InteractionResponse> {
  // Build prompt context
  const context = buildGuardPromptContext(player, npc, thread);
  
  // Call LLM (or return hardcoded response)
  const response = await llmClient.generateResponse(context);
  
  // Update thread
  const newThread = addMessageToThread(thread, 'npc', response.text);
  
  return {
    text: response.text,
    thread: newThread,
    npcBehaviorSuggestion: response.suggestedBehavior,
  };
}
```

### 4. Register the Interaction Handler
Map NPC type to interaction handler in `src/interaction/npcInteraction.ts`:

```typescript
export async function resolveNpcInteraction(
  player: Player,
  npc: Npc,
  direction: number
): Promise<InteractionResponse> {
  const adjacencyResolution = resolveAdjacentNpc(player, npc, direction);
  
  if (!adjacencyResolution.canInteract) {
    return { text: 'Cannot reach that NPC.', thread: npc.thread };
  }
  
  // Route to NPC-specific handler
  if (npc.metadata?.role === 'guard') {
    return resolveGuardInteraction(player, npc, npc.thread);
  } else if (npc.metadata?.role === 'prisoner') {
    return resolvePrisonerInteraction(player, npc, npc.thread);
  }
  
  // Default response
  return { text: 'Hello.', thread: npc.thread };
}
```

### 5. Add Tests
Write tests in `src/integration/riddleLevel.test.ts` (or similar):

```typescript
test('Player can interact with guard NPC', async () => {
  const level = loadLevel('starter');
  const guard = level.state.npcs.find(n => n.id === 'guard_2');
  
  expect(guard).toBeDefined();
  expect(guard.position).toEqual([8, 5]);
});

test('Guard interaction returns response', async () => {
  const level = loadLevel('starter');
  const guard = level.state.npcs.find(n => n.id === 'guard_2');
  
  const response = await resolveGuardInteraction(level.state.player, guard, guard.thread);
  expect(response.text).toBeTruthy();
  expect(response.thread.messages.length).toBeGreaterThan(0);
});
```

## Checklist

- [ ] NPC added to level definition or initial world state in `src/world/world.ts`
- [ ] NPC sprite creation added to `src/render/scene.ts`
- [ ] Interaction handler defined in `src/interaction/npcInteraction.ts`
- [ ] Handler registered in `resolveNpcInteraction()` dispatch
- [ ] NPC metadata (name, personality, role) set correctly
- [ ] Tests written for NPC existence, rendering, and interaction
- [ ] Conversation thread initialized with `createEmptyNpcThread()`
- [ ] (Optional) Behavior logic (patrol, idle) added to world.ts

---

See [Interaction Layer](INTERACTION_LAYER.md) and [Type Reference](TYPES_REFERENCE.md) for context.
