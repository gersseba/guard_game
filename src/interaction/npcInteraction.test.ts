import { describe, expect, it, vi } from 'vitest';
import { REQUEST_FAILURE_FALLBACK_TEXT, type LlmClient } from '../llm/client';
import { createNpcInteractionService } from './npcInteraction';
import { createInitialWorldState } from '../world/state';
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
    expect(result.responseText).toBe('Archivist: The archives are west of here.');
    expect(result.updatedWorldState.npcConversationHistoryByNpcId[npc.id]).toEqual([
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
      npcConversationHistoryByNpcId: {
        ...worldState.npcConversationHistoryByNpcId,
        [npc.id]: priorHistory,
      },
    };

    const result = await service.handleNpcInteraction({
      npc,
      player: worldState.player,
      worldState: seededState,
      playerMessage: 'What about the lower vault?',
    });

    expect(result.updatedWorldState.npcConversationHistoryByNpcId[npc.id]).toEqual([
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
    expect(result.updatedWorldState.npcConversationHistoryByNpcId[npc.id]).toEqual([
      { role: 'player', text: 'Can you hear me?' },
      { role: 'assistant', text: REQUEST_FAILURE_FALLBACK_TEXT },
    ]);
  });

  it('keeps npc conversation history JSON-serializable', async () => {
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

    expect(parsed.npcConversationHistoryByNpcId[npc.id]).toEqual([
      { role: 'player', text: 'Any advice?' },
      { role: 'assistant', text: 'Stay on patrol routes.' },
    ]);
  });
});
