import { describe, expect, it } from 'vitest';
import { createDefaultItemUseResolver } from './itemUse';
import type { WorldState, Door } from '../world/types';

const createTestWorldState = (overrides?: Partial<WorldState>): WorldState => {
  const baseState: WorldState = {
    tick: 100,
    grid: { width: 10, height: 10, tileSize: 32 },
    levelMetadata: {
      name: 'Test Level',
      premise: 'Test fixture for item use resolution',
      goal: 'Test door unlock mechanics',
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

describe('itemUseResolver - door unlock', () => {
  const resolver = createDefaultItemUseResolver();

  describe('no selection scenarios', () => {
    it('returns no-selection when player has no selected item', () => {
      const worldState = createTestWorldState();
      const event = resolver.resolveItemUseAttempt({
        worldState,
        commandIndex: 0,
      });

      expect(event.result).toBe('no-selection');
      expect(event.selectedItem).toBeNull();
      expect(event.doorUnlockedId).toBeUndefined();
    });
  });

  describe('no target scenarios', () => {
    it('returns no-target when no adjacent door exists', () => {
      const worldState = createTestWorldState({
        player: {
          id: 'player-1',
          displayName: 'Hero',
          position: { x: 5, y: 5 },
          inventory: {
            items: [{ itemId: 'key-1', displayName: 'Golden Key', sourceObjectId: 'obj-1', pickedUpAtTick: 50 }],
            selectedItem: { slotIndex: 0, itemId: 'key-1' },
          },
        },
        doors: [],
      });

      const event = resolver.resolveItemUseAttempt({
        worldState,
        commandIndex: 0,
      });

      expect(event.result).toBe('no-target');
      expect(event.target).toBeNull();
      expect(event.doorUnlockedId).toBeUndefined();
    });

    it('returns no-target when adjacent target is not a door', () => {
      const worldState = createTestWorldState({
        player: {
          id: 'player-1',
          displayName: 'Hero',
          position: { x: 5, y: 5 },
          inventory: {
            items: [{ itemId: 'key-1', displayName: 'Golden Key', sourceObjectId: 'obj-1', pickedUpAtTick: 50 }],
            selectedItem: { slotIndex: 0, itemId: 'key-1' },
          },
        },
        npcs: [
          {
            id: 'npc-1',
            displayName: 'Sage',
            position: { x: 5, y: 6 },
            npcType: 'sage',
            dialogueContextKey: 'sage-1',
          },
        ],
      });

      const event = resolver.resolveItemUseAttempt({
        worldState,
        commandIndex: 0,
      });

      expect(event.result).toBe('no-target');
      expect(event.target).toBeNull();
      expect(event.doorUnlockedId).toBeUndefined();
    });

    it('returns no-target when door does not require an item', () => {
      const door: Door = {
        id: 'door-1',
        displayName: 'Open Door',
        position: { x: 5, y: 6 },
        doorState: 'open',
      };

      const worldState = createTestWorldState({
        player: {
          id: 'player-1',
          displayName: 'Hero',
          position: { x: 5, y: 5 },
          inventory: {
            items: [{ itemId: 'key-1', displayName: 'Golden Key', sourceObjectId: 'obj-1', pickedUpAtTick: 50 }],
            selectedItem: { slotIndex: 0, itemId: 'key-1' },
          },
        },
        doors: [door],
      });

      const event = resolver.resolveItemUseAttempt({
        worldState,
        commandIndex: 0,
      });

      expect(event.result).toBe('no-target');
      expect(event.target).toEqual({ kind: 'door', targetId: 'door-1' });
      expect(event.doorUnlockedId).toBeUndefined();
    });
  });

  describe('correct key unlock', () => {
    it('returns success when selected item matches door requiredItemId', () => {
      const door: Door = {
        id: 'door-1',
        displayName: 'Locked Door',
        position: { x: 5, y: 6 },
        doorState: 'locked',
        requiredItemId: 'key-1',
      };

      const worldState = createTestWorldState({
        player: {
          id: 'player-1',
          displayName: 'Hero',
          position: { x: 5, y: 5 },
          inventory: {
            items: [{ itemId: 'key-1', displayName: 'Golden Key', sourceObjectId: 'obj-1', pickedUpAtTick: 50 }],
            selectedItem: { slotIndex: 0, itemId: 'key-1' },
          },
        },
        doors: [door],
      });

      const event = resolver.resolveItemUseAttempt({
        worldState,
        commandIndex: 5,
      });

      expect(event.result).toBe('success');
      expect(event.target).toEqual({ kind: 'door', targetId: 'door-1' });
      expect(event.doorUnlockedId).toBe('door-1');
      expect(event.selectedItem).toEqual({ slotIndex: 0, itemId: 'key-1' });
    });

    it('returns deterministic result for same input', () => {
      const door: Door = {
        id: 'door-1',
        displayName: 'Locked Door',
        position: { x: 5, y: 6 },
        doorState: 'locked',
        requiredItemId: 'key-1',
      };

      const worldState = createTestWorldState({
        player: {
          id: 'player-1',
          displayName: 'Hero',
          position: { x: 5, y: 5 },
          inventory: {
            items: [{ itemId: 'key-1', displayName: 'Golden Key', sourceObjectId: 'obj-1', pickedUpAtTick: 50 }],
            selectedItem: { slotIndex: 0, itemId: 'key-1' },
          },
        },
        doors: [door],
      });

      const first = resolver.resolveItemUseAttempt({ worldState, commandIndex: 0 });
      const second = resolver.resolveItemUseAttempt({ worldState, commandIndex: 0 });

      expect(first).toEqual(second);
    });
  });

  describe('wrong key scenarios', () => {
    it('returns blocked when selected item does not match door requiredItemId', () => {
      const door: Door = {
        id: 'door-1',
        displayName: 'Locked Door',
        position: { x: 5, y: 6 },
        doorState: 'locked',
        requiredItemId: 'key-correct',
      };

      const worldState = createTestWorldState({
        player: {
          id: 'player-1',
          displayName: 'Hero',
          position: { x: 5, y: 5 },
          inventory: {
            items: [{ itemId: 'key-wrong', displayName: 'Brass Key', sourceObjectId: 'obj-1', pickedUpAtTick: 50 }],
            selectedItem: { slotIndex: 0, itemId: 'key-wrong' },
          },
        },
        doors: [door],
      });

      const event = resolver.resolveItemUseAttempt({
        worldState,
        commandIndex: 0,
      });

      expect(event.result).toBe('blocked');
      expect(event.target).toEqual({ kind: 'door', targetId: 'door-1' });
      expect(event.doorUnlockedId).toBeUndefined();
      expect(event.selectedItem).toEqual({ slotIndex: 0, itemId: 'key-wrong' });
    });

    it('returns blocked when required-item door receives non-matching item', () => {
      const door: Door = {
        id: 'chest-key-lock',
        displayName: 'Ancient Chest Lock',
        position: { x: 4, y: 5 },
        doorState: 'locked',
        requiredItemId: 'ancient-key',
      };

      const worldState = createTestWorldState({
        player: {
          id: 'player-1',
          displayName: 'Hero',
          position: { x: 5, y: 5 },
          inventory: {
            items: [
              { itemId: 'regular-key', displayName: 'Regular Key', sourceObjectId: 'obj-1', pickedUpAtTick: 50 },
              { itemId: 'lock-pick', displayName: 'Lock Pick', sourceObjectId: 'obj-2', pickedUpAtTick: 75 },
            ],
            selectedItem: { slotIndex: 1, itemId: 'lock-pick' },
          },
        },
        doors: [door],
      });

      const event = resolver.resolveItemUseAttempt({
        worldState,
        commandIndex: 0,
      });

      expect(event.result).toBe('blocked');
      expect(event.doorUnlockedId).toBeUndefined();
    });
  });

  describe('spatial rules integration', () => {
    it('correct key unlock sets doorUnlockedId for subsequent traversal check', () => {
      const door: Door = {
        id: 'blocked-door',
        displayName: 'Guard Door',
        position: { x: 5, y: 6 },
        doorState: 'locked',
        requiredItemId: 'guard-key',
        isUnlocked: false,
      };

      const worldState = createTestWorldState({
        player: {
          id: 'player-1',
          displayName: 'Hero',
          position: { x: 5, y: 5 },
          inventory: {
            items: [{ itemId: 'guard-key', displayName: 'Guard Key', sourceObjectId: 'obj-1', pickedUpAtTick: 50 }],
            selectedItem: { slotIndex: 0, itemId: 'guard-key' },
          },
        },
        doors: [door],
      });

      const event = resolver.resolveItemUseAttempt({
        worldState,
        commandIndex: 0,
      });

      // Event indicates door should be unlocked
      expect(event.result).toBe('success');
      expect(event.doorUnlockedId).toBe('blocked-door');

      // Caller would then update world state: door.isUnlocked = true
      // This allows subsequent move attempts to not block on the door
    });
  });

  describe('persistence of unlocked state', () => {
    it('unlocked door state survives JSON serialization roundtrip', () => {
      const door: Door = {
        id: 'escaped-door',
        displayName: 'Prison Door',
        position: { x: 3, y: 3 },
        doorState: 'locked',
        requiredItemId: 'escape-key',
        isUnlocked: true, // Door was unlocked
      };

      const worldState: WorldState = {
        tick: 200,
        grid: { width: 10, height: 10, tileSize: 32 },
        levelMetadata: {
          name: 'Prison Level',
          premise: 'Test door unlock persistence',
          goal: 'Escape the prison',
        },
        player: {
          id: 'player-1',
          displayName: 'Prisoner',
          position: { x: 4, y: 4 },
          inventory: {
            items: [],
          },
        },
        npcs: [],
        doors: [door],
        guards: [],
        interactiveObjects: [],
        actorConversationHistoryByActorId: {},
        levelOutcome: null,
      };

      // Serialize and deserialize
      const serialized = JSON.stringify(worldState);
      const deserialized: WorldState = JSON.parse(serialized);

      // Unlocked state should persist
      expect(deserialized.doors[0].isUnlocked).toBe(true);
      expect(deserialized.doors[0].requiredItemId).toBe('escape-key');
    });
  });

  describe('multiple doors', () => {
    it('correctly unlocks specific door when multiple adjacent targets exist (door has priority)', () => {
      const doorWithKey: Door = {
        id: 'locked-passage',
        displayName: 'Locked Door',
        position: { x: 5, y: 6 },
        doorState: 'locked',
        requiredItemId: 'passage-key',
      };

      const npcAdjacentDifferent: Door = {
        id: 'other-door',
        displayName: 'Other Door',
        position: { x: 6, y: 5 },
        doorState: 'locked',
        requiredItemId: 'other-key',
      };

      const worldState = createTestWorldState({
        player: {
          id: 'player-1',
          displayName: 'Hero',
          position: { x: 5, y: 5 },
          inventory: {
            items: [{ itemId: 'passage-key', displayName: 'Passage Key', sourceObjectId: 'obj-1', pickedUpAtTick: 50 }],
            selectedItem: { slotIndex: 0, itemId: 'passage-key' },
          },
        },
        doors: [doorWithKey, npcAdjacentDifferent],
      });

      const event = resolver.resolveItemUseAttempt({
        worldState,
        commandIndex: 0,
      });

      // Should resolve to the orthogonally adjacent door (locked-passage), not the diagonal one
      expect(event.result).toBe('success');
      expect(event.doorUnlockedId).toBe('locked-passage');
    });
  });
});

describe('itemUseResolver - guard item-use rules', () => {
  const resolver = createDefaultItemUseResolver();

  describe('guard allowed rules', () => {
    it('returns success when guard has allowed rule for item', () => {
      const guard: any = {
        id: 'guard-1',
        displayName: 'Gate Guard',
        position: { x: 5, y: 6 },
        guardState: 'idle',
        itemUseRules: {
          'gift-item': { allowed: true, responseText: 'Thank you, you may pass.' },
        },
      };

      const worldState = createTestWorldState({
        player: {
          id: 'player-1',
          displayName: 'Hero',
          position: { x: 5, y: 5 },
          inventory: {
            items: [{ itemId: 'gift-item', displayName: 'Shiny Gift', sourceObjectId: 'obj-1', pickedUpAtTick: 50 }],
            selectedItem: { slotIndex: 0, itemId: 'gift-item' },
          },
        },
        guards: [guard],
      });

      const event = resolver.resolveItemUseAttempt({
        worldState,
        commandIndex: 0,
      });

      expect(event.result).toBe('success');
      expect(event.target).toEqual({ kind: 'guard', targetId: 'guard-1' });
      expect(event.affectedEntityType).toBe('guard');
      expect(event.affectedEntityId).toBe('guard-1');
      expect(event.ruleResponseText).toBe('Thank you, you may pass.');
    });
  });

  describe('guard disallowed rules', () => {
    it('returns blocked when guard rule disallows item', () => {
      const guard: any = {
        id: 'hostile-guard',
        displayName: 'Hostile Guard',
        position: { x: 5, y: 6 },
        guardState: 'alert',
        itemUseRules: {
          'bomb': { allowed: false, responseText: 'You cannot use that here!' },
        },
      };

      const worldState = createTestWorldState({
        player: {
          id: 'player-1',
          displayName: 'Hero',
          position: { x: 5, y: 5 },
          inventory: {
            items: [{ itemId: 'bomb', displayName: 'Bomb', sourceObjectId: 'obj-1', pickedUpAtTick: 50 }],
            selectedItem: { slotIndex: 0, itemId: 'bomb' },
          },
        },
        guards: [guard],
      });

      const event = resolver.resolveItemUseAttempt({
        worldState,
        commandIndex: 0,
      });

      expect(event.result).toBe('blocked');
      expect(event.target).toEqual({ kind: 'guard', targetId: 'hostile-guard' });
      expect(event.affectedEntityType).toBeUndefined();
      expect(event.ruleResponseText).toBe('You cannot use that here!');
    });
  });

  describe('guard no-rule scenarios', () => {
    it('returns no-rule when guard has no rule for selected item', () => {
      const guard: any = {
        id: 'silent-guard',
        displayName: 'Silent Guard',
        position: { x: 5, y: 6 },
        guardState: 'patrolling',
        itemUseRules: {
          'specific-item': { allowed: true, responseText: 'Only for this item' },
        },
      };

      const worldState = createTestWorldState({
        player: {
          id: 'player-1',
          displayName: 'Hero',
          position: { x: 5, y: 5 },
          inventory: {
            items: [{ itemId: 'random-item', displayName: 'Random Item', sourceObjectId: 'obj-1', pickedUpAtTick: 50 }],
            selectedItem: { slotIndex: 0, itemId: 'random-item' },
          },
        },
        guards: [guard],
      });

      const event = resolver.resolveItemUseAttempt({
        worldState,
        commandIndex: 0,
      });

      expect(event.result).toBe('no-rule');
      expect(event.target).toEqual({ kind: 'guard', targetId: 'silent-guard' });
      expect(event.ruleResponseText).toBeUndefined();
    });

    it('returns no-rule when guard has no itemUseRules defined', () => {
      const guard: any = {
        id: 'plain-guard',
        displayName: 'Plain Guard',
        position: { x: 5, y: 6 },
        guardState: 'idle',
      };

      const worldState = createTestWorldState({
        player: {
          id: 'player-1',
          displayName: 'Hero',
          position: { x: 5, y: 5 },
          inventory: {
            items: [{ itemId: 'any-item', displayName: 'Any Item', sourceObjectId: 'obj-1', pickedUpAtTick: 50 }],
            selectedItem: { slotIndex: 0, itemId: 'any-item' },
          },
        },
        guards: [guard],
      });

      const event = resolver.resolveItemUseAttempt({
        worldState,
        commandIndex: 0,
      });

      expect(event.result).toBe('no-rule');
      expect(event.target).toEqual({ kind: 'guard', targetId: 'plain-guard' });
    });
  });
});

describe('itemUseResolver - object item-use rules', () => {
  const resolver = createDefaultItemUseResolver();

  describe('object allowed rules', () => {
    it('returns success when object has allowed rule for item', () => {
      const obj: any = {
        id: 'magic-crate',
        displayName: 'Magic Crate',
        position: { x: 5, y: 6 },
        objectType: 'supply-crate',
        interactionType: 'use',
        state: 'idle',
        itemUseRules: {
          'unlock-rune': { allowed: true, responseText: 'The crate glows and opens!' },
        },
      };

      const worldState = createTestWorldState({
        player: {
          id: 'player-1',
          displayName: 'Hero',
          position: { x: 5, y: 5 },
          inventory: {
            items: [{ itemId: 'unlock-rune', displayName: 'Unlock Rune', sourceObjectId: 'obj-1', pickedUpAtTick: 50 }],
            selectedItem: { slotIndex: 0, itemId: 'unlock-rune' },
          },
        },
        interactiveObjects: [obj],
      });

      const event = resolver.resolveItemUseAttempt({
        worldState,
        commandIndex: 0,
      });

      expect(event.result).toBe('success');
      expect(event.target).toEqual({ kind: 'interactiveObject', targetId: 'magic-crate' });
      expect(event.affectedEntityType).toBe('object');
      expect(event.affectedEntityId).toBe('magic-crate');
      expect(event.ruleResponseText).toBe('The crate glows and opens!');
    });
  });

  describe('object disallowed rules', () => {
    it('returns blocked when object rule disallows item', () => {
      const obj: any = {
        id: 'sealed-crate',
        displayName: 'Sealed Crate',
        position: { x: 5, y: 6 },
        objectType: 'supply-crate',
        interactionType: 'use',
        state: 'idle',
        itemUseRules: {
          'fire-rune': { allowed: false, responseText: 'The crate rejects the rune!' },
        },
      };

      const worldState = createTestWorldState({
        player: {
          id: 'player-1',
          displayName: 'Hero',
          position: { x: 5, y: 5 },
          inventory: {
            items: [{ itemId: 'fire-rune', displayName: 'Fire Rune', sourceObjectId: 'obj-1', pickedUpAtTick: 50 }],
            selectedItem: { slotIndex: 0, itemId: 'fire-rune' },
          },
        },
        interactiveObjects: [obj],
      });

      const event = resolver.resolveItemUseAttempt({
        worldState,
        commandIndex: 0,
      });

      expect(event.result).toBe('blocked');
      expect(event.target).toEqual({ kind: 'interactiveObject', targetId: 'sealed-crate' });
      expect(event.affectedEntityType).toBeUndefined();
      expect(event.ruleResponseText).toBe('The crate rejects the rune!');
    });
  });

  describe('object no-rule scenarios', () => {
    it('returns no-rule when object has no rule for selected item', () => {
      const obj: any = {
        id: 'picky-crate',
        displayName: 'Picky Crate',
        position: { x: 5, y: 6 },
        objectType: 'supply-crate',
        interactionType: 'use',
        state: 'idle',
        itemUseRules: {
          'specific-rune': { allowed: true, responseText: 'This works!' },
        },
      };

      const worldState = createTestWorldState({
        player: {
          id: 'player-1',
          displayName: 'Hero',
          position: { x: 5, y: 5 },
          inventory: {
            items: [{ itemId: 'wrong-rune', displayName: 'Wrong Rune', sourceObjectId: 'obj-1', pickedUpAtTick: 50 }],
            selectedItem: { slotIndex: 0, itemId: 'wrong-rune' },
          },
        },
        interactiveObjects: [obj],
      });

      const event = resolver.resolveItemUseAttempt({
        worldState,
        commandIndex: 0,
      });

      expect(event.result).toBe('no-rule');
      expect(event.target).toEqual({ kind: 'interactiveObject', targetId: 'picky-crate' });
      expect(event.ruleResponseText).toBeUndefined();
    });

    it('returns no-rule when object has no itemUseRules defined', () => {
      const obj: any = {
        id: 'basic-crate',
        displayName: 'Basic Crate',
        position: { x: 5, y: 6 },
        objectType: 'supply-crate',
        interactionType: 'inspect',
        state: 'idle',
      };

      const worldState = createTestWorldState({
        player: {
          id: 'player-1',
          displayName: 'Hero',
          position: { x: 5, y: 5 },
          inventory: {
            items: [{ itemId: 'any-rune', displayName: 'Any Rune', sourceObjectId: 'obj-1', pickedUpAtTick: 50 }],
            selectedItem: { slotIndex: 0, itemId: 'any-rune' },
          },
        },
        interactiveObjects: [obj],
      });

      const event = resolver.resolveItemUseAttempt({
        worldState,
        commandIndex: 0,
      });

      expect(event.result).toBe('no-rule');
      expect(event.target).toEqual({ kind: 'interactiveObject', targetId: 'basic-crate' });
    });
  });
});

describe('itemUseResolver - state persistence', () => {
  it('guard and object item-use rules survive JSON serialization roundtrip', () => {
    const guard: any = {
      id: 'test-guard',
      displayName: 'Test Guard',
      position: { x: 5, y: 6 },
      guardState: 'idle',
      itemUseRules: {
        'test-item': { allowed: true, responseText: 'Works!' },
      },
    };

    const obj: any = {
      id: 'test-object',
      displayName: 'Test Object',
      position: { x: 4, y: 4 },
      objectType: 'supply-crate',
      interactionType: 'use',
      state: 'idle',
      itemUseRules: {
        'test-rune': { allowed: false, responseText: 'Nope!' },
      },
    };

    const worldState: WorldState = {
      tick: 100,
      grid: { width: 10, height: 10, tileSize: 32 },
      levelMetadata: {
        name: 'Test Level',
        premise: 'Persistence test',
        goal: 'Verify rules survive',
      },
      player: {
        id: 'player-1',
        displayName: 'Hero',
        position: { x: 5, y: 5 },
        inventory: { items: [] },
      },
      npcs: [],
      doors: [],
      guards: [guard],
      interactiveObjects: [obj],
      actorConversationHistoryByActorId: {},
      levelOutcome: null,
    };

    // Serialize and deserialize
    const serialized = JSON.stringify(worldState);
    const deserialized: WorldState = JSON.parse(serialized);

    // Rules should persist
    expect(deserialized.guards[0].itemUseRules).toEqual({
      'test-item': { allowed: true, responseText: 'Works!' },
    });
    expect(deserialized.interactiveObjects[0].itemUseRules).toEqual({
      'test-rune': { allowed: false, responseText: 'Nope!' },
    });
  });
});
