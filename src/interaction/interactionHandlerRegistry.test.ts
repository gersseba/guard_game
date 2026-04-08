import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LlmClient } from '../llm/client';
import type { Door, Guard, InteractiveObject, Npc, WorldState } from '../world/types';
import { createInteractionHandlerRegistry } from './interactionHandlerRegistry';
import { isPromiseLike } from './interactionDispatcherTypes';

const createMockLlmClient = (): LlmClient => ({
  complete: vi.fn().mockResolvedValue({ text: 'AI response' }),
});

const createTestWorldState = (
  overrides?: Omit<Partial<WorldState>, 'player'> & { player?: Partial<WorldState['player']> },
): WorldState => {
  const baseState: WorldState = {
    tick: 0,
    grid: { width: 10, height: 10, tileSize: 32 },
    levelMetadata: {
      name: 'Registry Test',
      premise: 'Fixture for interaction handler registry tests.',
      goal: 'Keep handler routing stable by kind.',
    },
    levelObjective: 'Exercise interaction handlers.',
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
  capabilities: {
    containsItems: true,
  },
});

describe('createInteractionHandlerRegistry', () => {
  let llmClient: LlmClient;

  beforeEach(() => {
    llmClient = createMockLlmClient();
  });

  it('registers all supported interaction kinds', () => {
    const registry = createInteractionHandlerRegistry(llmClient);

    expect(registry.guard).toBeTypeOf('function');
    expect(registry.npc).toBeTypeOf('function');
    expect(registry.door).toBeTypeOf('function');
    expect(registry.interactiveObject).toBeTypeOf('function');
  });

  it('preserves sync-versus-async semantics for conversational handlers', async () => {
    const registry = createInteractionHandlerRegistry(llmClient);
    const guard = createTestGuard('guard-1');
    const npc = createTestNpc('npc-1');
    const worldState = createTestWorldState({
      guards: [guard],
      npcs: [npc],
      actorConversationHistoryByActorId: { 'guard-1': [], 'npc-1': [] },
    });

    const guardOpenResult = registry.guard?.({ kind: 'guard', target: guard }, worldState);
    const guardTurnResult = registry.guard?.({ kind: 'guard', target: guard }, worldState, 'hello');
    const npcOpenResult = registry.npc?.({ kind: 'npc', target: npc }, worldState);
    const npcTurnResult = registry.npc?.({ kind: 'npc', target: npc }, worldState, 'hello');

    expect(isPromiseLike(guardOpenResult)).toBe(false);
    expect(isPromiseLike(guardTurnResult)).toBe(true);
    expect(isPromiseLike(npcOpenResult)).toBe(false);
    expect(isPromiseLike(npcTurnResult)).toBe(true);

    if (!guardTurnResult || !npcTurnResult) {
      throw new Error('Expected conversational handlers to be registered.');
    }

    await expect(guardTurnResult).resolves.toMatchObject({ kind: 'guard', isConversational: true });
    await expect(npcTurnResult).resolves.toMatchObject({ kind: 'npc', isConversational: true });
  });

  it('keeps deterministic door and object handlers synchronous', () => {
    const registry = createInteractionHandlerRegistry(llmClient);
    const door = createTestDoor('door-1');
    const interactiveObject = createTestObject('object-1');
    const worldState = createTestWorldState({
      doors: [door],
      interactiveObjects: [interactiveObject],
    });

    const doorResult = registry.door?.({ kind: 'door', target: door }, worldState);
    const objectResult = registry.interactiveObject?.(
      { kind: 'interactiveObject', target: interactiveObject },
      worldState,
    );

    expect(isPromiseLike(doorResult)).toBe(false);
    expect(isPromiseLike(objectResult)).toBe(false);
    expect(doorResult).toMatchObject({ kind: 'door', targetId: 'door-1', isConversational: false });
    expect(objectResult).toMatchObject({
      kind: 'interactiveObject',
      targetId: 'object-1',
      isConversational: false,
    });
  });
});