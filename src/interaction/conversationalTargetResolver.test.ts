import { describe, expect, it, vi } from 'vitest';
import { createConversationalTargetResolver } from './conversationalTargetResolver';
import type { ConversationalTargetResolver } from './interactionDispatcherTypes';
import type { Guard, Npc, WorldState } from '../world/types';

const createTestWorldState = (
  overrides?: Omit<Partial<WorldState>, 'player'> & { player?: Partial<WorldState['player']> },
): WorldState => {
  const baseState: WorldState = {
    tick: 0,
    grid: { width: 10, height: 10, tileSize: 32 },
    levelMetadata: {
      name: 'Resolver Test',
      premise: 'Fixture for conversational target resolver tests.',
      goal: 'Resolve conversational actors by id.',
    },
    levelObjective: 'Find a conversation target.',
    player: {
      id: 'player',
      displayName: 'Player',
      position: { x: 0, y: 0 },
      inventory: {
        items: [],
      },
    },
    guards: [],
    doors: [],
    npcs: [],
    interactiveObjects: [],
    actorConversationHistoryByActorId: {},
    levelOutcome: null,
  };

  return {
    ...baseState,
    ...(overrides ?? {}),
    player: {
      ...baseState.player,
      ...(overrides?.player ?? {}),
    },
  };
};

const createTestGuard = (id: string): Guard => ({
  id,
  displayName: 'Test Guard',
  position: { x: 1, y: 0 },
  guardState: 'idle',
});

const createTestNpc = (id: string): Npc => ({
  id,
  displayName: 'Test NPC',
  position: { x: 2, y: 0 },
  dialogueContextKey: 'test',
  npcType: 'scholar',
});

describe('createConversationalTargetResolver', () => {
  it('resolves default guard and npc targets by actor id', () => {
    const guard = createTestGuard('guard-1');
    const npc = createTestNpc('npc-1');
    const resolveTarget = createConversationalTargetResolver();
    const worldState = createTestWorldState({ guards: [guard], npcs: [npc] });

    expect(resolveTarget(worldState, 'guard-1')).toMatchObject({ kind: 'guard', target: guard });
    expect(resolveTarget(worldState, 'npc-1')).toMatchObject({ kind: 'npc', target: npc });
    expect(resolveTarget(worldState, 'missing')).toBeNull();
  });

  it('stops at the first matching resolver to preserve ordering semantics', () => {
    const guard = createTestGuard('guard-1');
    const worldState = createTestWorldState({ guards: [guard] });
    const secondResolver = vi.fn<ConversationalTargetResolver>().mockReturnValue(null);
    const resolveTarget = createConversationalTargetResolver([
      () => ({ kind: 'guard', target: guard }),
      secondResolver,
    ]);

    expect(resolveTarget(worldState, 'guard-1')).toMatchObject({ kind: 'guard', target: guard });
    expect(secondResolver).not.toHaveBeenCalled();
  });
});