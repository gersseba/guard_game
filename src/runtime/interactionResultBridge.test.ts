import { describe, expect, it, vi } from 'vitest';
import { createRuntimeInteractionResultBridge } from './interactionResultBridge';
import type { InteractionDispatcher, InteractionHandlerResult } from '../interaction/interactionDispatcher';
import type { WorldState } from '../world/types';
import type { Guard } from '../world/types';
import type { LlmRequestError } from '../llm/client';

const createWorldState = (
  overrides?: Omit<Partial<WorldState>, 'player'> & { player?: Partial<WorldState['player']> },
): WorldState => {
  const base: WorldState = {
    tick: 0,
    grid: { width: 10, height: 10, tileSize: 32 },
    levelMetadata: {
      name: 'Bridge Test',
      premise: 'Runtime bridge fixture',
      goal: 'Verify runtime orchestration seams.',
    },
    levelObjective: 'Talk to guard',
    player: {
      id: 'player',
      displayName: 'Player',
      position: { x: 1, y: 1 },
      inventory: {
        items: [],
        selectedItem: null,
      },
    },
    guards: [
      {
        id: 'guard-1',
        displayName: 'Guard One',
        position: { x: 2, y: 1 },
        guardState: 'idle',
      },
    ],
    doors: [],
    npcs: [],
    interactiveObjects: [],
    actorConversationHistoryByActorId: {
      'guard-1': [
        { role: 'player', text: 'Hello?' },
        { role: 'assistant', text: 'State your purpose.' },
      ],
    },
    levelOutcome: null,
  };

  return {
    ...base,
    ...(overrides ?? {}),
    player: {
      ...base.player,
      ...(overrides?.player ?? {}),
    },
  };
};

const createInteractionDispatcherMock = (
  dispatchImplementation: (playerMessage?: string) => InteractionHandlerResult | Promise<InteractionHandlerResult>,
): InteractionDispatcher => {
  return {
    dispatch: vi.fn((target, worldState, playerMessage) => {
      void target;
      void worldState;
      return dispatchImplementation(playerMessage);
    }),
    resolveConversationalTarget: vi.fn((worldState: WorldState, targetId: string) => {
      const guard = worldState.guards.find((candidate: Guard) => candidate.id === targetId);
      if (!guard) {
        return null;
      }

      return {
        kind: 'guard' as const,
        target: guard,
      };
    }),
  };
};

