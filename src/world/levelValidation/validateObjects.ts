import { validateItemUseRules, validateObjectCapabilities, validateSpriteSet } from './shared';

/**
 * Validates the interactiveObjects array of a raw level DTO.
 * DTO-only: does not instantiate runtime classes.
 */
export const validateObjects = (raw: Record<string, unknown>): void => {
  if (raw['interactiveObjects'] === undefined) {
    return;
  }

  if (!Array.isArray(raw['interactiveObjects'])) {
    throw new Error('Invalid level data: interactiveObjects must be an array');
  }

  for (let i = 0; i < (raw['interactiveObjects'] as unknown[]).length; i++) {
    const interactiveObject = (raw['interactiveObjects'] as unknown[])[i] as Record<string, unknown>;
    if (
      typeof interactiveObject !== 'object' ||
      interactiveObject === null ||
      typeof interactiveObject['id'] !== 'string' ||
      typeof interactiveObject['displayName'] !== 'string' ||
      typeof interactiveObject['x'] !== 'number' ||
      typeof interactiveObject['y'] !== 'number' ||
      typeof interactiveObject['objectType'] !== 'string' ||
      (interactiveObject['interactionType'] !== 'inspect' &&
        interactiveObject['interactionType'] !== 'use' &&
        interactiveObject['interactionType'] !== 'talk') ||
      (interactiveObject['state'] !== 'idle' && interactiveObject['state'] !== 'used')
    ) {
      throw new Error(
        `Invalid level data: interactiveObject at index ${i} must have id, displayName, x, y, objectType (string), interactionType, and state`,
      );
    }

    if (
      interactiveObject['firstUseOutcome'] !== undefined &&
      interactiveObject['firstUseOutcome'] !== 'win' &&
      interactiveObject['firstUseOutcome'] !== 'lose'
    ) {
      throw new Error(
        `Invalid level data: interactiveObject at index ${i} has invalid firstUseOutcome (must be 'win' or 'lose')`,
      );
    }

    if (interactiveObject['pickupItem'] !== undefined) {
      const pickupItem = interactiveObject['pickupItem'] as Record<string, unknown>;
      if (
        typeof pickupItem !== 'object' ||
        pickupItem === null ||
        typeof pickupItem['itemId'] !== 'string' ||
        pickupItem['itemId'].trim() === '' ||
        typeof pickupItem['displayName'] !== 'string' ||
        pickupItem['displayName'].trim() === ''
      ) {
        throw new Error(
          `Invalid level data: interactiveObject at index ${i} has invalid pickupItem (must include non-empty string itemId and displayName)`,
        );
      }
    }

    if (
      interactiveObject['spriteAssetPath'] !== undefined &&
      typeof interactiveObject['spriteAssetPath'] !== 'string'
    ) {
      throw new Error(
        `Invalid level data: interactiveObject at index ${i} has invalid spriteAssetPath (must be a string when provided)`,
      );
    }

    if (interactiveObject['spriteSet'] !== undefined) {
      validateSpriteSet(interactiveObject['spriteSet'], `interactiveObject at index ${i}`);
    }

    if (interactiveObject['capabilities'] !== undefined) {
      validateObjectCapabilities(interactiveObject['capabilities'], `interactiveObject at index ${i}`);
    }

    if (interactiveObject['itemUseRules'] !== undefined) {
      validateItemUseRules(interactiveObject['itemUseRules'], `interactiveObject at index ${i}`);
    }
  }
};
