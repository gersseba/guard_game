import { describe, expect, it } from 'vitest';
import { createDefaultItemUseResolver } from './itemUse';
import type { WorldState } from '../world/types';

const createTestWorldState = (overrides?: Partial<WorldState>): WorldState => {
  const baseState: WorldState = {
    tick: 100,
    grid: { width: 10, height: 10, tileSize: 32 },
    levelMetadata: {
      name: 'Test Level',
      premise: 'Test fixture for item use resolution',
      goal: 'Validate deterministic guard and object rules',
    },
    player: {
      id: 'player-1',
      displayName: 'Hero',
      position: { x: 5, y: 5 },
      inventory: {
        items: [],
      },
    },
    npcs: [],
    doors: [],
    guards: [],
    interactiveObjects: [],
    actorConversationHistoryByActorId: {},
    levelOutcome: null,
  };

  return { ...baseState, ...overrides };
};

describe('itemUseResolver', () => {
  const resolver = createDefaultItemUseResolver();

  it('returns no-selection when player has no selected item', () => {
    const worldState = createTestWorldState();

    const event = resolver.resolveItemUseAttempt({
      worldState,
      commandIndex: 0,
    });

    expect(event.result).toBe('no-selection');
    expect(event.selectedItem).toBeNull();
    expect(event.target).toBeNull();
  });

  it('returns no-target when no adjacent target exists', () => {
    const worldState = createTestWorldState({
      player: {
        id: 'player-1',
        displayName: 'Hero',
        position: { x: 5, y: 5 },
        inventory: {
          items: [{ itemId: 'gift-token', displayName: 'Gift Token', sourceObjectId: 'obj-1', pickedUpAtTick: 10 }],
          selectedItem: { slotIndex: 0, itemId: 'gift-token' },
        },
      },
    });

    const event = resolver.resolveItemUseAttempt({
      worldState,
      commandIndex: 1,
    });

    expect(event.result).toBe('no-target');
    expect(event.target).toBeNull();
  });

  it('returns no-target when adjacent target is a door (door item-use is out of scope)', () => {
    const worldState = createTestWorldState({
      player: {
        id: 'player-1',
        displayName: 'Hero',
        position: { x: 5, y: 5 },
        inventory: {
          items: [{ itemId: 'gift-token', displayName: 'Gift Token', sourceObjectId: 'obj-1', pickedUpAtTick: 10 }],
          selectedItem: { slotIndex: 0, itemId: 'gift-token' },
        },
      },
      doors: [
        {
          id: 'door-1',
          displayName: 'West Door',
          position: { x: 5, y: 6 },
          doorState: 'locked',
        },
      ],
    });

    const event = resolver.resolveItemUseAttempt({
      worldState,
      commandIndex: 2,
    });

    expect(event.result).toBe('no-target');
    expect(event.target).toBeNull();
  });

  it('returns no-rule when guard has no matching itemUseRules entry', () => {
    const worldState = createTestWorldState({
      player: {
        id: 'player-1',
        displayName: 'Hero',
        position: { x: 5, y: 5 },
        inventory: {
          items: [{ itemId: 'apple', displayName: 'Apple', sourceObjectId: 'obj-1', pickedUpAtTick: 10 }],
          selectedItem: { slotIndex: 0, itemId: 'apple' },
        },
      },
      guards: [
        {
          id: 'guard-1',
          displayName: 'Gate Guard',
          position: { x: 5, y: 6 },
          guardState: 'idle',
          itemUseRules: {
            'gift-token': {
              allowed: true,
              responseText: 'Accepted.',
            },
          },
        },
      ],
    });

    const event = resolver.resolveItemUseAttempt({ worldState, commandIndex: 3 });

    expect(event.result).toBe('no-rule');
    expect(event.target).toEqual({ kind: 'guard', targetId: 'guard-1' });
  });

  it('returns success and affected guard fields when guard rule allows selected item', () => {
    const worldState = createTestWorldState({
      player: {
        id: 'player-1',
        displayName: 'Hero',
        position: { x: 5, y: 5 },
        inventory: {
          items: [{ itemId: 'gift-token', displayName: 'Gift Token', sourceObjectId: 'obj-1', pickedUpAtTick: 10 }],
          selectedItem: { slotIndex: 0, itemId: 'gift-token' },
        },
      },
      guards: [
        {
          id: 'guard-1',
          displayName: 'Gate Guard',
          position: { x: 5, y: 6 },
          guardState: 'idle',
          itemUseRules: {
            'gift-token': {
              allowed: true,
              responseText: 'Pass granted.',
            },
          },
        },
      ],
    });

    const event = resolver.resolveItemUseAttempt({ worldState, commandIndex: 4 });

    expect(event.result).toBe('success');
    expect(event.target).toEqual({ kind: 'guard', targetId: 'guard-1' });
    expect(event.affectedEntityType).toBe('guard');
    expect(event.affectedEntityId).toBe('guard-1');
    expect(event.ruleResponseText).toBe('Pass granted.');
  });

  it('returns blocked when guard rule denies selected item', () => {
    const worldState = createTestWorldState({
      player: {
        id: 'player-1',
        displayName: 'Hero',
        position: { x: 5, y: 5 },
        inventory: {
          items: [{ itemId: 'lockpick', displayName: 'Lockpick', sourceObjectId: 'obj-1', pickedUpAtTick: 10 }],
          selectedItem: { slotIndex: 0, itemId: 'lockpick' },
        },
      },
      guards: [
        {
          id: 'guard-1',
          displayName: 'Gate Guard',
          position: { x: 5, y: 6 },
          guardState: 'idle',
          itemUseRules: {
            lockpick: {
              allowed: false,
              responseText: 'Absolutely not.',
            },
          },
        },
      ],
    });

    const event = resolver.resolveItemUseAttempt({ worldState, commandIndex: 5 });

    expect(event.result).toBe('blocked');
    expect(event.target).toEqual({ kind: 'guard', targetId: 'guard-1' });
    expect(event.affectedEntityType).toBeUndefined();
    expect(event.affectedEntityId).toBeUndefined();
    expect(event.ruleResponseText).toBe('Absolutely not.');
  });

  it('returns success and affected object fields when object rule allows selected item', () => {
    const worldState = createTestWorldState({
      player: {
        id: 'player-1',
        displayName: 'Hero',
        position: { x: 5, y: 5 },
        inventory: {
          items: [{ itemId: 'unlock-rune', displayName: 'Unlock Rune', sourceObjectId: 'obj-1', pickedUpAtTick: 10 }],
          selectedItem: { slotIndex: 0, itemId: 'unlock-rune' },
        },
      },
      interactiveObjects: [
        {
          id: 'crate-1',
          displayName: 'Supply Crate',
          position: { x: 5, y: 6 },
          objectType: 'supply-crate',
          interactionType: 'inspect',
          state: 'idle',
          itemUseRules: {
            'unlock-rune': {
              allowed: true,
              responseText: 'The latch opens.',
            },
          },
        },
      ],
    });

    const event = resolver.resolveItemUseAttempt({ worldState, commandIndex: 6 });

    expect(event.result).toBe('success');
    expect(event.target).toEqual({ kind: 'interactiveObject', targetId: 'crate-1' });
    expect(event.affectedEntityType).toBe('object');
    expect(event.affectedEntityId).toBe('crate-1');
    expect(event.ruleResponseText).toBe('The latch opens.');
  });

  it('is deterministic for the same guard-rule input', () => {
    const worldState = createTestWorldState({
      player: {
        id: 'player-1',
        displayName: 'Hero',
        position: { x: 5, y: 5 },
        inventory: {
          items: [{ itemId: 'gift-token', displayName: 'Gift Token', sourceObjectId: 'obj-1', pickedUpAtTick: 10 }],
          selectedItem: { slotIndex: 0, itemId: 'gift-token' },
        },
      },
      guards: [
        {
          id: 'guard-1',
          displayName: 'Gate Guard',
          position: { x: 5, y: 6 },
          guardState: 'idle',
          itemUseRules: {
            'gift-token': {
              allowed: true,
              responseText: 'Pass granted.',
            },
          },
        },
      ],
    });

    const first = resolver.resolveItemUseAttempt({ worldState, commandIndex: 7 });
    const second = resolver.resolveItemUseAttempt({ worldState, commandIndex: 7 });

    expect(first).toEqual(second);
  });
});
