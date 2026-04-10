import { describe, expect, it, vi } from 'vitest';
import { createGeminiLlmClient } from '../llm/client';
import { createNpcInteractionService } from '../interaction/npcInteraction';
import { createInitialWorldState } from '../world/state';
import type { WorldState } from '../world/types';

const createGeminiPayload = (parts: Array<Record<string, unknown>>): unknown => ({
  candidates: [
    {
      content: {
        parts,
      },
    },
  ],
});

const createService = (payload: unknown) => {
  const fetchImpl = vi.fn(async () => ({
    ok: true,
    json: async () => payload,
  }));

  const llmClient = createGeminiLlmClient({
    apiKey: 'test-key',
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });

  return {
    fetchImpl,
    service: createNpcInteractionService(llmClient),
  };
};

const createWorldState = (overrides: Partial<WorldState> = {}): WorldState => {
  const baseState = createInitialWorldState();
  const npc = {
    ...baseState.npcs[0],
    position: { x: 8, y: 3 },
    inventory: [
      {
        itemId: 'seal-key',
        displayName: 'Seal Key',
        sourceObjectId: 'npc-1',
        pickedUpAtTick: 0,
      },
      {
        itemId: 'gear',
        displayName: 'Gear',
        sourceObjectId: 'npc-1',
        pickedUpAtTick: 0,
      },
    ],
  };

  return {
    ...baseState,
    ...overrides,
    npcs: overrides.npcs ?? [npc],
  };
};

