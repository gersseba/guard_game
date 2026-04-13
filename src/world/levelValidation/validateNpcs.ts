import {
  validateGridPositionInBounds,
  validateInventoryItems,
  validateNpcTradeRules,
  validateNpcTriggers,
  validateSpriteSet,
} from './shared';

/**
 * Validates the npcs array of a raw level DTO.
 * DTO-only: does not instantiate runtime classes.
 * Requires grid dimensions to enforce patrol path bounds.
 */
export const validateNpcs = (
  raw: Record<string, unknown>,
  levelWidth: number,
  levelHeight: number,
): void => {
  if (raw['npcs'] === undefined) {
    return;
  }

  if (!Array.isArray(raw['npcs'])) {
    throw new Error('Invalid level data: npcs must be an array');
  }

  for (let i = 0; i < (raw['npcs'] as unknown[]).length; i++) {
    const npc = (raw['npcs'] as unknown[])[i] as Record<string, unknown>;
    if (
      typeof npc !== 'object' ||
      npc === null ||
      typeof npc['id'] !== 'string' ||
      typeof npc['displayName'] !== 'string' ||
      typeof npc['x'] !== 'number' ||
      typeof npc['y'] !== 'number' ||
      typeof npc['npcType'] !== 'string'
    ) {
      throw new Error(
        `Invalid level data: npc at index ${i} must have id, displayName, x, y, and npcType`,
      );
    }

    if (npc['spriteAssetPath'] !== undefined && typeof npc['spriteAssetPath'] !== 'string') {
      throw new Error(
        `Invalid level data: npc at index ${i} has invalid spriteAssetPath (must be a string when provided)`,
      );
    }

    if (npc['spriteSet'] !== undefined) {
      validateSpriteSet(npc['spriteSet'], `npc at index ${i}`);
    }

    if (npc['patrol'] !== undefined) {
      if (
        typeof npc['patrol'] !== 'object' ||
        npc['patrol'] === null ||
        Array.isArray(npc['patrol'])
      ) {
        throw new Error(`Invalid level data: npc at index ${i} patrol must be an object when provided`);
      }

      const patrol = npc['patrol'] as Record<string, unknown>;
      if (!Array.isArray(patrol['path'])) {
        throw new Error(`Invalid level data: npc at index ${i} patrol.path must be an array`);
      }

      for (let pathIndex = 0; pathIndex < patrol['path'].length; pathIndex++) {
        validateGridPositionInBounds(
          patrol['path'][pathIndex],
          `npc at index ${i} patrol.path[${pathIndex}]`,
          levelWidth,
          levelHeight,
        );
      }
    }

    if (npc['triggers'] !== undefined) {
      validateNpcTriggers(npc['triggers'], `npc at index ${i} triggers`);
    }

    if (npc['inventory'] !== undefined) {
      validateInventoryItems(npc['inventory'], `npc at index ${i} inventory`);
    }

    if (npc['tradeRules'] !== undefined) {
      validateNpcTradeRules(npc['tradeRules'], `npc at index ${i} tradeRules`);
    }

    if (npc['knowledgeTokensGrantedOnTalk'] !== undefined) {
      if (!Array.isArray(npc['knowledgeTokensGrantedOnTalk'])) {
        throw new Error(
          `Invalid level data: npc at index ${i} knowledgeTokensGrantedOnTalk must be an array when provided`,
        );
      }

      const knowledgeTokensGrantedOnTalk = npc['knowledgeTokensGrantedOnTalk'] as unknown[];
      if (
        knowledgeTokensGrantedOnTalk.some(
          (tokenId) => typeof tokenId !== 'string' || tokenId.trim() === '',
        )
      ) {
        throw new Error(
          `Invalid level data: npc at index ${i} knowledgeTokensGrantedOnTalk must contain non-empty strings`,
        );
      }
    }

    if (npc['instanceKnowledge'] !== undefined && typeof npc['instanceKnowledge'] !== 'string') {
      throw new Error(
        `Invalid level data: npc at index ${i} has invalid instanceKnowledge (must be a string when provided)`,
      );
    }

    if (npc['instanceBehavior'] !== undefined && typeof npc['instanceBehavior'] !== 'string') {
      throw new Error(
        `Invalid level data: npc at index ${i} has invalid instanceBehavior (must be a string when provided)`,
      );
    }

    if (npc['riddleClue'] !== undefined) {
      const riddleClue = npc['riddleClue'] as Record<string, unknown>;
      if (
        typeof riddleClue !== 'object' ||
        riddleClue === null ||
        typeof riddleClue['clueId'] !== 'string' ||
        typeof riddleClue['doorId'] !== 'string' ||
        (riddleClue['truthBehavior'] !== 'truthful' && riddleClue['truthBehavior'] !== 'inverse')
      ) {
        throw new Error(
          `Invalid level data: npc at index ${i} has invalid riddleClue (must have clueId, doorId, and truthBehavior ('truthful' or 'inverse'))`,
        );
      }
    }
  }
};
