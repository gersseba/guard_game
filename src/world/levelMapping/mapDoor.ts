import type { Door, LevelDoorDto } from '../types';

/**
 * Maps a flat LevelDoorDto to the runtime Door shape.
 * Pure function — same input always produces the same output.
 */
export const mapDoorDtoToRuntime = (dto: LevelDoorDto): Door => {
  return {
    id: dto.id,
    displayName: dto.displayName,
    position: { x: dto.x, y: dto.y },
    isOpen: dto.isOpen,
    isLocked: dto.isLocked,
    ...(dto.isSafe !== undefined ? { isSafe: dto.isSafe } : {}),
    ...(dto.requiredItemId !== undefined ? { requiredItemId: dto.requiredItemId } : {}),
    ...(dto.spriteAssetPath !== undefined ? { spriteAssetPath: dto.spriteAssetPath } : {}),
    ...(dto.spriteSet !== undefined ? { spriteSet: dto.spriteSet } : {}),
  };
};
