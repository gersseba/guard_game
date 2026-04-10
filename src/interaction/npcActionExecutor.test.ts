import { describe, expect, it } from 'vitest';
import type { WorldState } from '../world/types';
import { createNpcActionExecutor } from './npcActionExecutor';

const createWorldState = (overrides: Partial<WorldState> = {}): WorldState => {
  const baseState: WorldState = {
    tick: 1,
    grid: { width: 8, height: 8, tileSize: 32 },
    levelMetadata: {
      name: 'Test Level',
      premise: 'Executor coverage',
      goal: 'Validate deterministic NPC action execution',
    },
    player: {
      id: 'player-1',
      displayName: 'Hero',
      position: { x: 0, y: 0 },
      inventory: { items: [] },
    },
    npcs: [
      {
        id: 'npc-1',
        displayName: 'Archivist',
        position: { x: 2, y: 2 },
        npcType: 'archivist',
        dialogueContextKey: 'archivist_default',
        inventory: [
          {
            itemId: 'seal-key',
            displayName: 'Seal Key',
            sourceObjectId: 'npc-1',
            pickedUpAtTick: 0,
          },
          {
            itemId: 'gift-token',
            displayName: 'Gift Token',
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
      },
    ],
    guards: [],
    doors: [],
    interactiveObjects: [],
    actorConversationHistoryByActorId: {},
    levelOutcome: null,
  };

  return {
    ...baseState,
    ...overrides,
  };
};

describe('createNpcActionExecutor', () => {
  it('marks end_chat as successful and sets endedChat', () => {
    const executor = createNpcActionExecutor();
    const worldState = createWorldState();

    const result = executor.execute({
      npcId: 'npc-1',
      worldState,
      actions: [{ name: 'end_chat', arguments: { reason: 'farewell' } }],
    });

    expect(result.endedChat).toBe(true);
    expect(result.updatedWorldState).toEqual(worldState);
    expect(result.steps).toEqual([
      {
        index: 0,
        action: { name: 'end_chat', arguments: { reason: 'farewell' } },
        status: 'success',
        code: 'executed',
        message: 'farewell',
      },
    ]);
  });

  it('fails end_chat deterministically when the npc is missing', () => {
    const executor = createNpcActionExecutor();

    const result = executor.execute({
      npcId: 'missing-npc',
      worldState: createWorldState(),
      actions: [{ name: 'end_chat', arguments: {} }],
    });

    expect(result.endedChat).toBe(false);
    expect(result.steps[0]).toMatchObject({
      status: 'failed',
      code: 'npc_not_found',
    });
  });

  it('moves an npc to an unblocked target tile', () => {
    const executor = createNpcActionExecutor();

    const result = executor.execute({
      npcId: 'npc-1',
      worldState: createWorldState(),
      actions: [{ name: 'move', arguments: { x: 3, y: 2 } }],
    });

    expect(result.updatedWorldState.npcs[0].position).toEqual({ x: 3, y: 2 });
    expect(result.steps[0]).toMatchObject({
      status: 'success',
      code: 'executed',
    });
  });

  it('does not mutate world state when move target is blocked', () => {
    const executor = createNpcActionExecutor();
    const worldState = createWorldState({
      guards: [
        {
          id: 'guard-1',
          displayName: 'Gate Guard',
          position: { x: 3, y: 2 },
          guardState: 'idle',
        },
      ],
    });

    const result = executor.execute({
      npcId: 'npc-1',
      worldState,
      actions: [{ name: 'move', arguments: { x: 3, y: 2 } }],
    });

    expect(result.updatedWorldState).toEqual(worldState);
    expect(result.steps[0]).toMatchObject({
      status: 'failed',
      code: 'blocked',
    });
  });

  it('interacts with an adjacent door and applies the deterministic level outcome', () => {
    const executor = createNpcActionExecutor();
    const worldState = createWorldState({
      doors: [
        {
          id: 'door-safe',
          displayName: 'Safe Door',
          position: { x: 2, y: 3 },
          isOpen: false,
          isLocked: false,
          isSafe: true,
        },
      ],
    });

    const result = executor.execute({
      npcId: 'npc-1',
      worldState,
      actions: [{ name: 'interact', arguments: { targetId: 'door-safe' } }],
    });

    expect(result.updatedWorldState.levelOutcome).toBe('win');
    expect(result.steps[0]).toMatchObject({
      status: 'success',
      code: 'executed',
      targetId: 'door-safe',
      responseText: 'The door is closed.',
    });
  });

  it('fails interact when the target is not adjacent', () => {
    const executor = createNpcActionExecutor();
    const worldState = createWorldState({
      doors: [
        {
          id: 'door-far',
          displayName: 'Far Door',
          position: { x: 6, y: 6 },
          isOpen: false,
          isLocked: false,
        },
      ],
    });

    const result = executor.execute({
      npcId: 'npc-1',
      worldState,
      actions: [{ name: 'interact', arguments: { targetId: 'door-far' } }],
    });

    expect(result.updatedWorldState).toEqual(worldState);
    expect(result.steps[0]).toMatchObject({
      status: 'failed',
      code: 'not_adjacent',
      targetId: 'door-far',
    });
  });

  it('unlocks an adjacent door when the npc uses the required item', () => {
    const executor = createNpcActionExecutor();
    const worldState = createWorldState({
      doors: [
        {
          id: 'seal-door',
          displayName: 'Seal Door',
          position: { x: 2, y: 3 },
          isOpen: false,
          isLocked: true,
          requiredItemId: 'seal-key',
        },
      ],
    });

    const result = executor.execute({
      npcId: 'npc-1',
      worldState,
      actions: [{ name: 'use_item', arguments: { itemId: 'seal-key', targetId: 'seal-door' } }],
    });

    expect(result.updatedWorldState.doors[0]).toMatchObject({
      isOpen: true,
      isLocked: false,
    });
    expect(result.steps[0]).toMatchObject({
      status: 'success',
      code: 'executed',
      targetId: 'seal-door',
    });
  });

  it('fails use_item when the npc does not have the requested item', () => {
    const executor = createNpcActionExecutor();
    const worldState = createWorldState({
      doors: [
        {
          id: 'seal-door',
          displayName: 'Seal Door',
          position: { x: 2, y: 3 },
          isOpen: false,
          isLocked: true,
          requiredItemId: 'seal-key',
        },
      ],
    });

    const result = executor.execute({
      npcId: 'npc-1',
      worldState,
      actions: [{ name: 'use_item', arguments: { itemId: 'missing-key', targetId: 'seal-door' } }],
    });

    expect(result.updatedWorldState).toEqual(worldState);
    expect(result.steps[0]).toMatchObject({
      status: 'failed',
      code: 'item_missing',
    });
  });

  it('continues ordered execution after a failed step and preserves successful later mutations', () => {
    const executor = createNpcActionExecutor();
    const worldState = createWorldState({
      doors: [
        {
          id: 'seal-door',
          displayName: 'Seal Door',
          position: { x: 3, y: 3 },
          isOpen: false,
          isLocked: true,
          requiredItemId: 'seal-key',
        },
      ],
      interactiveObjects: [
        {
          id: 'mechanism-1',
          displayName: 'Mechanism',
          position: { x: 4, y: 3 },
          objectType: 'mechanism',
          interactionType: 'use',
          state: 'idle',
          idleMessage: 'The mechanism activates.',
          usedMessage: 'The mechanism is already active.',
          capabilities: { isActivatable: true },
        },
      ],
    });

    const result = executor.execute({
      npcId: 'npc-1',
      worldState,
      actions: [
        { name: 'move', arguments: { x: 3, y: 2 } },
        { name: 'interact', arguments: { targetId: 'missing-target' } },
        { name: 'move', arguments: { x: 3, y: 3 } },
        { name: 'use_item', arguments: { itemId: 'seal-key', targetId: 'seal-door' } },
        { name: 'move', arguments: { x: 4, y: 2 } },
        { name: 'interact', arguments: { targetId: 'mechanism-1' } },
      ],
    });

    expect(result.steps.map((step) => step.code)).toEqual([
      'executed',
      'target_not_found',
      'blocked',
      'executed',
      'executed',
      'executed',
    ]);
    expect(result.updatedWorldState.doors[0]).toMatchObject({ isOpen: true, isLocked: false });
    expect(result.updatedWorldState.interactiveObjects[0].state).toBe('used');
    expect(result.updatedWorldState.npcs[0].position).toEqual({ x: 4, y: 2 });
  });
});