describe('createRuntimeInteractionResultBridge', () => {
  it('opens the action modal path when an eligible target is adjacent', () => {
    const worldState = createWorldState();
    let currentState = worldState;
    const world = {
      getState: () => currentState,
      resetToState: vi.fn((nextState: WorldState) => {
        currentState = nextState;
      }),
    };

    const interactionDispatcher = createInteractionDispatcherMock(() => ({
      kind: 'guard',
      targetId: 'guard-1',
      displayName: 'Guard One',
      isConversational: false,
    }));

    const onActionModalStarted = vi.fn();
    const bridge = createRuntimeInteractionResultBridge({
      world,
      interactionDispatcher,
      onActionModalStarted,
      onConversationStarted: vi.fn(),
    });

    bridge.runInteractionIfRequested(worldState, [{ type: 'interact' }]);

    expect(onActionModalStarted).toHaveBeenCalledTimes(1);
    expect(onActionModalStarted).toHaveBeenCalledWith({
      targetId: 'guard-1',
      targetKind: 'guard',
      displayName: 'Guard One',
    });
    expect(interactionDispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('ignores interact commands after a level outcome has been set', () => {
    const worldState = createWorldState({ levelOutcome: 'win' });
    const interactionDispatcher = createInteractionDispatcherMock(() => ({
      kind: 'guard',
      targetId: 'guard-1',
      displayName: 'Guard One',
      isConversational: false,
    }));

    const bridge = createRuntimeInteractionResultBridge({
      world: {
        getState: () => worldState,
        resetToState: vi.fn(),
      },
      interactionDispatcher,
      onActionModalStarted: vi.fn(),
      onConversationStarted: vi.fn(),
    });

    bridge.runInteractionIfRequested(worldState, [{ type: 'interact' }]);

    expect(interactionDispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('routes async conversation sends and commits updated world state', async () => {
    const initialState = createWorldState();
    const updatedWorldState: WorldState = {
      ...initialState,
      actorConversationHistoryByActorId: {
        ...initialState.actorConversationHistoryByActorId,
        'guard-1': [
          { role: 'player', text: 'Hello?' },
          { role: 'assistant', text: 'State your purpose.' },
          { role: 'player', text: 'Can I pass?' },
          { role: 'assistant', text: 'Not yet.' },
        ],
      },
    };

    let worldState = initialState;
    const resetToState = vi.fn((nextState: WorldState) => {
      worldState = nextState;
    });

    const interactionDispatcher = createInteractionDispatcherMock((playerMessage) => {
      if (!playerMessage) {
        return {
          kind: 'guard',
          targetId: 'guard-1',
          displayName: 'Guard One',
          isConversational: false,
        };
      }

      return Promise.resolve({
        kind: 'guard',
        targetId: 'guard-1',
        displayName: 'Guard One',
        updatedWorldState,
        isConversational: true,
      });
    });

    const bridge = createRuntimeInteractionResultBridge({
      world: {
        getState: () => worldState,
        resetToState,
      },
      interactionDispatcher,
      onActionModalStarted: vi.fn(),
      onConversationStarted: vi.fn(),
    });

    const onAssistantMessage = vi.fn();
    await bridge.sendConversationMessage('guard-1', 'Can I pass?', onAssistantMessage);

    expect(onAssistantMessage).toHaveBeenCalledWith('Not yet.');
    expect(resetToState).toHaveBeenCalledWith(updatedWorldState);
  });

  it('returns false when action-modal chat target can no longer be resolved', () => {
    const worldState = createWorldState({ guards: [] });
    const interactionDispatcher = createInteractionDispatcherMock(() => ({
      kind: 'guard',
      targetId: 'guard-1',
      displayName: 'Guard One',
      isConversational: false,
    }));

    const bridge = createRuntimeInteractionResultBridge({
      world: {
        getState: () => worldState,
        resetToState: vi.fn(),
      },
      interactionDispatcher,
      onActionModalStarted: vi.fn(),
      onConversationStarted: vi.fn(),
    });

    const didStartConversation = bridge.openConversationForActionSession({
      targetId: 'guard-1',
      targetKind: 'guard',
      displayName: 'Guard One',
    });

    expect(didStartConversation).toBe(false);
    expect(interactionDispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('calls onLlmError and not onAssistantMessage when result carries llmError', async () => {
    const llmError: LlmRequestError = { kind: 'llm_request_error', message: 'Service unavailable.', statusCode: 503 };
    const initialState = createWorldState();
    const stateWithPlayerMessage: WorldState = {
      ...initialState,
      actorConversationHistoryByActorId: {
        ...initialState.actorConversationHistoryByActorId,
        'guard-1': [
          { role: 'player', text: 'Hello?' },
          { role: 'assistant', text: 'State your purpose.' },
          { role: 'player', text: 'Can I pass?' },
        ],
      },
    };

    let worldState = initialState;
    const resetToState = vi.fn((nextState: WorldState) => {
      worldState = nextState;
    });

    const interactionDispatcher = createInteractionDispatcherMock((playerMessage) => {
      if (!playerMessage) {
        return {
          kind: 'guard',
          targetId: 'guard-1',
          displayName: 'Guard One',
          isConversational: false,
        };
      }

      return Promise.resolve({
        kind: 'guard',
        targetId: 'guard-1',
        displayName: 'Guard One',
        updatedWorldState: stateWithPlayerMessage,
        isConversational: true,
        llmError,
      });
    });

    const bridge = createRuntimeInteractionResultBridge({
      world: { getState: () => worldState, resetToState },
      interactionDispatcher,
      onActionModalStarted: vi.fn(),
      onConversationStarted: vi.fn(),
    });

    const onAssistantMessage = vi.fn();
    const onLlmError = vi.fn();
    await bridge.sendConversationMessage('guard-1', 'Can I pass?', onAssistantMessage, onLlmError);

    expect(onAssistantMessage).not.toHaveBeenCalled();
    expect(onLlmError).toHaveBeenCalledWith(llmError);
    expect(resetToState).toHaveBeenCalledWith(stateWithPlayerMessage);
  });

  it('does not call onLlmError or reset state when result has no error', async () => {
    const initialState = createWorldState();
    const updatedWorldState: WorldState = {
      ...initialState,
      actorConversationHistoryByActorId: {
        ...initialState.actorConversationHistoryByActorId,
        'guard-1': [
          { role: 'player', text: 'Hello?' },
          { role: 'assistant', text: 'State your purpose.' },
          { role: 'player', text: 'Can I pass?' },
          { role: 'assistant', text: 'Not yet.' },
        ],
      },
    };

    let worldState = initialState;
    const resetToState = vi.fn((nextState: WorldState) => {
      worldState = nextState;
    });

    const interactionDispatcher = createInteractionDispatcherMock((playerMessage) => {
      if (!playerMessage) {
        return {
          kind: 'guard',
          targetId: 'guard-1',
          displayName: 'Guard One',
          isConversational: false,
        };
      }

      return Promise.resolve({
        kind: 'guard',
        targetId: 'guard-1',
        displayName: 'Guard One',
        updatedWorldState,
        isConversational: true,
      });
    });

    const bridge = createRuntimeInteractionResultBridge({
      world: { getState: () => worldState, resetToState },
      interactionDispatcher,
      onActionModalStarted: vi.fn(),
      onConversationStarted: vi.fn(),
    });

    const onAssistantMessage = vi.fn();
    const onLlmError = vi.fn();
    await bridge.sendConversationMessage('guard-1', 'Can I pass?', onAssistantMessage, onLlmError);

    expect(onLlmError).not.toHaveBeenCalled();
    expect(onAssistantMessage).toHaveBeenCalledWith('Not yet.');
    expect(resetToState).toHaveBeenCalledWith(updatedWorldState);
  });
});
