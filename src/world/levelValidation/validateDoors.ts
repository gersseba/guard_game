import { validateSpriteSet } from './shared';

/**
 * Validates the doors array of a raw level DTO.
 * DTO-only: does not instantiate runtime classes.
 */
export const validateDoors = (raw: Record<string, unknown>): void => {
  if (!Array.isArray(raw['doors'])) {
    throw new Error('Invalid level data: doors must be an array');
  }

  for (let i = 0; i < (raw['doors'] as unknown[]).length; i++) {
    const door = (raw['doors'] as unknown[])[i] as Record<string, unknown>;
    if (
      typeof door !== 'object' ||
      door === null ||
      typeof door['id'] !== 'string' ||
      typeof door['displayName'] !== 'string' ||
      typeof door['x'] !== 'number' ||
      typeof door['y'] !== 'number' ||
      typeof door['doorState'] !== 'string'
    ) {
      throw new Error(
        `Invalid level data: door at index ${i} must have id, displayName, x, y, and doorState`,
      );
    }

    if (door['outcome'] !== undefined && door['outcome'] !== 'safe' && door['outcome'] !== 'danger') {
      throw new Error(
        `Invalid level data: door at index ${i} has invalid outcome (must be 'safe' or 'danger')`,
      );
    }

    if (door['requiredItemId'] !== undefined && typeof door['requiredItemId'] !== 'string') {
      throw new Error(
        `Invalid level data: door at index ${i} has invalid requiredItemId (must be a string when provided)`,
      );
    }

    if (door['spriteAssetPath'] !== undefined && typeof door['spriteAssetPath'] !== 'string') {
      throw new Error(
        `Invalid level data: door at index ${i} has invalid spriteAssetPath (must be a string when provided)`,
      );
    }

    if (door['spriteSet'] !== undefined) {
      validateSpriteSet(door['spriteSet'], `door at index ${i}`);
    }
  }
};
