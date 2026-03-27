import { describe, expect, it, vi } from 'vitest';
import { createInitialWorldState } from '../world/state';
import { MISSING_API_KEY_FALLBACK_TEXT, REQUEST_FAILURE_FALLBACK_TEXT, type LlmClient } from '../llm/client';
import { GUARD_PERSONA_CONTRACT } from './guardPromptContext';
import { createGuardInteractionService, handleGuardInteraction } from './guardInteraction';
import type { Guard, Player } from '../world/types';

const player: Player = { id: 'player-1', displayName: 'Hero', position: { x: 1, y: 1 } };

const makeGuard = (guardState: Guard['guardState']): Guard => ({
  id: 'guard-1',
  displayName: 'Guard',
  position: { x: 2, y: 1 },
  guardState,
});

describe('handleGuardInteraction', () => {
  it('returns halt response when guard is idle', () => {
    const result = handleGuardInteraction({ guard: makeGuard('idle'), player });
    expect(result.guardId).toBe('guard-1');
    expect(result.responseText).toBe('Guard: Halt! Who goes there?');
  });

  it('returns patrol response when guard is patrolling', () => {
    const result = handleGuardInteraction({ guard: makeGuard('patrolling'), player });
    expect(result.guardId).toBe('guard-1');
    expect(result.responseText).toBe('Guard: Keep moving, nothing to see here.');
  });

  it('returns alert response when guard is alert', () => {
    const result = handleGuardInteraction({ guard: makeGuard('alert'), player });
    expect(result.guardId).toBe('guard-1');
    expect(result.responseText).toBe('Guard: Stop right there!');
  });

  it('returns deterministic output for same input', () => {
    const guard = makeGuard('idle');
    const first = handleGuardInteraction({ guard, player });
    const second = handleGuardInteraction({ guard, player });
    expect(first).toEqual(second);
  });
});

describe('createGuardInteractionService', () => {
  it('sends guard persona + world context only for guard requests', async () => {
    const complete = vi.fn(async () => ({ text: 'All clear in this sector.' }));
    const llmClient: LlmClient = { complete };
    const service = createGuardInteractionService(llmClient);
    const worldState = createInitialWorldState();
    worldState.guards = [makeGuard('patrolling')];
    worldState.npcs = [
      {
        id: 'npc-1',
        displayName: 'Archivist',
        position: { x: 8, y: 3 },
        npcType: 'archive_keeper',
        dialogueContextKey: 'archive_keeper_intro',
      },
    ];

    const result = await service.handleGuardInteraction({
      guard: worldState.guards[0],
      player: worldState.player,
      worldState,
      playerMessage: 'Report nearby activity.',
    });

    expect(result.responseText).toBe('Guard: All clear in this sector.');
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'guard-1',
        playerMessage: 'Report nearby activity.',
      }),
    );

    const calledPrompt = complete.mock.calls.at(0)?.at(0) as { context: string } | undefined;
    expect(calledPrompt).toBeDefined();
    if (!calledPrompt) {
      throw new Error('Expected guard LLM prompt to be provided.');
    }
    const parsedContext = JSON.parse(calledPrompt.context) as {
      guardPersonaContract: string;
      worldContext: {
        player: { id: string; position: { x: number; y: number } };
        guards: Array<{ id: string; position: { x: number; y: number } }>;
        npcs: Array<{ id: string; position: { x: number; y: number } }>;
        interactiveObjects: Array<{ id: string; kind: 'door' | 'object'; position: { x: number; y: number } }>;
      };
    };

    expect(parsedContext.guardPersonaContract).toBe(GUARD_PERSONA_CONTRACT);
    expect(parsedContext.worldContext.player.position).toEqual(worldState.player.position);
    expect(parsedContext.worldContext.guards).toEqual([
      { id: 'guard-1', position: worldState.guards[0].position },
    ]);
    expect(parsedContext.worldContext.npcs).toEqual([
      { id: 'npc-1', position: worldState.npcs[0].position },
    ]);
  });

  it('preserves deterministic missing-api-key fallback text from llm boundary', async () => {
    const llmClient: LlmClient = {
      complete: async () => ({ text: MISSING_API_KEY_FALLBACK_TEXT }),
    };
    const service = createGuardInteractionService(llmClient);
    const worldState = createInitialWorldState();
    worldState.guards = [makeGuard('idle')];

    const result = await service.handleGuardInteraction({
      guard: worldState.guards[0],
      player: worldState.player,
      worldState,
      playerMessage: 'Status?',
    });

    expect(result.responseText).toBe(`Guard: ${MISSING_API_KEY_FALLBACK_TEXT}`);
  });

  it('returns deterministic request-failure fallback when llm call throws', async () => {
    const llmClient: LlmClient = {
      complete: async () => {
        throw new Error('network down');
      },
    };
    const service = createGuardInteractionService(llmClient);
    const worldState = createInitialWorldState();
    worldState.guards = [makeGuard('alert')];

    const result = await service.handleGuardInteraction({
      guard: worldState.guards[0],
      player: worldState.player,
      worldState,
      playerMessage: 'Any trouble?',
    });

    expect(result.responseText).toBe(`Guard: ${REQUEST_FAILURE_FALLBACK_TEXT}`);
  });
});
