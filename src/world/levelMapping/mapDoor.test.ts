import { describe, expect, it } from 'vitest';
import { mapDoorDtoToRuntime } from './mapDoor';

const baseDoor = {
  id: 'door-1',
  displayName: 'Main Gate',
  x: 0,
  y: 10,
  isOpen: false,
  isLocked: false,
};

describe('mapDoorDtoToRuntime', () => {
  it('maps x/y to nested position', () => {
    const result = mapDoorDtoToRuntime(baseDoor);

    expect(result.position).toEqual({ x: 0, y: 10 });
  });

  it('preserves id, displayName, isOpen, and isLocked', () => {
    const result = mapDoorDtoToRuntime(baseDoor);

    expect(result.id).toBe('door-1');
    expect(result.displayName).toBe('Main Gate');
    expect(result.isOpen).toBe(false);
    expect(result.isLocked).toBe(false);
  });

  it('does not inject legacy unlock state', () => {
    const result = mapDoorDtoToRuntime(baseDoor);

    expect('isUnlocked' in result).toBe(false);
  });

  it('maps isSafe when provided', () => {
    const result = mapDoorDtoToRuntime({ ...baseDoor, isSafe: true });

    expect(result.isSafe).toBe(true);
  });

  it('omits isSafe when no safety outcome is provided', () => {
    const result = mapDoorDtoToRuntime(baseDoor);

    expect(result.isSafe).toBeUndefined();
  });

  it('passes through requiredItemId when provided', () => {
    const result = mapDoorDtoToRuntime({ ...baseDoor, requiredItemId: 'golden-key' });

    expect(result.requiredItemId).toBe('golden-key');
  });

  it('omits requiredItemId when not provided', () => {
    const result = mapDoorDtoToRuntime(baseDoor);

    expect(result.requiredItemId).toBeUndefined();
  });

  it('passes through requiredItemIds when provided', () => {
    const result = mapDoorDtoToRuntime({ ...baseDoor, requiredItemIds: ['seal-a', 'seal-b'] });

    expect(result.requiredItemIds).toEqual(['seal-a', 'seal-b']);
  });

  it('omits requiredItemIds when not provided', () => {
    const result = mapDoorDtoToRuntime(baseDoor);

    expect(result.requiredItemIds).toBeUndefined();
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
    const dto = { ...baseDoor, isSafe: false as const };

    expect(mapDoorDtoToRuntime(dto)).toEqual(mapDoorDtoToRuntime(dto));
  });
});
