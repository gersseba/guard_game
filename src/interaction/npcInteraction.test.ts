import { describe, expect, it, vi } from 'vitest';
import { isLlmRequestError, type LlmClient } from '../llm/client';
import { createNpcInteractionService } from './npcInteraction';
import { renderActorConversationThread } from './actorConversationThread';
import { createInitialWorldState } from '../world/state';
import { GUARD_PERSONA_CONTRACT } from './guardPromptContext';
import { resolveNpcPromptProfile } from './npcPromptContext';
import type { ConversationMessage } from '../world/types';

describe('createNpcInteractionService', () => {
  it('appends player then assistant messages for a single npc turn', async () => {
    const complete = vi.fn(async () => ({ text: 'The archives are west of here.' }));
    const llmClient: LlmClient = { complete };
    const service = createNpcInteractionService(llmClient);

    const worldState = createInitialWorldState();
    const npc = worldState.npcs[0];

    const result = await service.handleNpcInteraction({
      npc,
      player: worldState.player,
      worldState,
      playerMessage: 'Where are the archives?',
    });

    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: npc.id,
        playerMessage: 'Where are the archives?',
        conversationHistory: [{ role: 'player', text: 'Where are the archives?' }],
      }),
    );
    const calledPrompt = complete.mock.calls.at(0)?.at(0) as { context: string } | undefined;
    expect(calledPrompt).toBeDefined();
    if (!calledPrompt) {
      throw new Error('Expected NPC LLM prompt to be provided.');
    }
    expect(calledPrompt.context).not.toContain(GUARD_PERSONA_CONTRACT);
    const parsedContext = JSON.parse(calledPrompt.context) as {
      actor: { id: string; npcType: string };
      npcProfile: { profileKey: string; personaContract: string };
      npcInstance: {
        displayName: string;
        dialogueContextKey: string;
        patrolStatus: { isPatrolling: boolean };
      };
      player: { id: string; displayName: string };
    };
    expect(parsedContext.actor).toEqual({ id: npc.id, npcType: npc.npcType });
    expect(parsedContext.npcProfile).toEqual(resolveNpcPromptProfile(npc.npcType));
    expect(parsedContext.npcInstance).toEqual({
      displayName: npc.displayName,
      position: npc.position,
      dialogueContextKey: npc.dialogueContextKey,
      patrolStatus: {
        isPatrolling: false,
      },
    });
    expect(parsedContext.player).toEqual({
      id: worldState.player.id,
      displayName: worldState.player.displayName,
    });
    expect(result.responseText).toBe('Archivist: The archives are west of here.');
    expect(result.updatedWorldState.actorConversationHistoryByActorId[npc.id]).toEqual([
      { role: 'player', text: 'Where are the archives?' },
      { role: 'assistant', text: 'The archives are west of here.' },
    ]);
    expect(
      (complete.mock.calls.at(0)?.at(0) as { availableFunctions?: Array<{ name: string }> } | undefined)
        ?.availableFunctions?.map((fn) => fn.name),
    ).toEqual(['end_chat', 'move', 'interact', 'use_item']);
  });

  it('executes actions-only npc responses without appending an empty assistant message', async () => {
    const llmClient: LlmClient = {
      complete: async () => ({
        actions: [{ name: 'move', arguments: { x: 9, y: 3 } }],
      }),
    };
    const service = createNpcInteractionService(llmClient);
    const worldState = createInitialWorldState();
    const npc = worldState.npcs[0];

    const result = await service.handleNpcInteraction({
      npc,
      player: worldState.player,
      worldState,
      playerMessage: 'Move aside.',
    });

    expect(result.responseText).toBe('');
    expect(result.updatedWorldState.npcs[0].position).toEqual({ x: 9, y: 3 });
    expect(result.updatedWorldState.actorConversationHistoryByActorId[npc.id]).toEqual([
      { role: 'player', text: 'Move aside.' },
    ]);
    expect(result.actionExecutionTrace?.steps).toHaveLength(1);
    expect(result.actionExecutionTrace?.steps[0]).toMatchObject({
      status: 'success',
      code: 'executed',
    });
  });

  it('supports mixed text and actions in a single npc turn', async () => {
    const llmClient: LlmClient = {
      complete: async () => ({
        text: 'I will open the seal.',
        actions: [{ name: 'use_item', arguments: { itemId: 'seal-key', targetId: 'seal-door' } }],
      }),
    };
    const service = createNpcInteractionService(llmClient);
    const worldState = createInitialWorldState();
    const npc = {
      ...worldState.npcs[0],
      inventory: [
        {
          itemId: 'seal-key',
          displayName: 'Seal Key',
          sourceObjectId: 'npc-1',
          pickedUpAtTick: 0,
        },
      ],
      position: { x: 8, y: 3 },
    };
    const stateWithDoor = {
      ...worldState,
      npcs: [npc],
      doors: [
        {
          id: 'seal-door',
          displayName: 'Seal Door',
          position: { x: 8, y: 4 },
          isOpen: false,
          isLocked: true,
          requiredItemId: 'seal-key',
        },
      ],
    };

    const result = await service.handleNpcInteraction({
      npc,
      player: stateWithDoor.player,
      worldState: stateWithDoor,
      playerMessage: 'Can you open this?',
    });

    expect(result.responseText).toBe('Archivist: I will open the seal.');
    expect(result.updatedWorldState.actorConversationHistoryByActorId[npc.id]).toEqual([
      { role: 'player', text: 'Can you open this?' },
      { role: 'assistant', text: 'I will open the seal.' },
    ]);
    expect(result.updatedWorldState.doors[0]).toMatchObject({
      isOpen: true,
      isLocked: false,
    });
    expect(result.actionExecutionTrace?.steps[0]).toMatchObject({
      status: 'success',
      code: 'executed',
      targetId: 'seal-door',
    });
  });

  it('records failed action traces without crashing npc interaction flow', async () => {
    const llmClient: LlmClient = {
      complete: async () => ({
        text: 'I cannot reach that from here.',
        actions: [{ name: 'interact', arguments: { targetId: 'far-door' } }],
      }),
    };
    const service = createNpcInteractionService(llmClient);
    const worldState = createInitialWorldState();
    const npc = worldState.npcs[0];
    const stateWithFarDoor = {
      ...worldState,
      doors: [
        {
          id: 'far-door',
          displayName: 'Far Door',
          position: { x: 11, y: 7 },
          isOpen: false,
          isLocked: false,
        },
      ],
    };

    const result = await service.handleNpcInteraction({
      npc,
      player: stateWithFarDoor.player,
      worldState: stateWithFarDoor,
      playerMessage: 'Try the door.',
    });

    expect(result.responseText).toBe('Archivist: I cannot reach that from here.');
    expect(result.updatedWorldState.actorConversationHistoryByActorId[npc.id]).toEqual([
      { role: 'player', text: 'Try the door.' },
      { role: 'assistant', text: 'I cannot reach that from here.' },
    ]);
    expect(result.updatedWorldState.levelOutcome).toBeNull();
    expect(result.actionExecutionTrace?.steps[0]).toMatchObject({
      status: 'failed',
      code: 'not_adjacent',
      targetId: 'far-door',
    });
  });

  it('preserves prior per-npc history when appending a new turn', async () => {
    const complete = vi.fn(async () => ({ text: 'The lower vault is sealed.' }));
    const llmClient: LlmClient = { complete };
    const service = createNpcInteractionService(llmClient);

    const worldState = createInitialWorldState();
    const npc = worldState.npcs[0];
    const priorHistory: ConversationMessage[] = [
      { role: 'player', text: 'Any updates?' },
      { role: 'assistant', text: 'No updates yet.' },
    ];

    const seededState = {
      ...worldState,
      actorConversationHistoryByActorId: {
        ...worldState.actorConversationHistoryByActorId,
        [npc.id]: priorHistory,
      },
    };

    const result = await service.handleNpcInteraction({
      npc,
      player: worldState.player,
      worldState: seededState,
      playerMessage: 'What about the lower vault?',
    });

    expect(result.updatedWorldState.actorConversationHistoryByActorId[npc.id]).toEqual([
      ...priorHistory,
      { role: 'player', text: 'What about the lower vault?' },
      { role: 'assistant', text: 'The lower vault is sealed.' },
    ]);
  });

  it('propagates structured error and does not append assistant message when llm request throws', async () => {
    const llmClient: LlmClient = {
      complete: async (): Promise<never> => {
        throw new Error('timeout');
      },
    };
    const service = createNpcInteractionService(llmClient);
    const worldState = createInitialWorldState();
    const npc = worldState.npcs[0];

    const result = await service.handleNpcInteraction({
      npc,
      player: worldState.player,
      worldState,
      playerMessage: 'Can you hear me?',
    });

    expect(isLlmRequestError(result.llmError!)).toBe(true);
    expect(result.responseText).toBe('');
    const history = result.updatedWorldState.actorConversationHistoryByActorId[npc.id] ?? [];
    expect(history).toEqual([{ role: 'player', text: 'Can you hear me?' }]);
  });

  it('keeps conversation history JSON-serializable', async () => {
    const llmClient: LlmClient = {
      complete: async () => ({ text: 'Stay on patrol routes.' }),
    };
    const service = createNpcInteractionService(llmClient);
    const worldState = createInitialWorldState();
    const npc = worldState.npcs[0];

    const result = await service.handleNpcInteraction({
      npc,
      player: worldState.player,
      worldState,
      playerMessage: 'Any advice?',
    });

    const json = JSON.stringify(result.updatedWorldState);
    const parsed = JSON.parse(json) as typeof result.updatedWorldState;

    expect(parsed.actorConversationHistoryByActorId[npc.id]).toEqual([
      { role: 'player', text: 'Any advice?' },
      { role: 'assistant', text: 'Stay on patrol routes.' },
    ]);
  });

  it('starts from a clean thread for npc with no prior history and renders that first turn', async () => {
    const llmClient: LlmClient = {
      complete: async () => ({ text: 'Start with the north corridor.' }),
    };
    const service = createNpcInteractionService(llmClient);
    const worldState = createInitialWorldState();
    const npc = worldState.npcs[0];

    const result = await service.handleNpcInteraction({
      npc,
      player: worldState.player,
      worldState,
      playerMessage: 'Can you help me?',
    });

    const interactionPanelText = renderActorConversationThread(result.updatedWorldState, npc.id);
    expect(interactionPanelText).toBe('Player: Can you help me?\nNPC: Start with the north corridor.');
  });

  it('reloads same npc thread on reopen and adds only one new turn per interaction', async () => {
    const complete = vi
      .fn<() => Promise<{ text: string }>>()
      .mockResolvedValueOnce({ text: 'The archives are west.' })
      .mockResolvedValueOnce({ text: 'Use the lower key.' });
    const llmClient: LlmClient = { complete };
    const service = createNpcInteractionService(llmClient);
    const worldState = createInitialWorldState();
    const npc = worldState.npcs[0];

    const firstResult = await service.handleNpcInteraction({
      npc,
      player: worldState.player,
      worldState,
      playerMessage: 'Where are the archives?',
    });
    const firstPanelText = renderActorConversationThread(firstResult.updatedWorldState, npc.id);
    expect(firstPanelText).toBe('Player: Where are the archives?\nNPC: The archives are west.');

    const secondResult = await service.handleNpcInteraction({
      npc,
      player: worldState.player,
      worldState: firstResult.updatedWorldState,
      playerMessage: 'What key do I need?',
    });

    const secondPanelText = renderActorConversationThread(secondResult.updatedWorldState, npc.id);
    expect(secondPanelText).toBe(
      [
        'Player: Where are the archives?',
        'NPC: The archives are west.',
        'Player: What key do I need?',
        'NPC: Use the lower key.',
      ].join('\n'),
    );

    expect(secondResult.updatedWorldState.actorConversationHistoryByActorId[npc.id]).toEqual([
      { role: 'player', text: 'Where are the archives?' },
      { role: 'assistant', text: 'The archives are west.' },
      { role: 'player', text: 'What key do I need?' },
      { role: 'assistant', text: 'Use the lower key.' },
    ]);
  });

  it('switches npc threads without cross-contamination in rendered interaction panel text', async () => {
    const complete = vi
      .fn<() => Promise<{ text: string }>>()
      .mockResolvedValueOnce({ text: 'Archivist response.' })
      .mockResolvedValueOnce({ text: 'Engineer response.' });
    const llmClient: LlmClient = { complete };
    const service = createNpcInteractionService(llmClient);
    const worldState = createInitialWorldState();
    const firstNpc = worldState.npcs[0];
    const secondNpc = {
      ...firstNpc,
      id: 'npc-2',
      displayName: 'Engineer',
      dialogueContextKey: 'engineer_intro',
      position: { x: 7, y: 3 },
    };
    const stateWithTwoNpcs = {
      ...worldState,
      npcs: [firstNpc, secondNpc],
    };

    const firstNpcResult = await service.handleNpcInteraction({
      npc: firstNpc,
      player: stateWithTwoNpcs.player,
      worldState: stateWithTwoNpcs,
      playerMessage: 'Hello archivist',
    });

    const secondNpcResult = await service.handleNpcInteraction({
      npc: secondNpc,
      player: stateWithTwoNpcs.player,
      worldState: firstNpcResult.updatedWorldState,
      playerMessage: 'Hello engineer',
    });

    const firstNpcPanelText = renderActorConversationThread(secondNpcResult.updatedWorldState, firstNpc.id);
    const secondNpcPanelText = renderActorConversationThread(secondNpcResult.updatedWorldState, secondNpc.id);

    expect(firstNpcPanelText).toBe('Player: Hello archivist\nNPC: Archivist response.');
    expect(secondNpcPanelText).toBe('Player: Hello engineer\nNPC: Engineer response.');
    expect(secondNpcPanelText).not.toContain('Archivist response.');
    expect(firstNpcPanelText).not.toContain('Engineer response.');
  });

  it('applies onTalk trigger effect to npc facts after dialogue resolves', async () => {
    const llmClient: LlmClient = {
      complete: async () => ({ text: 'I am now on alert.' }),
    };
    const service = createNpcInteractionService(llmClient);
    const worldState = createInitialWorldState();
    const npc = {
      ...worldState.npcs[0],
      triggers: {
        onTalk: {
          setFact: 'alerted',
          value: true,
        },
      },
    };

    const result = await service.handleNpcInteraction({
      npc,
      player: worldState.player,
      worldState: {
        ...worldState,
        npcs: [npc],
      },
      playerMessage: 'Status report?',
    });

    expect(result.updatedWorldState.npcs[0].facts).toEqual({
      alerted: true,
    });
  });

  it('moves giveItem outcome item from npc inventory to player inventory', async () => {
    const llmClient: LlmClient = {
      complete: async () => ({ text: 'Take this key.', outcome: { giveItem: 'key-token' } }),
    };
    const service = createNpcInteractionService(llmClient);
    const worldState = createInitialWorldState();
    const npc = {
      ...worldState.npcs[0],
      inventory: [
        {
          itemId: 'key-token',
          displayName: 'Key Token',
          sourceObjectId: 'npc-1',
          pickedUpAtTick: 0,
        },
      ],
    };

    const result = await service.handleNpcInteraction({
      npc,
      player: worldState.player,
      worldState: {
        ...worldState,
        npcs: [npc],
      },
      playerMessage: 'Can you help me?',
    });

    expect(result.updatedWorldState.npcs[0].inventory).toEqual([]);
    expect(result.updatedWorldState.player.inventory.items).toEqual([
      {
        itemId: 'key-token',
        displayName: 'Key Token',
        sourceObjectId: 'npc-1',
        pickedUpAtTick: 0,
      },
    ]);
  });

  it('moves takeItem outcome item from player inventory to npc inventory', async () => {
    const llmClient: LlmClient = {
      complete: async () => ({ text: 'I will hold on to this.', outcome: { takeItem: 'key-token' } }),
    };
    const service = createNpcInteractionService(llmClient);
    const worldState = createInitialWorldState();
    const npc = {
      ...worldState.npcs[0],
      inventory: [],
    };
    const player = {
      ...worldState.player,
      inventory: {
        ...worldState.player.inventory,
        items: [
          {
            itemId: 'key-token',
            displayName: 'Key Token',
            sourceObjectId: 'object-1',
            pickedUpAtTick: 1,
          },
        ],
      },
    };

    const result = await service.handleNpcInteraction({
      npc,
      player,
      worldState: {
        ...worldState,
        player,
        npcs: [npc],
      },
      playerMessage: 'Can you take this?',
    });

    expect(result.updatedWorldState.player.inventory.items).toEqual([]);
    expect(result.updatedWorldState.npcs[0].inventory).toEqual([
      {
        itemId: 'key-token',
        displayName: 'Key Token',
        sourceObjectId: 'object-1',
        pickedUpAtTick: 1,
      },
    ]);
  });

  it('produces deterministic give/take transfer world state for identical input state and action', async () => {
    const llmClient: LlmClient = {
      complete: async () => ({ text: 'We can trade.', outcome: { giveItem: 'npc-token', takeItem: 'player-token' } }),
    };
    const service = createNpcInteractionService(llmClient);
    const worldState = createInitialWorldState();
    const npc = {
      ...worldState.npcs[0],
      inventory: [
        {
          itemId: 'npc-token',
          displayName: 'NPC Token',
          sourceObjectId: 'npc-1',
          pickedUpAtTick: 0,
        },
      ],
    };
    const player = {
      ...worldState.player,
      inventory: {
        ...worldState.player.inventory,
        items: [
          {
            itemId: 'player-token',
            displayName: 'Player Token',
            sourceObjectId: 'object-2',
            pickedUpAtTick: 1,
          },
        ],
      },
    };
    const sharedInputState = {
      ...worldState,
      player,
      npcs: [npc],
    };

    const first = await service.handleNpcInteraction({
      npc,
      player,
      worldState: sharedInputState,
      playerMessage: 'Trade?',
    });
    const second = await service.handleNpcInteraction({
      npc,
      player,
      worldState: sharedInputState,
      playerMessage: 'Trade?',
    });

    expect(first.updatedWorldState).toEqual(second.updatedWorldState);
    expect(first.updatedWorldState.player.inventory.items).toEqual([
      {
        itemId: 'npc-token',
        displayName: 'NPC Token',
        sourceObjectId: 'npc-1',
        pickedUpAtTick: 0,
      },
    ]);
    expect(first.updatedWorldState.npcs[0].inventory).toEqual([
      {
        itemId: 'player-token',
        displayName: 'Player Token',
        sourceObjectId: 'object-2',
        pickedUpAtTick: 1,
      },
    ]);
  });

  it('grants knowledge tokens from structured outcome fields regardless of assistant wording', async () => {
    const llmClient: LlmClient = {
      complete: async () => ({
        text: 'Completely unrelated prose.',
        outcome: {
          grantKnowledgeTokens: ['seal-c', 'seal-a', 'seal-c'],
        },
      }),
    };
    const service = createNpcInteractionService(llmClient);
    const worldState = createInitialWorldState();
    const npc = worldState.npcs[0];

    const result = await service.handleNpcInteraction({
      npc,
      player: worldState.player,
      worldState,
      playerMessage: 'Share knowledge?',
    });

    expect(Object.keys(result.updatedWorldState.knowledgeState?.tokensById ?? {})).toEqual([
      'seal-a',
      'seal-c',
    ]);
    expect(result.updatedWorldState.knowledgeState?.tokensById['seal-a']).toEqual({
      tokenId: 'seal-a',
      grantedAtTick: 0,
      grantedByActorId: npc.id,
    });
  });

  it('does not grant new knowledge tokens when outcome requirements are not satisfied', async () => {
    const llmClient: LlmClient = {
      complete: async () => ({
        text: 'You are not ready for this yet.',
        outcome: {
          requireKnowledgeTokens: ['seal-a'],
          grantKnowledgeTokens: ['seal-b'],
        },
      }),
    };
    const service = createNpcInteractionService(llmClient);
    const worldState = createInitialWorldState();
    const npc = worldState.npcs[0];

    const result = await service.handleNpcInteraction({
      npc,
      player: worldState.player,
      worldState,
      playerMessage: 'Share the second phrase?',
    });

    expect(result.updatedWorldState.knowledgeState?.tokensById['seal-b']).toBeUndefined();
  });

  it('blocks give/take inventory outcomes when knowledge token requirements are not satisfied', async () => {
    const llmClient: LlmClient = {
      complete: async () => ({
        text: 'You cannot trade yet.',
        outcome: {
          requireKnowledgeTokens: ['seal-a'],
          giveItem: 'npc-token',
          takeItem: 'player-token',
        },
      }),
    };
    const service = createNpcInteractionService(llmClient);
    const worldState = createInitialWorldState();
    const npc = {
      ...worldState.npcs[0],
      inventory: [
        {
          itemId: 'npc-token',
          displayName: 'NPC Token',
          sourceObjectId: 'npc-1',
          pickedUpAtTick: 0,
        },
      ],
    };
    const player = {
      ...worldState.player,
      inventory: {
        ...worldState.player.inventory,
        items: [
          {
            itemId: 'player-token',
            displayName: 'Player Token',
            sourceObjectId: 'object-2',
            pickedUpAtTick: 1,
          },
        ],
      },
    };

    const result = await service.handleNpcInteraction({
      npc,
      player,
      worldState: {
        ...worldState,
        player,
        npcs: [npc],
      },
      playerMessage: 'Trade?',
    });

    expect(result.updatedWorldState.player.inventory.items).toEqual([
      {
        itemId: 'player-token',
        displayName: 'Player Token',
        sourceObjectId: 'object-2',
        pickedUpAtTick: 1,
      },
    ]);
    expect(result.updatedWorldState.npcs[0].inventory).toEqual([
      {
        itemId: 'npc-token',
        displayName: 'NPC Token',
        sourceObjectId: 'npc-1',
        pickedUpAtTick: 0,
      },
    ]);
    expect(result.updatedWorldState.knowledgeState?.tokensById['seal-a']).toBeUndefined();
  });

  it('applies npc trade rules from world data instead of LLM inventory outcome fields', async () => {
    const llmClient: LlmClient = {
      complete: async () => ({
        text: 'I can make that exchange.',
        outcome: {
          giveItem: 'llm-only-item',
          takeItem: 'llm-only-cost',
        },
      }),
    };
    const service = createNpcInteractionService(llmClient);
    const worldState = createInitialWorldState();
    const npc = {
      ...worldState.npcs[0],
      tradeRules: [
        {
          ruleId: 'swap-pass-for-key',
          requiredItemIds: ['gate-pass'],
          rewardItems: [{ itemId: 'archive-key', displayName: 'Archive Key' }],
        },
      ],
    };
    const player = {
      ...worldState.player,
      inventory: {
        ...worldState.player.inventory,
        items: [
          {
            itemId: 'gate-pass',
            displayName: 'Gate Pass',
            sourceObjectId: 'object-2',
            pickedUpAtTick: 1,
          },
        ],
      },
    };

    const result = await service.handleNpcInteraction({
      npc,
      player,
      worldState: {
        ...worldState,
        player,
        npcs: [npc],
      },
      playerMessage: 'Trade?',
    });

    expect(result.updatedWorldState.player.inventory.items).toEqual([
      {
        itemId: 'archive-key',
        displayName: 'Archive Key',
        sourceObjectId: npc.id,
        pickedUpAtTick: 0,
      },
    ]);
    expect(result.updatedWorldState.npcs[0].tradeState).toEqual({
      completedRuleIds: ['swap-pass-for-key'],
    });
  });

  it('does not mutate inventory when npc trade requirements are missing even if the LLM returns item outcomes', async () => {
    const llmClient: LlmClient = {
      complete: async () => ({
        text: 'You still need the pass.',
        outcome: {
          giveItem: 'llm-only-item',
        },
      }),
    };
    const service = createNpcInteractionService(llmClient);
    const worldState = createInitialWorldState();
    const npc = {
      ...worldState.npcs[0],
      tradeRules: [
        {
          ruleId: 'swap-pass-for-key',
          requiredItemIds: ['gate-pass'],
          rewardItems: [{ itemId: 'archive-key', displayName: 'Archive Key' }],
        },
      ],
    };
    const player = {
      ...worldState.player,
      inventory: {
        ...worldState.player.inventory,
        items: [
          {
            itemId: 'apple',
            displayName: 'Apple',
            sourceObjectId: 'object-2',
            pickedUpAtTick: 1,
          },
        ],
      },
    };

    const result = await service.handleNpcInteraction({
      npc,
      player,
      worldState: {
        ...worldState,
        player,
        npcs: [npc],
      },
      playerMessage: 'Trade?',
    });

    expect(result.updatedWorldState.player.inventory.items).toEqual(player.inventory.items);
    expect(result.updatedWorldState.npcs[0].tradeState).toBeUndefined();
  });
});
