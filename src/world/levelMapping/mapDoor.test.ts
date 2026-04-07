import { describe, expect, it } from 'vitest';
import { mapDoorDtoToRuntime } from './mapDoor';

const baseDoor = {
  id: 'door-1',
  displayName: 'Main Gate',
  x: 0,
  y: 10,
  doorState: 'closed' as const,
};

describe('mapDoorDtoToRuntime', () => {
  it('maps x/y to nested position', () => {
    const result = mapDoorDtoToRuntime(baseDoor);

    expect(result.position).toEqual({ x: 0, y: 10 });
  });

  it('preserves id, displayName, and doorState', () => {
    const result = mapDoorDtoToRuntime(baseDoor);

    expect(result.id).toBe('door-1');
    expect(result.displayName).toBe('Main Gate');
    expect(result.doorState).toBe('closed');
  });

  it('initializes isUnlocked to false', () => {
    const result = mapDoorDtoToRuntime(baseDoor);

    expect(result.isUnlocked).toBe(false);
  });

  it('passes through outcome when provided', () => {
    const result = mapDoorDtoToRuntime({ ...baseDoor, outcome: 'safe' });

    expect(result.outcome).toBe('safe');
  });

  it('omits outcome when not provided', () => {
    const result = mapDoorDtoToRuntime(baseDoor);

    expect(result.outcome).toBeUndefined();
  });

  it('passes through requiredItemId when provided', () => {
    const result = mapDoorDtoToRuntime({ ...baseDoor, requiredItemId: 'golden-key' });

    expect(result.requiredItemId).toBe('golden-key');
  });

  it('omits requiredItemId when not provided', () => {
    const result = mapDoorDtoToRuntime(baseDoor);

    expect(result.requiredItemId).toBeUndefined();
  });

  it('passes through spriteAssetPath when provided', () => {
    const result = mapDoorDtoToRuntime({ ...baseDoor, spriteAssetPath: '/assets/door.svg' });

    expect(result.spriteAssetPath).toBe('/assets/door.svg');
  });

  it('passes through spriteSet when provided', () => {
    const spriteSet = { default: '/assets/door_closed.svg' };
    const result = mapDoorDtoToRuntime({ ...baseDoor, spriteSet });

    expect(result.spriteSet).toEqual(spriteSet);
  });

  it('is deterministic — same input always produces the same output', () => {
    const dto = { ...baseDoor, outcome: 'danger' as const };

    expect(mapDoorDtoToRuntime(dto)).toEqual(mapDoorDtoToRuntime(dto));
  });
});
