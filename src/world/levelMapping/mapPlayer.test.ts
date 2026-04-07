import { describe, expect, it } from 'vitest';
import { mapPlayerDtoToRuntime } from './mapPlayer';

describe('mapPlayerDtoToRuntime', () => {
  it('maps x/y to nested position with fixed id and displayName', () => {
    const result = mapPlayerDtoToRuntime({ x: 3, y: 7 });

    expect(result.id).toBe('player');
    expect(result.displayName).toBe('Player');
    expect(result.position).toEqual({ x: 3, y: 7 });
  });

  it('initializes inventory to empty items array and null selectedItem', () => {
    const result = mapPlayerDtoToRuntime({ x: 0, y: 0 });

    expect(result.inventory.items).toEqual([]);
    expect(result.inventory.selectedItem).toBeNull();
  });

  it('sets facingDirection to front', () => {
    const result = mapPlayerDtoToRuntime({ x: 0, y: 0 });

    expect(result.facingDirection).toBe('front');
  });

  it('passes through spriteAssetPath when provided', () => {
    const result = mapPlayerDtoToRuntime({ x: 0, y: 0, spriteAssetPath: '/assets/player.svg' });

    expect(result.spriteAssetPath).toBe('/assets/player.svg');
  });

  it('omits spriteAssetPath when not provided', () => {
    const result = mapPlayerDtoToRuntime({ x: 0, y: 0 });

    expect(result.spriteAssetPath).toBeUndefined();
  });

  it('passes through spriteSet when provided', () => {
    const spriteSet = { default: '/assets/player_front.svg', front: '/assets/player_front.svg' };
    const result = mapPlayerDtoToRuntime({ x: 0, y: 0, spriteSet });

    expect(result.spriteSet).toEqual(spriteSet);
  });

  it('omits spriteSet when not provided', () => {
    const result = mapPlayerDtoToRuntime({ x: 0, y: 0 });

    expect(result.spriteSet).toBeUndefined();
  });

  it('is deterministic — same input always produces the same output', () => {
    const dto = { x: 5, y: 8, spriteAssetPath: '/assets/p.svg' };

    expect(mapPlayerDtoToRuntime(dto)).toEqual(mapPlayerDtoToRuntime(dto));
  });
});
