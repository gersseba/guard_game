import { validateSpriteSet } from './shared';

/**
 * Validates the player section of a raw level DTO.
 * DTO-only: does not instantiate runtime classes.
 */
export const validatePlayer = (raw: Record<string, unknown>): void => {
  const player = raw['player'];
  if (
    typeof player !== 'object' ||
    player === null ||
    typeof (player as Record<string, unknown>)['x'] !== 'number' ||
    typeof (player as Record<string, unknown>)['y'] !== 'number'
  ) {
    throw new Error('Invalid level data: player must have numeric x and y');
  }

  if (
    (player as Record<string, unknown>)['spriteAssetPath'] !== undefined &&
    typeof (player as Record<string, unknown>)['spriteAssetPath'] !== 'string'
  ) {
    throw new Error('Invalid level data: player spriteAssetPath must be a string when provided');
  }

  if ((player as Record<string, unknown>)['spriteSet'] !== undefined) {
    validateSpriteSet((player as Record<string, unknown>)['spriteSet'], 'player');
  }
};
