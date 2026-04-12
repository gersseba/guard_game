/**
 * Shared validation helpers used across domain-specific level validators.
 * All helpers operate on plain DTO values (no runtime class instantiation).
 */

const SPRITE_SET_KEYS = ['default', 'front', 'away', 'left', 'right'] as const;

export const validateSpriteSet = (value: unknown, contextLabel: string): void => {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`Invalid level data: ${contextLabel} spriteSet must be an object when provided`);
  }

  const raw = value as Record<string, unknown>;
  let hasAnyPath = false;
  for (const key of SPRITE_SET_KEYS) {
    const path = raw[key];
    if (path === undefined) {
      continue;
    }
    if (typeof path !== 'string') {
      throw new Error(`Invalid level data: ${contextLabel} spriteSet.${key} must be a string when provided`);
    }
    hasAnyPath = true;
  }

  if (!hasAnyPath) {
    throw new Error(`Invalid level data: ${contextLabel} spriteSet must provide at least one sprite path`);
  }
};

export const validateItemUseRules = (value: unknown, contextLabel: string): void => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid level data: ${contextLabel} itemUseRules must be an object when provided`);
  }

  const rawRules = value as Record<string, unknown>;
  for (const [itemId, rule] of Object.entries(rawRules)) {
    if (typeof rule !== 'object' || rule === null || Array.isArray(rule)) {
      throw new Error(
        `Invalid level data: ${contextLabel} itemUseRules.${itemId} must be an object with allowed and responseText`,
      );
    }

    const rawRule = rule as Record<string, unknown>;
    if (typeof rawRule['allowed'] !== 'boolean') {
      throw new Error(
        `Invalid level data: ${contextLabel} itemUseRules.${itemId}.allowed must be a boolean`,
      );
    }

    if (typeof rawRule['responseText'] !== 'string') {
      throw new Error(
        `Invalid level data: ${contextLabel} itemUseRules.${itemId}.responseText must be a string`,
      );
    }
  }
};

export const validateObjectCapabilities = (value: unknown, contextLabel: string): void => {
  if (value === undefined) {
    return;
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid level data: ${contextLabel} capabilities must be an object when provided`);
  }

  const rawCapabilities = value as Record<string, unknown>;
  for (const [key, val] of Object.entries(rawCapabilities)) {
    if (key !== 'containsItems' && key !== 'isActivatable' && key !== 'isLockable') {
      throw new Error(`Invalid level data: ${contextLabel} capabilities has unknown key '${key}'`);
    }
    if (typeof val !== 'boolean') {
      throw new Error(
        `Invalid level data: ${contextLabel} capabilities.${key} must be a boolean when provided`,
      );
    }
  }
};

export const validateGridPositionInBounds = (
  value: unknown,
  contextLabel: string,
  gridWidth: number,
  gridHeight: number,
): void => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid level data: ${contextLabel} must be an object with numeric x and y`);
  }

  const position = value as Record<string, unknown>;
  if (typeof position['x'] !== 'number' || typeof position['y'] !== 'number') {
    throw new Error(`Invalid level data: ${contextLabel} must include numeric x and y`);
  }

  if (
    position['x'] < 0 ||
    position['x'] >= gridWidth ||
    position['y'] < 0 ||
    position['y'] >= gridHeight
  ) {
    throw new Error(
      `Invalid level data: ${contextLabel} is out of bounds at (${position['x']}, ${position['y']})`,
    );
  }
};

export const validateTriggerEffect = (value: unknown, contextLabel: string): void => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid level data: ${contextLabel} must be an object when provided`);
  }

  const effect = value as Record<string, unknown>;
  if (typeof effect['setFact'] !== 'string' || effect['setFact'].trim() === '') {
    throw new Error(`Invalid level data: ${contextLabel}.setFact must be a non-empty string`);
  }

  const effectValue = effect['value'];
  if (
    typeof effectValue !== 'string' &&
    typeof effectValue !== 'boolean' &&
    typeof effectValue !== 'number'
  ) {
    throw new Error(
      `Invalid level data: ${contextLabel}.value must be a string, boolean, or number`,
    );
  }
};

