import { describe, expect, it, vi } from 'vitest';
import type { ConversationMessage, WorldState } from '../world/types';
import { createResultHandlerRegistry } from './resultHandlerRegistry';
import type { ResultHandlerConfig } from './interactionDispatcherTypes';

const createTestWorldState = (
  overrides?: Omit<Partial<WorldState>, 'player'> & { player?: Partial<WorldState['player']> },
): WorldState => {
  const baseState: WorldState = {
    tick: 0,
    grid: { width: 10, height: 10, tileSize: 32 },
    levelMetadata: {
      name: 'Result Registry Test',
      premise: 'Fixture for result handler registry tests.',
      goal: 'Preserve result-side effect ordering.',
    },
    levelObjective: 'Exercise result handlers.',
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

const createResultHandlerConfig = (): ResultHandlerConfig & {
  callOrder: string[];
  history: ConversationMessage[];
} => {
  const callOrder: string[] = [];
  const history: ConversationMessage[] = [{ role: 'assistant', text: 'Welcome.' }];

  return {
    callOrder,
    history,
    onConversationStarted: vi.fn(() => {
      callOrder.push('conversationStarted');
    }),
    onLevelOutcomeChanged: vi.fn((levelOutcome: 'win' | 'lose') => {
      callOrder.push(`levelOutcome:${levelOutcome}`);
    }),
    onWorldStateUpdated: vi.fn(() => {
      callOrder.push('worldStateUpdated');
    }),
    getCurrentWorldState: vi.fn(() => {
      callOrder.push('getCurrentWorldState');
      return createTestWorldState();
    }),
    getConversationHistory: vi.fn(() => {
      callOrder.push('getConversationHistory');
      return history;
    }),
  };
};

describe('createResultHandlerRegistry', () => {
  it('registers all supported result kinds', () => {
    const registry = createResultHandlerRegistry();

    expect(registry.guard).toBeTypeOf('function');
    expect(registry.npc).toBeTypeOf('function');
    expect(registry.door).toBeTypeOf('function');
    expect(registry.interactiveObject).toBeTypeOf('function');
  });

  it('applies conversational world updates before reading history and opening the conversation', () => {
    const registry = createResultHandlerRegistry();
    const config = createResultHandlerConfig();
    const updatedWorldState = createTestWorldState({
      actorConversationHistoryByActorId: {
        'guard-1': config.history,
      },
    });

    registry.guard?.(
      {
        kind: 'guard',
        targetId: 'guard-1',
        displayName: 'Test Guard',
        updatedWorldState,
        isConversational: true,
      },
      config,
    );

    expect(config.callOrder).toEqual([
      'worldStateUpdated',
      'getConversationHistory',
      'conversationStarted',
    ]);
  });

  it('keeps deterministic door and object side effects isolated by result kind', () => {
    const registry = createResultHandlerRegistry();
    const config = createResultHandlerConfig();
    const updatedWorldState = createTestWorldState({ levelOutcome: 'lose' });

    registry.door?.(
      {
        kind: 'door',
        targetId: 'door-1',
        levelOutcome: 'win',
        isConversational: false,
      },
      config,
    );
    registry.interactiveObject?.(
      {
        kind: 'interactiveObject',
        targetId: 'object-1',
        updatedWorldState,
        isConversational: false,
      },
      config,
    );

    expect(config.callOrder).toEqual(['levelOutcome:win', 'worldStateUpdated']);
    expect(config.onConversationStarted).not.toHaveBeenCalled();
    expect(config.getConversationHistory).not.toHaveBeenCalled();
    expect(config.getCurrentWorldState).not.toHaveBeenCalled();
  });
});