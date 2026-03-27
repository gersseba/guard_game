# Add an Interaction

This pattern describes how to add new NPC interaction logic and LLM prompt generation.

## Overview

Interactions are triggered when the player uses the `Interact` command near an NPC. The interaction layer orchestrates the exchange, calls the LLM boundary if needed, and formats the response.

## Steps

### 1. Define Prompt Context
Create a function to build the prompt context for your NPC in `src/interaction/guardPromptContext.ts` (or similar):

```typescript
export interface GuardPromptContext {
  player: {
    name: string;
    position: [number, number];
    inventory: string[];
  };
  npc: {
    name: string;
    personality: string;
    position: [number, number];
    behavior: string;
  };
  conversationHistory: ThreadMessage[];
  levelContext: {
    levelId: string;
    objective: string;
    guards: number;
  };
}

export function buildGuardPromptContext(
  player: Player,
  npc: Npc,
  thread: NpcThread,
  levelContext: unknown
): GuardPromptContext {
  return {
    player: {
      name: 'Player',
      position: player.position,
      inventory: player.inventory,
    },
    npc: {
      name: npc.metadata?.name || 'Guard',
      personality: npc.metadata?.personality || '',
      position: npc.position,
      behavior: npc.behavior,
    },
    conversationHistory: thread.messages,
    levelContext: levelContext as any, // Type as needed
  };
}
```

### 2. Define Interaction Handler
Create or extend an interaction handler in `src/interaction/npcInteraction.ts`:

```typescript
export async function resolveGuardInteraction(
  player: Player,
  npc: Npc,
  direction: number,
  levelContext: unknown
): Promise<InteractionResponse> {
  // Build prompt context
  const context = buildGuardPromptContext(player, npc, npc.thread, levelContext);
  
  // Optional: Log context for debugging
  console.log('Prompt context:', JSON.stringify(context, null, 2));
  
  // Call LLM client with context
  const llmResponse = await llmClient.generateGuardResponse(context);
  
  // Update conversation thread
  const newThread = {
    ...npc.thread,
    messages: [
      ...npc.thread.messages,
      { speaker: 'player' as const, text: 'Hello.', tick: getCurrentTick() },
      { speaker: 'npc' as const, text: llmResponse.text, tick: getCurrentTick() },
    ],
  };
  
  return {
    text: llmResponse.text,
    thread: newThread,
    npcBehaviorSuggestion: llmResponse.suggestedBehavior,
    stateChanges: llmResponse.stateChanges, // Optional world mutations
  };
}
```

### 3. Wire Handler into Interaction Layer
In `src/interaction/npcInteraction.ts`, register your handler in the dispatch:

```typescript
export async function resolveNpcInteraction(
  player: Player,
  npc: Npc,
  direction: number,
  levelContext: unknown
): Promise<InteractionResponse> {
  // Check adjacency first
  const adjacencyOk = checkAdjacency(player, npc);
  if (!adjacencyOk) {
    return { text: 'Cannot reach that NPC.', thread: npc.thread };
  }
  
  // Route to handler by NPC role
  if (npc.metadata?.role === 'guard') {
    return resolveGuardInteraction(player, npc, direction, levelContext);
  } else if (npc.metadata?.role === 'prisoner') {
    return resolvePrisonerInteraction(player, npc, direction, levelContext);
  }
  
  // Fallback
  return { text: 'Hello.', thread: npc.thread };
}
```

### 4. Add LLM Client Method
Define the LLM client method in `src/llm/client.ts`:

```typescript
export interface LlmClient {
  generateGuardResponse(context: GuardPromptContext): Promise<{
    text: string;
    suggestedBehavior?: string;
    stateChanges?: Record<string, unknown>;
  }>;
}

export const llmClient: LlmClient = {
  async generateGuardResponse(context: GuardPromptContext) {
    // Stub implementation for now
    return {
      text: `I am a guard. I don't recognize you.`,
      suggestedBehavior: 'patrol',
    };
  },
};
```

### 5. Write Tests
Add tests in `src/interaction/guardInteraction.test.ts` (or similar):

```typescript
test('Guard interaction builds correct prompt context', () => {
  const player = createPlayer({ position: [5, 5] });
  const npc = createNpc({ id: 'guard_1', position: [6, 5] });
  const levelContext = { levelId: 'starter', objective: 'escape' };
  
  const context = buildGuardPromptContext(player, npc, npc.thread, levelContext);
  
  expect(context.player.position).toEqual([5, 5]);
  expect(context.npc.name).toBe('Guard');
  expect(context.conversationHistory).toEqual([]);
  expect(context.levelContext.objective).toBe('escape');
});

test('Guard interaction returns valid response', async () => {
  const player = createPlayer({ position: [5, 5] });
  const guard = createNpc({ id: 'guard_1', position: [6, 5] });
  
  const response = await resolveGuardInteraction(player, guard, 0, {});
  
  expect(response.text).toBeTruthy();
  expect(response.thread.messages.length).toBeGreaterThan(0);
});

test('Conversation history persists in thread', async () => {
  const player = createPlayer();
  const guard = createNpc();
  guard.thread = {
    npcId: 'guard_1',
    messages: [
      { speaker: 'npc', text: 'State your business.', tick: 0 },
      { speaker: 'player', text: 'Just passing through.', tick: 1 },
    ],
  };
  
  const response = await resolveGuardInteraction(player, guard, 0, {});
  
  expect(response.thread.messages.length).toBe(4); // 2 existing + 2 new
  expect(response.thread.messages[0].text).toBe('State your business.');
});
```

## Checklist

- [ ] Prompt context type defined (e.g., `GuardPromptContext`)
- [ ] `buildXxxPromptContext()` function implemented
- [ ] Interaction handler defined (e.g., `resolveGuardInteraction()`)
- [ ] Handler registered in `resolveNpcInteraction()` dispatch
- [ ] LLM client method added to `src/llm/client.ts`
- [ ] Conversation thread is updated with new messages
- [ ] Unit tests written for prompt context and interaction response
- [ ] (Optional) Integration tests verifying end-to-end player → NPC flow
- [ ] Context is JSON-serializable
- [ ] Tests verify deterministic behavior

---

See [Interaction Layer](INTERACTION_LAYER.md) and [LLM Layer](LLM_LAYER.md) for architectural context.
