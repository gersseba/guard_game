import { validateItemUseRules, validateSpriteSet } from './shared';

/**
 * Validates the guards array of a raw level DTO.
 * DTO-only: does not instantiate runtime classes.
 */
export const validateGuards = (raw: Record<string, unknown>): void => {
  if (!Array.isArray(raw['guards'])) {
    throw new Error('Invalid level data: guards must be an array');
  }

  for (let i = 0; i < (raw['guards'] as unknown[]).length; i++) {
    const guard = (raw['guards'] as unknown[])[i] as Record<string, unknown>;
    if (
      typeof guard !== 'object' ||
      guard === null ||
      typeof guard['id'] !== 'string' ||
      typeof guard['displayName'] !== 'string' ||
      typeof guard['x'] !== 'number' ||
      typeof guard['y'] !== 'number' ||
      typeof guard['guardState'] !== 'string'
    ) {
      throw new Error(
        `Invalid level data: guard at index ${i} must have id, displayName, x, y, and guardState`,
      );
    }

    if (guard['traits'] !== undefined) {
      if (typeof guard['traits'] !== 'object' || guard['traits'] === null || Array.isArray(guard['traits'])) {
        throw new Error(`Invalid level data: guard at index ${i} has invalid traits (must be a plain object when provided)`);
      }
      const rawTraits = guard['traits'] as Record<string, unknown>;
      for (const [key, value] of Object.entries(rawTraits)) {
        if (typeof value !== 'string') {
          throw new Error(`Invalid level data: guard at index ${i} traits.${key} must be a string`);
        }
      }
    }

    if (guard['spriteAssetPath'] !== undefined && typeof guard['spriteAssetPath'] !== 'string') {
      throw new Error(
        `Invalid level data: guard at index ${i} has invalid spriteAssetPath (must be a string when provided)`,
      );
    }

    if (guard['spriteSet'] !== undefined) {
      validateSpriteSet(guard['spriteSet'], `guard at index ${i}`);
    }

    if (guard['instanceKnowledge'] !== undefined && typeof guard['instanceKnowledge'] !== 'string') {
      throw new Error(
        `Invalid level data: guard at index ${i} has invalid instanceKnowledge (must be a string when provided)`,
      );
    }

    if (guard['instanceBehavior'] !== undefined && typeof guard['instanceBehavior'] !== 'string') {
      throw new Error(
        `Invalid level data: guard at index ${i} has invalid instanceBehavior (must be a string when provided)`,
      );
    }

    if (guard['itemUseRules'] !== undefined) {
      validateItemUseRules(guard['itemUseRules'], `guard at index ${i}`);
    }
  }
};
