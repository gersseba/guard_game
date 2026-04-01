import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { LlmClient } from '../llm/client';
import type { Guard, Npc, Door, InteractiveObject, WorldState } from '../world/types';
import {
  createInteractionDispatcher,
  createResultDispatcher,
  isPromiseLike,
} from './interactionDispatcher';

/**
 * Test suite for interaction dispatcher.
 * Verifies dispatch routing, handler registration, and regression parity.
 */

// Mock LLM client
const createMockLlmClient = (): LlmClient => ({
  complete: vi.fn().mockResolvedValue({ text: 'AI response' }),
});

// Utility to create minimal test world state
const createTestWorldState = (
  overrides?: Omit<Partial<WorldState>, 'player'> & { player?: Partial<WorldState['player']> },
): WorldState => {
  const baseState: WorldState = {
    tick: 0,
    grid: { width: 10, height: 10, tileSize: 32 },
    levelObjective: 'Find a way out.',
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

// Utility to create test entities
const createTestGuard = (id: string): Guard => ({
  id,
  displayName: 'Test Guard',
  position: { x: 1, y: 0 },
  guardState: 'idle',
});

const createTestNpc = (id: string): Npc => ({
  id,
  displayName: 'Test NPC',
  position: { x: 1, y: 0 },
  dialogueContextKey: 'test',
  npcType: 'scholar',
});

const createTestDoor = (id: string): Door => ({
  id,
  displayName: 'Test Door',
  position: { x: 1, y: 0 },
  doorState: 'open',
});

const createTestObject = (id: string): InteractiveObject => ({
  id,
  displayName: 'Test Object',
  position: { x: 1, y: 0 },
  objectType: 'supply-crate',
  interactionType: 'inspect',
  state: 'idle',
  idleMessage: 'You see a crate.',
});

describe('InteractionDispatcher', () => {
  let llmClient: LlmClient;

  beforeEach(() => {
    llmClient = createMockLlmClient();
  });

  describe('dispatch routing by kind', () => {
    it('dispatches guard interactions synchronously when no player message is provided', () => {
      const dispatcher = createInteractionDispatcher({ llmClient });
      const guard = createTestGuard('guard-1');
      const worldState = createTestWorldState({ guards: [guard] });
      const target = { kind: 'guard' as const, target: guard };

      const result = dispatcher.dispatch(target, worldState);

      expect(isPromiseLike(result)).toBe(false);
      if (isPromiseLike(result)) {
        throw new Error('Expected guard open dispatch to remain synchronous');
      }

      expect(result.kind).toBe('guard');
      expect(result.targetId).toBe('guard-1');
      expect(result.isConversational).toBe(false); // Initial interaction
    });

    it('sets guard facing on interaction start from player approach direction', () => {
      const dispatcher = createInteractionDispatcher({ llmClient });

      const westGuard = createTestGuard('guard-west');
      const eastGuard = createTestGuard('guard-east');
      const northGuard = createTestGuard('guard-north');
      const southGuard = createTestGuard('guard-south');

      const fromWestState = createTestWorldState({
        player: { id: 'player', displayName: 'Player', position: { x: 0, y: 0 } },
        guards: [{ ...westGuard, position: { x: 1, y: 0 } }],
      });
      const fromEastState = createTestWorldState({
        player: { id: 'player', displayName: 'Player', position: { x: 2, y: 0 } },
        guards: [{ ...eastGuard, position: { x: 1, y: 0 } }],
      });
      const fromNorthState = createTestWorldState({
        player: { id: 'player', displayName: 'Player', position: { x: 1, y: -1 } },
        guards: [{ ...northGuard, position: { x: 1, y: 0 } }],
      });
      const fromSouthState = createTestWorldState({
        player: { id: 'player', displayName: 'Player', position: { x: 1, y: 1 } },
        guards: [{ ...southGuard, position: { x: 1, y: 0 } }],
      });

      const westResult = dispatcher.dispatch(
        { kind: 'guard' as const, target: fromWestState.guards[0] },
        fromWestState,
      );
      const eastResult = dispatcher.dispatch(
        { kind: 'guard' as const, target: fromEastState.guards[0] },
        fromEastState,
      );
      const northResult = dispatcher.dispatch(
        { kind: 'guard' as const, target: fromNorthState.guards[0] },
        fromNorthState,
      );
      const southResult = dispatcher.dispatch(
        { kind: 'guard' as const, target: fromSouthState.guards[0] },
        fromSouthState,
      );

      expect(isPromiseLike(westResult)).toBe(false);
      expect(isPromiseLike(eastResult)).toBe(false);
      expect(isPromiseLike(northResult)).toBe(false);
      expect(isPromiseLike(southResult)).toBe(false);
      if (
        isPromiseLike(westResult) ||
        isPromiseLike(eastResult) ||
        isPromiseLike(northResult) ||
        isPromiseLike(southResult)
      ) {
        throw new Error('Expected guard interaction start to remain synchronous.');
      }

      expect(westResult.updatedWorldState?.guards[0]?.facingDirection).toBe('left');
      expect(eastResult.updatedWorldState?.guards[0]?.facingDirection).toBe('right');
      expect(northResult.updatedWorldState?.guards[0]?.facingDirection).toBe('away');
      expect(southResult.updatedWorldState?.guards[0]?.facingDirection).toBe('front');
    });

    it('keeps guard facing stable during an active interaction turn', async () => {
      const complete = llmClient.complete as ReturnType<typeof vi.fn>;
      complete.mockResolvedValue({ text: 'At your service.' });

      const dispatcher = createInteractionDispatcher({ llmClient });
      const guard = { ...createTestGuard('guard-1'), position: { x: 1, y: 0 } };
      const initialState = createTestWorldState({
        player: { id: 'player', displayName: 'Player', position: { x: 0, y: 0 } },
        guards: [guard],
        actorConversationHistoryByActorId: { 'guard-1': [] },
      });

      const openResult = dispatcher.dispatch({ kind: 'guard', target: guard }, initialState);
      if (isPromiseLike(openResult)) {
        throw new Error('Expected interaction start to be synchronous.');
      }

      const openUpdatedState = openResult.updatedWorldState;
      expect(openUpdatedState?.guards[0]?.facingDirection).toBe('left');
      if (!openUpdatedState) {
        throw new Error('Expected interaction start to provide updated world state.');
      }

      const movedPlayerState = {
        ...openUpdatedState,
        player: {
          ...openUpdatedState.player,
          position: { x: 1, y: 1 },
        },
      };

      const conversationalResult = dispatcher.dispatch(
        { kind: 'guard', target: movedPlayerState.guards[0] },
        movedPlayerState,
        'hello',
      );
      if (!isPromiseLike(conversationalResult)) {
        throw new Error('Expected conversational guard interaction to be async.');
      }

      const resolved = await conversationalResult;
      expect(resolved.updatedWorldState?.guards[0]?.facingDirection).toBe('left');
    });

    it('dispatches door interactions', async () => {
      const dispatcher = createInteractionDispatcher({ llmClient });
      const door = createTestDoor('door-1');
      const worldState = createTestWorldState({ doors: [door] });
      const target = { kind: 'door' as const, target: door };

      const result = dispatcher.dispatch(target, worldState);

      expect(isPromiseLike(result)).toBe(false);
      if (isPromiseLike(result)) {
        throw new Error('Expected door dispatch to remain synchronous');
      }

      expect(result.kind).toBe('door');
      expect(result.targetId).toBe('door-1');
      expect(result.isConversational).toBe(false);
    });

    it('dispatches npc interactions synchronously when no player message is provided', () => {
      const dispatcher = createInteractionDispatcher({ llmClient });
      const npc = createTestNpc('npc-1');
      const worldState = createTestWorldState({ npcs: [npc] });
      const target = { kind: 'npc' as const, target: npc };

      const result = dispatcher.dispatch(target, worldState);

      expect(isPromiseLike(result)).toBe(false);
      if (isPromiseLike(result)) {
        throw new Error('Expected npc open dispatch to remain synchronous');
      }

      expect(result.kind).toBe('npc');
      expect(result.targetId).toBe('npc-1');
      expect(result.isConversational).toBe(false); // Initial interaction
    });

    it('dispatches interactive object interactions', async () => {
      const dispatcher = createInteractionDispatcher({ llmClient });
      const obj = createTestObject('obj-1');
      const worldState = createTestWorldState({ interactiveObjects: [obj] });
      const target = { kind: 'interactiveObject' as const, target: obj };

      const result = dispatcher.dispatch(target, worldState);

      expect(isPromiseLike(result)).toBe(false);
      if (isPromiseLike(result)) {
        throw new Error('Expected interactive object dispatch to remain synchronous');
      }

      expect(result.kind).toBe('interactiveObject');
      expect(result.targetId).toBe('obj-1');
      expect(result.isConversational).toBe(false);
    });

    it('dispatches guard interactions asynchronously when player message is provided', async () => {
      const dispatcher = createInteractionDispatcher({ llmClient });
      const guard = createTestGuard('guard-1');
      const worldState = createTestWorldState({
        guards: [guard],
        actorConversationHistoryByActorId: { 'guard-1': [] },
      });
      const target = { kind: 'guard' as const, target: guard };

      const result = dispatcher.dispatch(target, worldState, 'Hello guard');

      expect(isPromiseLike(result)).toBe(true);
      if (!isPromiseLike(result)) {
        throw new Error('Expected guard conversational dispatch to be asynchronous');
      }

      const resolved = await result;
      expect(resolved.kind).toBe('guard');
      expect(resolved.targetId).toBe('guard-1');
      expect(resolved.isConversational).toBe(true);
    });

    it('dispatches npc interactions asynchronously when player message is provided', async () => {
      const dispatcher = createInteractionDispatcher({ llmClient });
      const npc = createTestNpc('npc-1');
      const worldState = createTestWorldState({
        npcs: [npc],
        actorConversationHistoryByActorId: { 'npc-1': [] },
      });
      const target = { kind: 'npc' as const, target: npc };

      const result = dispatcher.dispatch(target, worldState, 'Hello npc');

      expect(isPromiseLike(result)).toBe(true);
      if (!isPromiseLike(result)) {
        throw new Error('Expected npc conversational dispatch to be asynchronous');
      }

      const resolved = await result;
      expect(resolved.kind).toBe('npc');
      expect(resolved.targetId).toBe('npc-1');
      expect(resolved.isConversational).toBe(true);
    });
  });

  describe('conversational target resolution', () => {
    it('resolves guard and npc targets by actor id through dispatcher registry', () => {
      const dispatcher = createInteractionDispatcher({ llmClient });
      const guard = createTestGuard('guard-1');
      const npc = createTestNpc('npc-1');
      const worldState = createTestWorldState({ guards: [guard], npcs: [npc] });

      const guardTarget = dispatcher.resolveConversationalTarget(worldState, 'guard-1');
      const npcTarget = dispatcher.resolveConversationalTarget(worldState, 'npc-1');
      const missingTarget = dispatcher.resolveConversationalTarget(worldState, 'missing');

      expect(guardTarget).toMatchObject({ kind: 'guard', target: guard });
      expect(npcTarget).toMatchObject({ kind: 'npc', target: npc });
      expect(missingTarget).toBeNull();
    });
  });

  describe('handler result shape', () => {
    it('door handler returns expected result shape', async () => {
      const dispatcher = createInteractionDispatcher({ llmClient });
      const door = createTestDoor('door-1');
      const worldState = createTestWorldState({ doors: [door] });
      const target = { kind: 'door' as const, target: door };

      const result = await dispatcher.dispatch(target, worldState);

      expect(result).toMatchObject({
        kind: 'door',
        targetId: 'door-1',
        responseText: expect.any(String),
        isConversational: false,
      });
    });

    it('object handler returns expected result shape', async () => {
      const dispatcher = createInteractionDispatcher({ llmClient });
      const obj = createTestObject('obj-1');
      const worldState = createTestWorldState({ interactiveObjects: [obj] });
      const target = { kind: 'interactiveObject' as const, target: obj };

      const result = await dispatcher.dispatch(target, worldState);

      expect(result).toMatchObject({
        kind: 'interactiveObject',
        targetId: 'obj-1',
        responseText: expect.any(String),
        updatedWorldState: expect.any(Object),
        isConversational: false,
      });
    });

    it('guard handler returns conversational result when player message provided', async () => {
      const dispatcher = createInteractionDispatcher({ llmClient });
      const guard = createTestGuard('guard-1');
      const worldState = createTestWorldState({
        guards: [guard],
        actorConversationHistoryByActorId: { 'guard-1': [] },
      });
      const target = { kind: 'guard' as const, target: guard };

      const result = await dispatcher.dispatch(target, worldState, 'Hello guard');

      expect(result).toMatchObject({
        kind: 'guard',
        targetId: 'guard-1',
        isConversational: true,
        updatedWorldState: expect.any(Object),
      });
    });

    it('npc handler returns conversational result when player message provided', async () => {
      const dispatcher = createInteractionDispatcher({ llmClient });
      const npc = createTestNpc('npc-1');
      const worldState = createTestWorldState({
        npcs: [npc],
        actorConversationHistoryByActorId: { 'npc-1': [] },
      });
      const target = { kind: 'npc' as const, target: npc };

      const result = await dispatcher.dispatch(target, worldState, 'Hello npc');

      expect(result).toMatchObject({
        kind: 'npc',
        targetId: 'npc-1',
        isConversational: true,
        updatedWorldState: expect.any(Object),
      });
    });
  });

  describe('regression parity', () => {
    it('door with outcome updates world state with levelOutcome', async () => {
      const dispatcher = createInteractionDispatcher({ llmClient });
      const door: Door = {
        ...createTestDoor('door-1'),
        outcome: 'safe',
      };
      const worldState = createTestWorldState({ doors: [door] });
      const target = { kind: 'door' as const, target: door };

      const result = await dispatcher.dispatch(target, worldState);

      expect(result.levelOutcome).toBe('win');
    });

    it('door without outcome has no levelOutcome', async () => {
      const dispatcher = createInteractionDispatcher({ llmClient });
      const door = createTestDoor('door-1');
      const worldState = createTestWorldState({ doors: [door] });
      const target = { kind: 'door' as const, target: door };

      const result = await dispatcher.dispatch(target, worldState);

      expect(result.levelOutcome).toBe(null);
    });

    it('interactive object first use sets levelOutcome', async () => {
      const dispatcher = createInteractionDispatcher({ llmClient });
      const obj: InteractiveObject = {
        ...createTestObject('obj-1'),
        firstUseOutcome: 'lose',
      };
      const worldState = createTestWorldState({ interactiveObjects: [obj] });
      const target = { kind: 'interactiveObject' as const, target: obj };

      const result = await dispatcher.dispatch(target, worldState);

      expect(result.updatedWorldState?.levelOutcome).toBe('lose');
    });

    it('interactive object state transitions to used', async () => {
      const dispatcher = createInteractionDispatcher({ llmClient });
      const obj = createTestObject('obj-1');
      const worldState = createTestWorldState({ interactiveObjects: [obj] });
      const target = { kind: 'interactiveObject' as const, target: obj };

      const result = await dispatcher.dispatch(target, worldState);

      const updatedObj = result.updatedWorldState?.interactiveObjects?.[0];
      expect(updatedObj?.state).toBe('used');
    });

    it('guard handler updates conversation history', async () => {
      const dispatcher = createInteractionDispatcher({ llmClient });
      const guard = createTestGuard('guard-1');
      const worldState = createTestWorldState({
        guards: [guard],
        actorConversationHistoryByActorId: { 'guard-1': [] },
      });
      const target = { kind: 'guard' as const, target: guard };

      const result = await dispatcher.dispatch(target, worldState, 'Hello');

      const history = result.updatedWorldState?.actorConversationHistoryByActorId['guard-1'];
      expect(history).toBeDefined();
      expect(history?.length).toBeGreaterThan(0);
      // Verify structure: player message then assistant response
      expect(history?.[0]?.role).toBe('player');
      expect(history?.[1]?.role).toBe('assistant');
    });

    it('npc handler updates conversation history', async () => {
      const dispatcher = createInteractionDispatcher({ llmClient });
      const npc = createTestNpc('npc-1');
      const worldState = createTestWorldState({
        npcs: [npc],
        actorConversationHistoryByActorId: { 'npc-1': [] },
      });
      const target = { kind: 'npc' as const, target: npc };

      const result = await dispatcher.dispatch(target, worldState, 'Hello');

      const history = result.updatedWorldState?.actorConversationHistoryByActorId['npc-1'];
      expect(history).toBeDefined();
      expect(history?.length).toBeGreaterThan(0);
      // Verify structure: player message then assistant response
      expect(history?.[0]?.role).toBe('player');
      expect(history?.[1]?.role).toBe('assistant');
    });
  });

  describe('error handling', () => {
    it('throws error for unknown handler kind', async () => {
      const dispatcher = createInteractionDispatcher({ llmClient });
      const fakeTarget = {
        kind: 'unknown' as const,
        target: createTestDoor('fake-1'),
      } as unknown as Parameters<typeof dispatcher.dispatch>[0];
      const worldState = createTestWorldState();

      expect(() => dispatcher.dispatch(fakeTarget, worldState)).toThrow(
        'No handler registered for kind: unknown',
      );
    });
  });

  describe('handler isolation', () => {
    it('each dispatch call is independent', async () => {
      const dispatcher = createInteractionDispatcher({ llmClient });
      const door1 = createTestDoor('door-1');
      const door2 = createTestDoor('door-2');
      const worldState = createTestWorldState({ doors: [door1, door2] });

      const result1 = await dispatcher.dispatch(
        { kind: 'door' as const, target: door1 },
        worldState,
      );
      const result2 = await dispatcher.dispatch(
        { kind: 'door' as const, target: door2 },
        worldState,
      );

      expect(result1.targetId).toBe('door-1');
      expect(result2.targetId).toBe('door-2');
    });
  });

  describe('result dispatcher timing parity', () => {
    it('door and interactive object results never trigger conversation start callbacks', () => {
      const onConversationStarted = vi.fn();
      const dispatcher = createResultDispatcher({
        onConversationStarted,
        onLevelOutcomeChanged: vi.fn(),
        onWorldStateUpdated: vi.fn(),
        getCurrentWorldState: () => createTestWorldState(),
        getConversationHistory: () => [],
      });

      dispatcher.dispatch({
        kind: 'door',
        targetId: 'door-1',
        isConversational: false,
        levelOutcome: null,
      });
      dispatcher.dispatch({
        kind: 'interactiveObject',
        targetId: 'object-1',
        isConversational: false,
      });

      expect(onConversationStarted).not.toHaveBeenCalled();
    });

    it('applies door level outcome callback synchronously', () => {
      const callbackOrder: string[] = [];
      const dispatcher = createResultDispatcher({
        onConversationStarted: () => {
          callbackOrder.push('conversation');
        },
        onLevelOutcomeChanged: (levelOutcome: 'win' | 'lose') => {
          callbackOrder.push(`outcome:${levelOutcome}`);
        },
        onWorldStateUpdated: () => {
          callbackOrder.push('worldStateUpdated');
        },
        getCurrentWorldState: () => createTestWorldState(),
        getConversationHistory: () => [],
      });

      callbackOrder.push('before-dispatch');
      dispatcher.dispatch({
        kind: 'door',
        targetId: 'door-1',
        isConversational: false,
        levelOutcome: 'win',
      });
      callbackOrder.push('after-dispatch');

      expect(callbackOrder).toEqual(['before-dispatch', 'outcome:win', 'after-dispatch']);
    });

    it('applies interactive object world state update synchronously', () => {
      const callbackOrder: string[] = [];
      const updatedWorldState = createTestWorldState({
        interactiveObjects: [
          {
            ...createTestObject('obj-1'),
            state: 'used',
          },
        ],
      });

      const dispatcher = createResultDispatcher({
        onConversationStarted: () => {
          callbackOrder.push('conversation');
        },
        onLevelOutcomeChanged: () => {
          callbackOrder.push('outcome');
        },
        onWorldStateUpdated: () => {
          callbackOrder.push('worldStateUpdated');
        },
        getCurrentWorldState: () => createTestWorldState(),
        getConversationHistory: () => [],
      });

      callbackOrder.push('before-dispatch');
      dispatcher.dispatch({
        kind: 'interactiveObject',
        targetId: 'obj-1',
        isConversational: false,
        updatedWorldState,
      });
      callbackOrder.push('after-dispatch');

      expect(callbackOrder).toEqual(['before-dispatch', 'worldStateUpdated', 'after-dispatch']);
    });

    it('applies guard conversational open callback synchronously in dispatch order', () => {
      const callbackOrder: string[] = [];
      const dispatcher = createResultDispatcher({
        onConversationStarted: () => {
          callbackOrder.push('conversation');
        },
        onLevelOutcomeChanged: () => {
          callbackOrder.push('outcome');
        },
        onWorldStateUpdated: () => {
          callbackOrder.push('worldStateUpdated');
        },
        getCurrentWorldState: () => createTestWorldState(),
        getConversationHistory: () => [],
      });

      callbackOrder.push('before-dispatch');
      dispatcher.dispatch({
        kind: 'guard',
        targetId: 'guard-1',
        displayName: 'Test Guard',
        isConversational: false,
      });
      callbackOrder.push('after-dispatch');

      expect(callbackOrder).toEqual(['before-dispatch', 'conversation', 'after-dispatch']);
    });

    it('applies npc conversational open callback synchronously in dispatch order', () => {
      const callbackOrder: string[] = [];
      const dispatcher = createResultDispatcher({
        onConversationStarted: () => {
          callbackOrder.push('conversation');
        },
        onLevelOutcomeChanged: () => {
          callbackOrder.push('outcome');
        },
        onWorldStateUpdated: () => {
          callbackOrder.push('worldStateUpdated');
        },
        getCurrentWorldState: () => createTestWorldState(),
        getConversationHistory: () => [],
      });

      callbackOrder.push('before-dispatch');
      dispatcher.dispatch({
        kind: 'npc',
        targetId: 'npc-1',
        displayName: 'Test NPC',
        isConversational: false,
      });
      callbackOrder.push('after-dispatch');

      expect(callbackOrder).toEqual(['before-dispatch', 'conversation', 'after-dispatch']);
    });
  });
});
