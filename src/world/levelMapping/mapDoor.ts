import type { Door, LevelDoorDto } from '../types';

/**
 * Maps a flat LevelDoorDto to the runtime Door shape.
 * Pure function — same input always produces the same output.
 */
export const mapDoorDtoToRuntime = (dto: LevelDoorDto): Door => ({
  id: dto.id,
  displayName: dto.displayName,
  position: { x: dto.x, y: dto.y },
  doorState: dto.doorState,
  ...(dto.outcome !== undefined ? { outcome: dto.outcome } : {}),
  ...(dto.requiredItemId !== undefined ? { requiredItemId: dto.requiredItemId } : {}),
  isUnlocked: false,
  ...(dto.spriteAssetPath !== undefined ? { spriteAssetPath: dto.spriteAssetPath } : {}),
  ...(dto.spriteSet !== undefined ? { spriteSet: dto.spriteSet } : {}),
});