export const validateNpcTriggers = (value: unknown, contextLabel: string): void => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid level data: ${contextLabel} must be an object when provided`);
  }

  const triggers = value as Record<string, unknown>;
  for (const key of Object.keys(triggers)) {
    if (key !== 'onApproach' && key !== 'onTalk') {
      throw new Error(`Invalid level data: ${contextLabel} has unknown key '${key}'`);
    }
  }

  if (triggers['onApproach'] !== undefined) {
    validateTriggerEffect(triggers['onApproach'], `${contextLabel}.onApproach`);
  }

  if (triggers['onTalk'] !== undefined) {
    validateTriggerEffect(triggers['onTalk'], `${contextLabel}.onTalk`);
  }
};

export const validateInventoryItems = (value: unknown, contextLabel: string): void => {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid level data: ${contextLabel} must be an array when provided`);
  }

  for (let index = 0; index < value.length; index++) {
    const item = value[index] as Record<string, unknown>;
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof item['itemId'] !== 'string' ||
      typeof item['displayName'] !== 'string' ||
      typeof item['sourceObjectId'] !== 'string' ||
      typeof item['pickedUpAtTick'] !== 'number'
    ) {
      throw new Error(
        `Invalid level data: ${contextLabel}[${index}] must include itemId, displayName, sourceObjectId, and pickedUpAtTick`,
      );
    }
  }
};

export const validateNpcTradeRules = (value: unknown, contextLabel: string): void => {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid level data: ${contextLabel} must be an array when provided`);
  }

  const seenRuleIds = new Set<string>();

  for (let index = 0; index < value.length; index++) {
    const rule = value[index] as Record<string, unknown>;
    if (
      typeof rule !== 'object' ||
      rule === null ||
      typeof rule['ruleId'] !== 'string' ||
      rule['ruleId'].trim() === ''
    ) {
      throw new Error(
        `Invalid level data: ${contextLabel}[${index}] must include a non-empty ruleId`,
      );
    }

    if (seenRuleIds.has(rule['ruleId'])) {
      throw new Error(
        `Invalid level data: ${contextLabel}[${index}].ruleId must be unique`,
      );
    }
    seenRuleIds.add(rule['ruleId']);

    if (!Array.isArray(rule['requiredItemIds'])) {
      throw new Error(
        `Invalid level data: ${contextLabel}[${index}].requiredItemIds must be an array`,
      );
    }

    const requiredItemIds = rule['requiredItemIds'] as unknown[];
    if (
      requiredItemIds.length === 0 ||
      requiredItemIds.some((itemId) => typeof itemId !== 'string' || itemId.trim() === '')
    ) {
      throw new Error(
        `Invalid level data: ${contextLabel}[${index}].requiredItemIds must contain non-empty strings`,
      );
    }

    if (!Array.isArray(rule['rewardItems'])) {
      throw new Error(
        `Invalid level data: ${contextLabel}[${index}].rewardItems must be an array`,
      );
    }

    const rewardItems = rule['rewardItems'] as unknown[];
    if (rewardItems.length === 0) {
      throw new Error(
        `Invalid level data: ${contextLabel}[${index}].rewardItems must contain at least one reward item`,
      );
    }

    for (let rewardIndex = 0; rewardIndex < rewardItems.length; rewardIndex++) {
      const rewardItem = rewardItems[rewardIndex] as Record<string, unknown>;
      if (
        typeof rewardItem !== 'object' ||
        rewardItem === null ||
        typeof rewardItem['itemId'] !== 'string' ||
        rewardItem['itemId'].trim() === '' ||
        typeof rewardItem['displayName'] !== 'string' ||
        rewardItem['displayName'].trim() === ''
      ) {
        throw new Error(
          `Invalid level data: ${contextLabel}[${index}].rewardItems[${rewardIndex}] must include non-empty itemId and displayName`,
        );
      }
    }
  }
};
