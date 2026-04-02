import { describe, expect, it } from 'vitest';
import riddleJson from '../../public/levels/riddle.json';
import { resolveAdjacentTarget } from '../interaction/adjacencyResolver';
import { handleDoorInteraction } from '../interaction/doorInteraction';
import { deserializeLevel, validateLevelData } from '../world/level';
import type { WorldState } from '../world/types';

const createRiddleState = (): WorldState => {
  const validated = validateLevelData(riddleJson);
  return deserializeLevel(validated);
};

describe('riddle level integration pipeline', () => {
  it('loads riddle level into a valid WorldState with expected entity positions', () => {
    const validated = validateLevelData(riddleJson);
    const worldState = deserializeLevel(validated);

    expect(worldState).toBeDefined();
    expect(worldState.levelMetadata).toEqual({
      name: 'Two Guards, Two Doors',
      premise: 'Two guards stand by two doors, but one guard lies while the other tells the truth.',
      goal: 'Question the guards and choose the door that leads to safety.',
    });
    expect(worldState.player.position).toEqual({ x: 10, y: 15 });
    expect(worldState.player.facingDirection).toBe('front');

    expect(worldState.guards).toHaveLength(2);
    expect(worldState.guards.find((guard) => guard.id === 'guard-truth')?.position).toEqual({ x: 8, y: 10 });
    expect(worldState.guards.find((guard) => guard.id === 'guard-liar')?.position).toEqual({ x: 12, y: 10 });

    expect(worldState.doors).toHaveLength(2);
    expect(worldState.doors.find((door) => door.id === 'door-safe')?.position).toEqual({ x: 7, y: 8 });
    expect(worldState.doors.find((door) => door.id === 'door-danger')?.position).toEqual({ x: 13, y: 8 });
  });

  it('wires medieval sprite sets for player, guards, and doors', () => {
    const worldState = createRiddleState();

    expect(worldState.player.spriteSet).toEqual({
      default: '/assets/medieval_player_farmer_front.svg',
      front: '/assets/medieval_player_farmer_front.svg',
      away: '/assets/medieval_player_farmer_away.svg',
      left: '/assets/medieval_player_farmer_left.svg',
      right: '/assets/medieval_player_farmer_right.svg',
    });

    expect(worldState.guards[0].spriteSet).toEqual({
      default: '/assets/medieval_guard_shield_spear_front.svg',
      front: '/assets/medieval_guard_shield_spear_front.svg',
      away: '/assets/medieval_guard_shield_spear_away.svg',
      left: '/assets/medieval_guard_shield_spear_left.svg',
      right: '/assets/medieval_guard_shield_spear_right.svg',
    });

    expect(worldState.doors[0].spriteSet).toEqual({
      default: '/assets/medieval_door_wooden_closed.svg',
    });
  });

  it('has guards with correct honestyTrait values', () => {
    const worldState = createRiddleState();

    const truthGuard = worldState.guards.find((guard) => guard.id === 'guard-truth');
    expect(truthGuard).toBeDefined();
    expect(truthGuard?.honestyTrait).toBe('truth-teller');

    const liarGuard = worldState.guards.find((guard) => guard.id === 'guard-liar');
    expect(liarGuard).toBeDefined();
    expect(liarGuard?.honestyTrait).toBe('liar');
  });

  it('has doors with correct outcome values', () => {
    const worldState = createRiddleState();

    const safeDoor = worldState.doors.find((door) => door.id === 'door-safe');
    expect(safeDoor).toBeDefined();
    expect(safeDoor?.outcome).toBe('safe');

    const dangerDoor = worldState.doors.find((door) => door.id === 'door-danger');
    expect(dangerDoor).toBeDefined();
    expect(dangerDoor?.outcome).toBe('danger');
  });

  it('initializes with levelOutcome as null', () => {
    const worldState = createRiddleState();

    expect(worldState.levelOutcome).toBeNull();
  });

  it('resolves adjacent safe door and returns win outcome', () => {
    const worldState = createRiddleState();
    worldState.player.position = { x: 6, y: 8 };

    const adjacent = resolveAdjacentTarget(worldState);

    expect(adjacent).not.toBeNull();
    expect(adjacent?.kind).toBe('door');
    expect(adjacent?.target.id).toBe('door-safe');

    if (adjacent?.kind !== 'door') {
      throw new Error('Expected door target');
    }

    const result = handleDoorInteraction({
      door: adjacent.target,
      player: worldState.player,
    });

    expect(result.doorId).toBe('door-safe');
    expect(result.levelOutcome).toBe('win');
  });

  it('resolves adjacent danger door and returns lose outcome', () => {
    const worldState = createRiddleState();
    worldState.player.position = { x: 12, y: 8 };

    const adjacent = resolveAdjacentTarget(worldState);

    expect(adjacent).not.toBeNull();
    expect(adjacent?.kind).toBe('door');
    expect(adjacent?.target.id).toBe('door-danger');

    if (adjacent?.kind !== 'door') {
      throw new Error('Expected door target');
    }

    const result = handleDoorInteraction({
      door: adjacent.target,
      player: worldState.player,
    });

    expect(result.doorId).toBe('door-danger');
    expect(result.levelOutcome).toBe('lose');
  });

  it('returns equal canonical initial states across repeated deserializations', () => {
    const first = deserializeLevel(validateLevelData(riddleJson));
    const second = deserializeLevel(validateLevelData(riddleJson));

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });

  it('guards are idle and doors are open', () => {
    const worldState = createRiddleState();

    worldState.guards.forEach((guard) => {
      expect(guard.guardState).toBe('idle');
    });

    worldState.doors.forEach((door) => {
      expect(door.doorState).toBe('closed');
    });
  });
});
