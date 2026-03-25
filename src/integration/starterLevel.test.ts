import { describe, expect, it } from 'vitest';
import starterJson from '../../public/levels/starter.json';
import { resolveAdjacentTarget } from '../interaction/adjacencyResolver';
import { handleDoorInteraction } from '../interaction/doorInteraction';
import { handleGuardInteraction } from '../interaction/guardInteraction';
import { deserializeLevel, validateLevelData } from '../world/level';
import type { WorldState } from '../world/types';

const createStarterState = (): WorldState => {
  const validated = validateLevelData(starterJson);
  return deserializeLevel(validated);
};

describe('starter level integration pipeline', () => {
  it('loads starter level into a valid WorldState with expected entity positions', () => {
    const validated = validateLevelData(starterJson);
    const worldState = deserializeLevel(validated);

    expect(worldState).toBeDefined();
    expect(worldState.player.position).toEqual({ x: 10, y: 10 });

    expect(worldState.guards).toHaveLength(2);
    expect(worldState.guards.find((guard) => guard.id === 'guard-1')?.position).toEqual({ x: 5, y: 10 });
    expect(worldState.guards.find((guard) => guard.id === 'guard-2')?.position).toEqual({ x: 10, y: 5 });

    expect(worldState.doors).toHaveLength(2);
    expect(worldState.doors.find((door) => door.id === 'door-1')?.position).toEqual({ x: 2, y: 10 });
    expect(worldState.doors.find((door) => door.id === 'door-2')?.position).toEqual({ x: 10, y: 2 });
  });

  it('resolves adjacent guard and returns patrolling response without mutating world state', () => {
    const worldState = createStarterState();
    worldState.player.position = { x: 6, y: 10 };

    const beforeInteraction = structuredClone(worldState);
    const adjacent = resolveAdjacentTarget(worldState);

    expect(adjacent).not.toBeNull();
    expect(adjacent?.kind).toBe('guard');
    expect(adjacent?.target.id).toBe('guard-1');

    if (adjacent?.kind !== 'guard') {
      throw new Error('Expected guard target');
    }

    const result = handleGuardInteraction({
      guard: adjacent.target,
      player: worldState.player,
    });

    expect(result.responseText).toBe('Guard: Keep moving, nothing to see here.');
    expect(worldState).toEqual(beforeInteraction);
  });

  it('resolves adjacent door and returns the closed-door response', () => {
    const worldState = createStarterState();
    worldState.player.position = { x: 10, y: 3 };
    const beforeInteraction = structuredClone(worldState);

    const adjacent = resolveAdjacentTarget(worldState);

    expect(adjacent).not.toBeNull();
    expect(adjacent?.kind).toBe('door');
    expect(adjacent?.target.id).toBe('door-2');

    if (adjacent?.kind !== 'door') {
      throw new Error('Expected door target');
    }

    const result = handleDoorInteraction({
      door: adjacent.target,
      player: worldState.player,
    });

    expect(result.responseText).toBe('The door is closed.');
    expect(worldState).toEqual(beforeInteraction);
  });

  it('returns equal canonical initial states across repeated deserializations (reset baseline)', () => {
    const first = deserializeLevel(validateLevelData(starterJson));
    const second = deserializeLevel(validateLevelData(starterJson));

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });

  it('returns null when player has no adjacent interactable (silent no-op)', () => {
    const worldState = createStarterState();
    worldState.player.position = { x: 0, y: 0 };

    const adjacent = resolveAdjacentTarget(worldState);

    expect(adjacent).toBeNull();
  });
});
