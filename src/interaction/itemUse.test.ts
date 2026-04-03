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
