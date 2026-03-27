import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { LlmClient } from '../llm/client';
import type { Guard, Npc, Door, InteractiveObject, WorldState } from '../world/types';
import { createInteractionDispatcher } from './interactionDispatcher';

/**
 * Test suite for interaction dispatcher.
 * Verifies dispatch routing, handler registration, and regression parity.
 */

// Mock LLM client
const createMockLlmClient = (): LlmClient => ({
  complete: vi.fn().mockResolvedValue({ text: 'AI response' }),
});

// Utility to create minimal test world state
const createTestWorldState = (overrides?: Partial<WorldState>): WorldState => ({
  tick: 0,
  grid: { width: 10, height: 10, tileSize: 32 },
  player: {
    id: 'player',
    displayName: 'Player',
    position: { x: 0, y: 0 },
  },
  guards: [],
  doors: [],
  npcs: [],
  interactiveObjects: [],
  npcConversationHistoryByNpcId: {},
  levelOutcome: null,
  ...overrides,
});

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
    it('dispatches guard interactions', async () => {
      const dispatcher = createInteractionDispatcher({ llmClient });
      const guard = createTestGuard('guard-1');
      const worldState = createTestWorldState({ guards: [guard] });
      const target = { kind: 'guard' as const, target: guard };

      const result = await dispatcher.dispatch(target, worldState);

      expect(result.kind).toBe('guard');
      expect(result.targetId).toBe('guard-1');
      expect(result.isConversational).toBe(false); // Initial interaction
    });

    it('dispatches door interactions', async () => {
      const dispatcher = createInteractionDispatcher({ llmClient });
      const door = createTestDoor('door-1');
      const worldState = createTestWorldState({ doors: [door] });
      const target = { kind: 'door' as const, target: door };

      const result = await dispatcher.dispatch(target, worldState);

      expect(result.kind).toBe('door');
      expect(result.targetId).toBe('door-1');
      expect(result.isConversational).toBe(false);
    });

    it('dispatches npc interactions', async () => {
      const dispatcher = createInteractionDispatcher({ llmClient });
      const npc = createTestNpc('npc-1');
      const worldState = createTestWorldState({ npcs: [npc] });
      const target = { kind: 'npc' as const, target: npc };

      const result = await dispatcher.dispatch(target, worldState);

      expect(result.kind).toBe('npc');
      expect(result.targetId).toBe('npc-1');
      expect(result.isConversational).toBe(false); // Initial interaction
    });

    it('dispatches interactive object interactions', async () => {
      const dispatcher = createInteractionDispatcher({ llmClient });
      const obj = createTestObject('obj-1');
      const worldState = createTestWorldState({ interactiveObjects: [obj] });
      const target = { kind: 'interactiveObject' as const, target: obj };

      const result = await dispatcher.dispatch(target, worldState);

      expect(result.kind).toBe('interactiveObject');
      expect(result.targetId).toBe('obj-1');
      expect(result.isConversational).toBe(false);
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
        npcConversationHistoryByNpcId: { 'guard-1': [] },
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
        npcConversationHistoryByNpcId: { 'npc-1': [] },
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
        npcConversationHistoryByNpcId: { 'guard-1': [] },
      });
      const target = { kind: 'guard' as const, target: guard };

      const result = await dispatcher.dispatch(target, worldState, 'Hello');

      const history = result.updatedWorldState?.npcConversationHistoryByNpcId['guard-1'];
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
        npcConversationHistoryByNpcId: { 'npc-1': [] },
      });
      const target = { kind: 'npc' as const, target: npc };

      const result = await dispatcher.dispatch(target, worldState, 'Hello');

      const history = result.updatedWorldState?.npcConversationHistoryByNpcId['npc-1'];
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
      const fakeTarget = { kind: 'unknown' as const, target: createTestDoor('fake-1') } as any;
      const worldState = createTestWorldState();

      await expect(dispatcher.dispatch(fakeTarget, worldState)).rejects.toThrow(
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
});
