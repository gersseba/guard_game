import { describe, expect, it, vi } from 'vitest';
import { REQUEST_FAILURE_FALLBACK_TEXT, type LlmClient } from '../llm/client';
import { createNpcInteractionService } from './npcInteraction';
import { renderActorConversationThread } from './actorConversationThread';
import { createInitialWorldState } from '../world/state';
import { GUARD_PERSONA_CONTRACT } from './guardPromptContext';
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
});
