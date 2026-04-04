import { describe, expect, it } from 'vitest';
import brokenMechanismJson from '../../public/levels/broken-mechanism.json';
import { resolveAdjacentTarget } from '../interaction/adjacencyResolver';
import { createDefaultItemUseResolver } from '../interaction/itemUse';
import { deserializeLevel, validateLevelData } from '../world/level';
import type { WorldState } from '../world/types';

const createLevelState = (): WorldState => {
  const validated = validateLevelData(brokenMechanismJson);
  return deserializeLevel(validated);
};

describe('broken-mechanism level integration', () => {
  it('loads level with expected entities', () => {
    const worldState = createLevelState();

    expect(worldState.levelMetadata).toEqual({
      name: 'The Broken Mechanism',
      premise: 'An ancient door mechanism is jammed. The corridor beyond holds your escape, but only the right tool can fix the mechanism.',
      goal: 'Find the iron wrench and repair the mechanism to open the path forward.',
    });
    expect(worldState.player.position).toEqual({ x: 5, y: 10 });
    expect(worldState.interactiveObjects).toHaveLength(2);

    const toolChest = worldState.interactiveObjects.find((o) => o.id === 'tool-chest');
    const mechanism = worldState.interactiveObjects.find((o) => o.id === 'door-mechanism');
    expect(toolChest?.pickupItem?.itemId).toBe('wrench');
    expect(mechanism?.itemUseRules?.['wrench']?.allowed).toBe(true);
    expect(mechanism?.itemUseRules?.['gold-coin']?.allowed).toBe(false);
  });

  it('resolves mechanism as adjacent when player stands next to it', () => {
    const worldState = createLevelState();
    worldState.player.position = { x: 11, y: 7 };

    const adjacent = resolveAdjacentTarget(worldState);
    expect(adjacent).not.toBeNull();
    expect(adjacent?.kind).toBe('interactiveObject');
    expect(adjacent?.target.id).toBe('door-mechanism');
  });

  it('returns success when wrench is used on mechanism', () => {
    const worldState = createLevelState();
    worldState.player.position = { x: 11, y: 7 };
    worldState.player.inventory.items = [
      {
        itemId: 'wrench',
        displayName: 'Iron Wrench',
        sourceObjectId: 'tool-chest',
        pickedUpAtTick: 1,
      },
    ];
    worldState.player.inventory.selectedItem = { slotIndex: 0, itemId: 'wrench' };

    const resolver = createDefaultItemUseResolver();
    const result = resolver.resolveItemUseAttempt({ worldState, commandIndex: 1 });

    expect(result.result).toBe('success');
    expect(result.affectedEntityType).toBe('object');
    expect(result.affectedEntityId).toBe('door-mechanism');
    expect(result.ruleResponseText).toBe('The mechanism clicks into place. The corridor door swings open.');
  });

  it('returns blocked when wrong item is used on mechanism', () => {
    const worldState = createLevelState();
    worldState.player.position = { x: 11, y: 7 };
    worldState.player.inventory.items = [
      {
        itemId: 'gold-coin',
        displayName: 'Gold Coin',
        sourceObjectId: 'coin-pouch',
        pickedUpAtTick: 1,
      },
    ];
    worldState.player.inventory.selectedItem = { slotIndex: 0, itemId: 'gold-coin' };

    const resolver = createDefaultItemUseResolver();
    const result = resolver.resolveItemUseAttempt({ worldState, commandIndex: 1 });

    expect(result.result).toBe('blocked');
    expect(result.affectedEntityId).toBeUndefined();
  });

  it('returns no-rule when unsupported item used on mechanism', () => {
    const worldState = createLevelState();
    worldState.player.position = { x: 11, y: 7 };
    worldState.player.inventory.items = [
      {
        itemId: 'random-pebble',
        displayName: 'Pebble',
        sourceObjectId: 'some-crate',
        pickedUpAtTick: 1,
      },
    ];
    worldState.player.inventory.selectedItem = { slotIndex: 0, itemId: 'random-pebble' };

    const resolver = createDefaultItemUseResolver();
    const result = resolver.resolveItemUseAttempt({ worldState, commandIndex: 1 });

    expect(result.result).toBe('no-rule');
    expect(result.affectedEntityId).toBeUndefined();
  });

  it('mechanism state persists through JSON serialization roundtrip', () => {
    const worldState = createLevelState();
    const mechanism = worldState.interactiveObjects.find((o) => o.id === 'door-mechanism');
    if (!mechanism) throw new Error('Mechanism not found');
    mechanism.state = 'used';

    const serialized = JSON.stringify(worldState);
    const parsed: WorldState = JSON.parse(serialized);
    const parsedMechanism = parsed.interactiveObjects.find((o) => o.id === 'door-mechanism');

    expect(parsedMechanism?.state).toBe('used');
    expect(parsedMechanism?.itemUseRules?.['wrench']?.allowed).toBe(true);
  });
});
