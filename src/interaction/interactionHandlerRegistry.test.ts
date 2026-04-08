import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LlmClient } from '../llm/client';
import { createInteractionHandlerRegistry } from './interactionHandlerRegistry';
import { isPromiseLike } from './interactionDispatcherTypes';
import {
  createTestDoor,
  createTestGuard,
  createTestNpc,
  createTestObject,
  createTestWorldState,
} from '../test-support/worldState';

const createMockLlmClient = (): LlmClient => ({
  complete: vi.fn().mockResolvedValue({ text: 'AI response' }),
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