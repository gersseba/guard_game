import { describe, expect, it } from 'vitest';
import { resolveAdjacentTarget } from '../interaction/adjacencyResolver';
import { createDefaultItemUseResolver } from '../interaction/itemUse';
import { createLevelStateFromData } from '../test-support/levels';
import { guardBribeLevelFixture, guardBribeLevelLayout } from '../test-support/levelFixtures';
import { createTestInventoryItem } from '../test-support/worldState';
import type { WorldState } from '../world/types';

const createLevelState = (): WorldState => {
  return createLevelStateFromData(guardBribeLevelFixture, guardBribeLevelLayout);
};

describe('guard-bribe level integration', () => {
  it('loads level with expected entities', () => {
    const worldState = createLevelState();

    expect(worldState.levelMetadata).toEqual({
      name: 'The Persuasive Bribe',
      premise: 'A guard blocks the only passage through the old gate. Rumour has it they can be persuaded with enough coin.',
      goal: 'Offer the gold coin to the guard and slip through the gate.',
    });
    expect(worldState.player.position).toEqual({ x: 10, y: 12 });
    expect(worldState.guards).toHaveLength(1);
    expect(worldState.guards[0].id).toBe('gate-guard');
    expect(worldState.guards[0].itemUseRules?.['gold-coin']?.allowed).toBe(true);
    expect(worldState.guards[0].itemUseRules?.['iron-key']?.allowed).toBe(false);
    expect(worldState.interactiveObjects).toHaveLength(1);
    expect(worldState.interactiveObjects[0].id).toBe('coin-pouch');
  });

  it('resolves guard as adjacent and confirms itemUseRules are deserialized', () => {
    const worldState = createLevelState();
    worldState.player.position = { x: 10, y: 8 };

    const adjacent = resolveAdjacentTarget(worldState);
    expect(adjacent).not.toBeNull();
    expect(adjacent?.kind).toBe('guard');
    expect(adjacent?.target.id).toBe('gate-guard');

    if (adjacent?.kind !== 'guard') throw new Error('Expected guard');
    expect(adjacent.target.itemUseRules?.['gold-coin']).toBeDefined();
  });

  it('returns success with response text when gold coin used on guard', () => {
    const worldState = createLevelState();
    worldState.player.position = { x: 10, y: 8 };
    worldState.player.inventory.items = [
      createTestInventoryItem('gold-coin', { displayName: 'Gold Coin', sourceObjectId: 'coin-pouch' }),
    ];
    worldState.player.inventory.selectedItem = { slotIndex: 0, itemId: 'gold-coin' };

    const resolver = createDefaultItemUseResolver();
    const result = resolver.resolveItemUseAttempt({ worldState, commandIndex: 1 });

    expect(result.result).toBe('success');
    expect(result.affectedEntityType).toBe('guard');
    expect(result.affectedEntityId).toBe('gate-guard');
    expect(result.ruleResponseText).toBe("A bribe? I suppose I didn't see anything. Move along.");
  });

  it('returns blocked when iron-key used on guard (disallowed rule)', () => {
    const worldState = createLevelState();
    worldState.player.position = { x: 10, y: 8 };
    worldState.player.inventory.items = [
      createTestInventoryItem('iron-key', { displayName: 'Iron Key', sourceObjectId: 'some-chest' }),
    ];
    worldState.player.inventory.selectedItem = { slotIndex: 0, itemId: 'iron-key' };

    const resolver = createDefaultItemUseResolver();
    const result = resolver.resolveItemUseAttempt({ worldState, commandIndex: 1 });

    expect(result.result).toBe('blocked');
    expect(result.affectedEntityId).toBeUndefined();
  });

  it('returns no-rule when unsupported item used on guard', () => {
    const worldState = createLevelState();
    worldState.player.position = { x: 10, y: 8 };
    worldState.player.inventory.items = [
      createTestInventoryItem('random-rock', { displayName: 'Rock', sourceObjectId: 'some-chest' }),
    ];
    worldState.player.inventory.selectedItem = { slotIndex: 0, itemId: 'random-rock' };

    const resolver = createDefaultItemUseResolver();
    const result = resolver.resolveItemUseAttempt({ worldState, commandIndex: 1 });

    expect(result.result).toBe('no-rule');
    expect(result.affectedEntityId).toBeUndefined();
  });
});