describe('npc function-calling integration', () => {
  it('supports text-only responses without creating an action trace', async () => {
    const { fetchImpl, service } = createService(
      createGeminiPayload([{ text: 'The eastern archive is sealed.' }]),
    );
    const worldState = createWorldState();
    const npc = worldState.npcs[0];

    const result = await service.handleNpcInteraction({
      npc,
      player: worldState.player,
      worldState,
      playerMessage: 'Where should I go?',
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.responseText).toBe('Archivist: The eastern archive is sealed.');
    expect(result.actionExecutionTrace).toBeUndefined();
    expect(result.updatedWorldState.actorConversationHistoryByActorId[npc.id]).toEqual([
      { role: 'player', text: 'Where should I go?' },
      { role: 'assistant', text: 'The eastern archive is sealed.' },
    ]);
  });

  it('supports function-only responses and preserves player-only history for the turn', async () => {
    const { service } = createService(
      createGeminiPayload([
        {
          functionCall: {
            name: 'move',
            args: { x: 9, y: 3 },
          },
        },
      ]),
    );
    const worldState = createWorldState();
    const npc = worldState.npcs[0];

    const result = await service.handleNpcInteraction({
      npc,
      player: worldState.player,
      worldState,
      playerMessage: 'Take one step east.',
    });

    expect(result.responseText).toBe('');
    expect(result.updatedWorldState.npcs[0].position).toEqual({ x: 9, y: 3 });
    expect(result.updatedWorldState.actorConversationHistoryByActorId[npc.id]).toEqual([
      { role: 'player', text: 'Take one step east.' },
    ]);
    expect(result.actionExecutionTrace?.steps.map((step) => step.code)).toEqual(['executed']);
  });

  it('supports text plus one function in the same response', async () => {
    const { service } = createService(
      createGeminiPayload([
        { text: 'I can open that. ' },
        {
          functionCall: {
            name: 'use_item',
            args: { itemId: 'seal-key', targetId: 'seal-door' },
          },
        },
      ]),
    );
    const worldState = createWorldState({
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
    });
    const npc = worldState.npcs[0];

    const result = await service.handleNpcInteraction({
      npc,
      player: worldState.player,
      worldState,
      playerMessage: 'Open the seal.',
    });

    expect(result.responseText).toBe('Archivist: I can open that.');
    expect(result.updatedWorldState.doors[0]).toMatchObject({ isOpen: true, isLocked: false });
    expect(result.updatedWorldState.actorConversationHistoryByActorId[npc.id]).toEqual([
      { role: 'player', text: 'Open the seal.' },
      { role: 'assistant', text: 'I can open that.' },
    ]);
    expect(result.actionExecutionTrace?.steps.map((step) => step.code)).toEqual(['executed']);
  });

  it('supports ordered text plus multiple functions and reports endedChat', async () => {
    const { service } = createService(
      createGeminiPayload([
        { text: 'I will reposition and unlock it.' },
        {
          functionCall: {
            name: 'move',
            args: { x: 8, y: 4 },
          },
        },
        {
          functionCall: {
            name: 'use_item',
            args: { itemId: 'seal-key', targetId: 'seal-door' },
          },
        },
        {
          functionCall: {
            name: 'end_chat',
            args: {},
          },
        },
      ]),
    );
    const worldState = createWorldState({
      doors: [
        {
          id: 'seal-door',
          displayName: 'Seal Door',
          position: { x: 9, y: 4 },
          isOpen: false,
          isLocked: true,
          requiredItemId: 'seal-key',
        },
      ],
    });
    const npc = worldState.npcs[0];

    const result = await service.handleNpcInteraction({
      npc,
      player: worldState.player,
      worldState,
      playerMessage: 'Handle the door and finish up.',
    });

    expect(result.responseText).toBe('Archivist: I will reposition and unlock it.');
    expect(result.updatedWorldState.npcs[0].position).toEqual({ x: 8, y: 4 });
    expect(result.updatedWorldState.doors[0]).toMatchObject({ isOpen: true, isLocked: false });
    expect(result.actionExecutionTrace?.steps.map((step) => step.code)).toEqual([
      'executed',
      'executed',
      'executed',
    ]);
    expect(result.actionExecutionTrace?.endedChat).toBe(true);
  });

  it('surfaces malformed function payloads as llm errors without corrupting world state', async () => {
    const { service } = createService(
      createGeminiPayload([
        {
          functionCall: {
            name: 'move',
            args: { x: 'east', y: 3 },
          },
        },
      ]),
    );
    const worldState = createWorldState();
    const npc = worldState.npcs[0];

    const result = await service.handleNpcInteraction({
      npc,
      player: worldState.player,
      worldState,
      playerMessage: 'Move east.',
    });

    expect(result.llmError).toEqual({
      kind: 'llm_request_error',
      message: 'Malformed function call payload from LLM.',
    });
    expect(result.responseText).toBe('');
    expect(result.actionExecutionTrace).toBeUndefined();
    expect(result.updatedWorldState.npcs[0].position).toEqual(npc.position);
    expect(result.updatedWorldState.actorConversationHistoryByActorId[npc.id]).toEqual([
      { role: 'player', text: 'Move east.' },
    ]);
  });

  it('keeps ordered traces stable through partially failing multi-function sequences', async () => {
    const { service } = createService(
      createGeminiPayload([
        { text: 'Attempting the sequence.' },
        {
          functionCall: {
            name: 'move',
            args: { x: 9, y: 3 },
          },
        },
        {
          functionCall: {
            name: 'interact',
            args: { targetId: 'missing-target' },
          },
        },
        {
          functionCall: {
            name: 'move',
            args: { x: 9, y: 4 },
          },
        },
      ]),
    );
    const worldState = createWorldState();
    const npc = worldState.npcs[0];

    const first = await service.handleNpcInteraction({
      npc,
      player: worldState.player,
      worldState,
      playerMessage: 'Run the sequence.',
    });
    const second = await service.handleNpcInteraction({
      npc,
      player: worldState.player,
      worldState,
      playerMessage: 'Run the sequence.',
    });

    expect(first.updatedWorldState).toEqual(second.updatedWorldState);
    expect(first.actionExecutionTrace?.steps.map((step) => step.code)).toEqual([
      'executed',
      'target_not_found',
      'executed',
    ]);
    expect(first.updatedWorldState.npcs[0].position).toEqual({ x: 9, y: 4 });
    expect(first.updatedWorldState.actorConversationHistoryByActorId[npc.id]).toEqual([
      { role: 'player', text: 'Run the sequence.' },
      { role: 'assistant', text: 'Attempting the sequence.' },
    ]);
  });
});