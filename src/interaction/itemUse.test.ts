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

  it('returns no-selection when selected slot metadata does not match inventory item id', () => {
    const worldState = createTestWorldState({
      player: {
        id: 'player-1',
        displayName: 'Hero',
        position: { x: 5, y: 5 },
        inventory: {
          items: [{ itemId: 'gift-token', displayName: 'Gift Token', sourceObjectId: 'obj-1', pickedUpAtTick: 10 }],
          selectedItem: { slotIndex: 0, itemId: 'wrong-item-id' },
        },
      },
    });

    const event = resolver.resolveItemUseAttempt({
      worldState,
      commandIndex: 1,
    });

    expect(event.result).toBe('no-selection');
    expect(event.selectedItem).toBeNull();
    expect(event.target).toBeNull();
  });

  it('returns no-target with door target when adjacent door has no requiredItemId', () => {
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
          isOpen: false, isLocked: true,
        },
      ],
    });

    const event = resolver.resolveItemUseAttempt({
      worldState,
      commandIndex: 2,
    });

    expect(event.result).toBe('no-target');
    expect(event.target).toEqual({ kind: 'door', targetId: 'door-1' });
  });

  it('returns blocked for multi-key doors when selected item is not part of requiredItemIds', () => {
    const worldState = createTestWorldState({
      player: {
        id: 'player-1',
        displayName: 'Hero',
        position: { x: 5, y: 5 },
        inventory: {
          items: [
            { itemId: 'seal-a', displayName: 'Seal A', sourceObjectId: 'obj-1', pickedUpAtTick: 10 },
            { itemId: 'seal-b', displayName: 'Seal B', sourceObjectId: 'obj-2', pickedUpAtTick: 11 },
            { itemId: 'seal-c', displayName: 'Seal C', sourceObjectId: 'obj-3', pickedUpAtTick: 12 },
            { itemId: 'random-token', displayName: 'Random Token', sourceObjectId: 'obj-4', pickedUpAtTick: 13 },
          ],
          selectedItem: { slotIndex: 3, itemId: 'random-token' },
        },
      },
      doors: [
        {
          id: 'seal-door',
          displayName: 'Seal Door',
          position: { x: 5, y: 6 },
          isOpen: false,
          isLocked: true,
          requiredItemIds: ['seal-a', 'seal-b', 'seal-c'],
        },
      ],
    });

    const event = resolver.resolveItemUseAttempt({ worldState, commandIndex: 10 });

    expect(event.result).toBe('blocked');
    expect(event.target).toEqual({ kind: 'door', targetId: 'seal-door' });
    expect(event.doorUnlockedId).toBeUndefined();
  });

  it('returns blocked for multi-key doors when required inventory key set is incomplete', () => {
    const worldState = createTestWorldState({
      player: {
        id: 'player-1',
        displayName: 'Hero',
        position: { x: 5, y: 5 },
        inventory: {
          items: [
            { itemId: 'seal-a', displayName: 'Seal A', sourceObjectId: 'obj-1', pickedUpAtTick: 10 },
            { itemId: 'seal-b', displayName: 'Seal B', sourceObjectId: 'obj-2', pickedUpAtTick: 11 },
          ],
          selectedItem: { slotIndex: 0, itemId: 'seal-a' },
        },
      },
      doors: [
        {
          id: 'seal-door',
          displayName: 'Seal Door',
          position: { x: 5, y: 6 },
          isOpen: false,
          isLocked: true,
          requiredItemIds: ['seal-a', 'seal-b', 'seal-c'],
        },
      ],
    });

    const event = resolver.resolveItemUseAttempt({ worldState, commandIndex: 11 });

    expect(event.result).toBe('blocked');
    expect(event.target).toEqual({ kind: 'door', targetId: 'seal-door' });
    expect(event.doorUnlockedId).toBeUndefined();
  });

  it('returns success for multi-key doors when selected key is in requiredItemIds and full key set exists', () => {
    const worldState = createTestWorldState({
      player: {
        id: 'player-1',
        displayName: 'Hero',
        position: { x: 5, y: 5 },
        inventory: {
          items: [
            { itemId: 'seal-a', displayName: 'Seal A', sourceObjectId: 'obj-1', pickedUpAtTick: 10 },
            { itemId: 'seal-b', displayName: 'Seal B', sourceObjectId: 'obj-2', pickedUpAtTick: 11 },
            { itemId: 'seal-c', displayName: 'Seal C', sourceObjectId: 'obj-3', pickedUpAtTick: 12 },
          ],
          selectedItem: { slotIndex: 1, itemId: 'seal-b' },
        },
      },
      doors: [
        {
          id: 'seal-door',
          displayName: 'Seal Door',
          position: { x: 5, y: 6 },
          isOpen: false,
          isLocked: true,
          requiredItemIds: ['seal-a', 'seal-b', 'seal-c'],
        },
      ],
    });

    const inventoryBefore = JSON.parse(JSON.stringify(worldState.player.inventory.items));
    const event = resolver.resolveItemUseAttempt({ worldState, commandIndex: 12 });

    expect(event.result).toBe('success');
    expect(event.target).toEqual({ kind: 'door', targetId: 'seal-door' });
    expect(event.doorUnlockedId).toBe('seal-door');
    expect(worldState.player.inventory.items).toEqual(inventoryBefore);
  });

  it('keeps legacy requiredItemId unlock behavior for backward compatibility', () => {
    const worldState = createTestWorldState({
      player: {
        id: 'player-1',
        displayName: 'Hero',
        position: { x: 5, y: 5 },
        inventory: {
          items: [{ itemId: 'golden-key', displayName: 'Golden Key', sourceObjectId: 'obj-1', pickedUpAtTick: 10 }],
          selectedItem: { slotIndex: 0, itemId: 'golden-key' },
        },
      },
      doors: [
        {
          id: 'legacy-door',
          displayName: 'Legacy Door',
          position: { x: 5, y: 6 },
          isOpen: false,
          isLocked: true,
          requiredItemId: 'golden-key',
        },
      ],
    });

    const event = resolver.resolveItemUseAttempt({ worldState, commandIndex: 13 });

    expect(event.result).toBe('success');
    expect(event.target).toEqual({ kind: 'door', targetId: 'legacy-door' });
    expect(event.doorUnlockedId).toBe('legacy-door');
  });

  it('does not emit duplicate unlock side effects from an equivalent unlocked resulting world state', () => {
    const lockedState = createTestWorldState({
      player: {
        id: 'player-1',
        displayName: 'Hero',
        position: { x: 5, y: 5 },
        inventory: {
          items: [
            { itemId: 'seal-a', displayName: 'Seal A', sourceObjectId: 'obj-1', pickedUpAtTick: 10 },
            { itemId: 'seal-b', displayName: 'Seal B', sourceObjectId: 'obj-2', pickedUpAtTick: 11 },
            { itemId: 'seal-c', displayName: 'Seal C', sourceObjectId: 'obj-3', pickedUpAtTick: 12 },
          ],
          selectedItem: { slotIndex: 0, itemId: 'seal-a' },
        },
      },
      doors: [
        {
          id: 'seal-door',
          displayName: 'Seal Door',
          position: { x: 5, y: 6 },
          isOpen: false,
          isLocked: true,
          requiredItemIds: ['seal-a', 'seal-b', 'seal-c'],
        },
      ],
    });
    const unlockedEquivalentState = {
      ...lockedState,
      doors: [{ ...lockedState.doors[0], isOpen: true, isLocked: false }],
    };

    const first = resolver.resolveItemUseAttempt({ worldState: lockedState, commandIndex: 14 });
    const second = resolver.resolveItemUseAttempt({ worldState: unlockedEquivalentState, commandIndex: 14 });

    expect(first.result).toBe('success');
    expect(first.doorUnlockedId).toBe('seal-door');
    expect(second.result).toBe('no-target');
    expect(second.doorUnlockedId).toBeUndefined();
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

  it('returns blocked when object rule denies selected item', () => {
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
      interactiveObjects: [
        {
          id: 'crate-1',
          displayName: 'Supply Crate',
          position: { x: 5, y: 6 },
          objectType: 'supply-crate',
          interactionType: 'inspect',
          state: 'idle',
          itemUseRules: {
            lockpick: {
              allowed: false,
              responseText: 'This crate cannot be forced.',
            },
          },
        },
      ],
    });

    const event = resolver.resolveItemUseAttempt({ worldState, commandIndex: 8 });

    expect(event.result).toBe('blocked');
    expect(event.target).toEqual({ kind: 'interactiveObject', targetId: 'crate-1' });
    expect(event.affectedEntityType).toBeUndefined();
    expect(event.affectedEntityId).toBeUndefined();
    expect(event.ruleResponseText).toBe('This crate cannot be forced.');
  });

  it('returns no-rule when object has no matching itemUseRules entry', () => {
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

    const event = resolver.resolveItemUseAttempt({ worldState, commandIndex: 9 });

    expect(event.result).toBe('no-rule');
    expect(event.target).toEqual({ kind: 'interactiveObject', targetId: 'crate-1' });
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
