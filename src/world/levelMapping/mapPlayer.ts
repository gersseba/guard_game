import type { LevelPlayerDto, Player } from '../types';

/**
 * Maps a flat LevelPlayerDto to the runtime Player shape.
 * Pure function — same input always produces the same output.
 */
export const mapPlayerDtoToRuntime = (dto: LevelPlayerDto): Player => ({
  id: 'player',
  displayName: 'Player',
  position: { x: dto.x, y: dto.y },
  inventory: {
    items: [],
    selectedItem: null,
  },
  facingDirection: 'front',
  ...(dto.spriteAssetPath !== undefined ? { spriteAssetPath: dto.spriteAssetPath } : {}),
  ...(dto.spriteSet !== undefined ? { spriteSet: dto.spriteSet } : {}),
});
