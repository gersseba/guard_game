import { describe, expect, it, vi } from 'vitest';
import { REQUEST_FAILURE_FALLBACK_TEXT, type LlmClient } from '../llm/client';
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

  it('stores deterministic fallback assistant text when llm request throws', async () => {
    const llmClient: LlmClient = {
      complete: async () => {
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

    expect(result.responseText).toBe(`Archivist: ${REQUEST_FAILURE_FALLBACK_TEXT}`);
    expect(result.updatedWorldState.actorConversationHistoryByActorId[npc.id]).toEqual([
      { role: 'player', text: 'Can you hear me?' },
      { role: 'assistant', text: REQUEST_FAILURE_FALLBACK_TEXT },
    ]);
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
});
