import { describe, expect, it } from 'vitest';
import { resolveAdjacentTarget } from '../interaction/adjacencyResolver';
import { createDefaultItemUseResolver } from '../interaction/itemUse';
import { createLevelStateFromData } from '../test-support/levels';
import { keyArmoryLevelFixture } from '../test-support/levelFixtures';
import { createTestInventoryItem } from '../test-support/worldState';
import type { WorldState } from '../world/types';

const createLevelState = (): WorldState => {
  return createLevelStateFromData(keyArmoryLevelFixture);
};

describe('key-armory level integration', () => {
  it('loads level with expected entities', () => {
    const worldState = createLevelState();

    expect(worldState.levelMetadata).toEqual({
      name: 'The Locked Armory',
      premise: 'A locked armory holds the supplies you need. You spotted a key in an old crate nearby.',
      goal: 'Find the key, unlock the armory door, and step through to safety.',
    });
    expect(worldState.player.position).toEqual({ x: 10, y: 12 });
    expect(worldState.doors).toHaveLength(1);
    expect(worldState.doors[0].id).toBe('armory-door');
    expect(worldState.doors[0].isLocked).toBe(true);
    expect(worldState.interactiveObjects).toHaveLength(1);
    expect(worldState.interactiveObjects[0].id).toBe('old-crate');
    expect(worldState.interactiveObjects[0].pickupItem?.itemId).toBe('armory-key');
  });

  it('resolves crate as adjacent when player stands next to it', () => {
    const worldState = createLevelState();
    worldState.player.position = { x: 10, y: 10 };

    const adjacent = resolveAdjacentTarget(worldState);
    expect(adjacent).not.toBeNull();
    expect(adjacent?.kind).toBe('interactiveObject');
    expect(adjacent?.target.id).toBe('old-crate');
  });

  it('resolves armory door as adjacent when player stands next to it', () => {
    const worldState = createLevelState();
    worldState.player.position = { x: 10, y: 8 };

    const adjacent = resolveAdjacentTarget(worldState);
    expect(adjacent).not.toBeNull();
    expect(adjacent?.kind).toBe('door');
    expect(adjacent?.target.id).toBe('armory-door');
  });

  it('returns success and unlocks armory door when correct key is used', () => {
    const worldState = createLevelState();
    worldState.player.position = { x: 10, y: 8 };
    worldState.player.inventory.items = [
      createTestInventoryItem('armory-key', { displayName: 'Armory Key', sourceObjectId: 'old-crate' }),
    ];
    worldState.player.inventory.selectedItem = { slotIndex: 0, itemId: 'armory-key' };

    const resolver = createDefaultItemUseResolver();
    const result = resolver.resolveItemUseAttempt({ worldState, commandIndex: 1 });

    expect(result.result).toBe('success');
    expect(result.doorUnlockedId).toBe('armory-door');
    expect(result.target?.targetId).toBe('armory-door');
  });

  it('returns blocked when wrong item is used on armory door', () => {
    const worldState = createLevelState();
    worldState.player.position = { x: 10, y: 8 };
    worldState.player.inventory.items = [
      createTestInventoryItem('wrong-item', { displayName: 'Wrong Item', sourceObjectId: 'some-crate' }),
    ];
    worldState.player.inventory.selectedItem = { slotIndex: 0, itemId: 'wrong-item' };

    const resolver = createDefaultItemUseResolver();
    const result = resolver.resolveItemUseAttempt({ worldState, commandIndex: 1 });

    expect(result.result).toBe('blocked');
    expect(result.doorUnlockedId).toBeUndefined();
  });

  it('returns no-selection when item use attempted with no selected item', () => {
    const worldState = createLevelState();
    worldState.player.position = { x: 10, y: 8 };

    const resolver = createDefaultItemUseResolver();
    const result = resolver.resolveItemUseAttempt({ worldState, commandIndex: 1 });

    expect(result.result).toBe('no-selection');
  });

  it('armory door state persists through JSON serialization roundtrip', () => {
    const worldState = createLevelState();
    worldState.doors[0].isOpen = true;
    worldState.doors[0].isLocked = false;

    const serialized = JSON.stringify(worldState);
    const parsed: WorldState = JSON.parse(serialized);

    expect(parsed.doors[0].isOpen).toBe(true);
    expect(parsed.doors[0].isLocked).toBe(false);
  });
});
