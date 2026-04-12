import type { QuestAffectedEntityType, QuestItemUseTargetKind } from '../types';

const VALID_ITEM_USE_RESULTS = new Set(['no-selection', 'no-target', 'blocked', 'success', 'no-rule']);
const VALID_TARGET_KINDS: ReadonlySet<QuestItemUseTargetKind> = new Set([
  'door',
  'guard',
  'npc',
  'interactiveObject',
]);
const VALID_AFFECTED_ENTITY_TYPES: ReadonlySet<QuestAffectedEntityType> = new Set(['guard', 'object']);

export const validateQuestChains = (raw: Record<string, unknown>): void => {
  if (raw['questChains'] === undefined) {
    return;
  }

  if (!Array.isArray(raw['questChains'])) {
    throw new Error('Invalid level data: questChains must be an array when provided');
  }

  const chainIds = new Set<string>();

  for (let chainIndex = 0; chainIndex < raw['questChains'].length; chainIndex++) {
    const chain = raw['questChains'][chainIndex] as Record<string, unknown>;
    if (
      typeof chain !== 'object' ||
      chain === null ||
      typeof chain['chainId'] !== 'string' ||
      chain['chainId'].trim() === '' ||
      typeof chain['displayName'] !== 'string' ||
      chain['displayName'].trim() === '' ||
      !Array.isArray(chain['stages']) ||
      chain['stages'].length === 0
    ) {
      throw new Error(
        `Invalid level data: questChain at index ${chainIndex} must include chainId, displayName, and non-empty stages array`,
      );
    }

    if (chainIds.has(chain['chainId'])) {
      throw new Error(`Invalid level data: duplicate questChain chainId "${chain['chainId']}"`);
    }

    chainIds.add(chain['chainId']);

    if (chain['npcId'] !== undefined && (typeof chain['npcId'] !== 'string' || chain['npcId'].trim() === '')) {
      throw new Error(
        `Invalid level data: questChain at index ${chainIndex} has invalid npcId (must be a non-empty string when provided)`,
      );
    }

    const stageIds = new Set<string>();
    const stages = chain['stages'] as unknown[];
    for (let stageIndex = 0; stageIndex < stages.length; stageIndex++) {
      const stage = stages[stageIndex] as Record<string, unknown>;
      if (
        typeof stage !== 'object' ||
        stage === null ||
        typeof stage['stageId'] !== 'string' ||
        stage['stageId'].trim() === '' ||
        typeof stage['completeWhen'] !== 'object' ||
        stage['completeWhen'] === null
      ) {
        throw new Error(
          `Invalid level data: questChain at index ${chainIndex} stage at index ${stageIndex} must include stageId and completeWhen`,
        );
      }

      if (stageIds.has(stage['stageId'])) {
        throw new Error(
          `Invalid level data: questChain at index ${chainIndex} has duplicate stageId "${stage['stageId']}"`,
        );
      }
      stageIds.add(stage['stageId']);

      if (stage['description'] !== undefined && typeof stage['description'] !== 'string') {
        throw new Error(
          `Invalid level data: questChain at index ${chainIndex} stage at index ${stageIndex} has invalid description (must be a string when provided)`,
        );
      }

      const completeWhen = stage['completeWhen'] as Record<string, unknown>;
      if (completeWhen['eventType'] !== 'item_use_resolved') {
        throw new Error(
          `Invalid level data: questChain at index ${chainIndex} stage at index ${stageIndex} completeWhen.eventType must be "item_use_resolved"`,
        );
      }

      if (completeWhen['result'] !== undefined && !VALID_ITEM_USE_RESULTS.has(String(completeWhen['result']))) {
        throw new Error(
          `Invalid level data: questChain at index ${chainIndex} stage at index ${stageIndex} has invalid completeWhen.result`,
        );
      }

      if (
        completeWhen['targetKind'] !== undefined &&
        !VALID_TARGET_KINDS.has(completeWhen['targetKind'] as QuestItemUseTargetKind)
      ) {
        throw new Error(
          `Invalid level data: questChain at index ${chainIndex} stage at index ${stageIndex} has invalid completeWhen.targetKind`,
        );
      }

      if (
        completeWhen['targetId'] !== undefined &&
        (typeof completeWhen['targetId'] !== 'string' || completeWhen['targetId'].trim() === '')
      ) {
        throw new Error(
          `Invalid level data: questChain at index ${chainIndex} stage at index ${stageIndex} has invalid completeWhen.targetId`,
        );
      }

      if (
        completeWhen['selectedItemId'] !== undefined &&
        (typeof completeWhen['selectedItemId'] !== 'string' || completeWhen['selectedItemId'].trim() === '')
      ) {
        throw new Error(
          `Invalid level data: questChain at index ${chainIndex} stage at index ${stageIndex} has invalid completeWhen.selectedItemId`,
        );
      }

      if (
        completeWhen['doorUnlockedId'] !== undefined &&
        (typeof completeWhen['doorUnlockedId'] !== 'string' || completeWhen['doorUnlockedId'].trim() === '')
      ) {
        throw new Error(
          `Invalid level data: questChain at index ${chainIndex} stage at index ${stageIndex} has invalid completeWhen.doorUnlockedId`,
        );
      }

      if (
        completeWhen['affectedEntityType'] !== undefined &&
        !VALID_AFFECTED_ENTITY_TYPES.has(completeWhen['affectedEntityType'] as QuestAffectedEntityType)
      ) {
        throw new Error(
          `Invalid level data: questChain at index ${chainIndex} stage at index ${stageIndex} has invalid completeWhen.affectedEntityType`,
        );
      }

      if (
        completeWhen['affectedEntityId'] !== undefined &&
        (typeof completeWhen['affectedEntityId'] !== 'string' || completeWhen['affectedEntityId'].trim() === '')
      ) {
        throw new Error(
          `Invalid level data: questChain at index ${chainIndex} stage at index ${stageIndex} has invalid completeWhen.affectedEntityId`,
        );
      }
    }
  }
};
