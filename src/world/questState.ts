import type {
  ItemUseAttemptResult,
  ItemUseAttemptResultEvent,
  QuestChainDefinition,
  QuestChainProgress,
  QuestItemUseResolvedCriteria,
  QuestProgressEvent,
  QuestState,
} from './types';

const INITIAL_QUEST_STATE_VERSION = 1 as const;

const createInitialChainProgress = (chain: QuestChainDefinition): QuestChainProgress => ({
  chainId: chain.chainId,
  status: 'not_started',
  currentStageIndex: 0,
  completedStageIds: [],
});

export const createQuestState = (chains: QuestChainDefinition[] = []): QuestState => ({
  version: INITIAL_QUEST_STATE_VERSION,
  chains,
  progressByChainId: Object.fromEntries(
    chains.map((chain) => [chain.chainId, createInitialChainProgress(chain)]),
  ) as Record<string, QuestChainProgress>,
});

export const ensureQuestState = (
  questState: QuestState | undefined,
  chains: QuestChainDefinition[] = [],
): QuestState => {
  if (questState) {
    return questState;
  }

  return createQuestState(chains);
};

export const toQuestProgressEventFromItemUseAttempt = (
  event: ItemUseAttemptResultEvent,
): QuestProgressEvent => ({
  type: 'item_use_resolved',
  tick: event.tick,
  itemUseEvent: event,
});

const isMatchingItemUseCriteria = (
  criteria: QuestItemUseResolvedCriteria,
  event: ItemUseAttemptResultEvent,
): boolean => {
  if (criteria.result !== undefined && criteria.result !== event.result) {
    return false;
  }

  if (criteria.targetKind !== undefined) {
    if (!event.target || event.target.kind !== criteria.targetKind) {
      return false;
    }
  }

  if (criteria.targetId !== undefined) {
    if (!event.target || event.target.targetId !== criteria.targetId) {
      return false;
    }
  }

  if (criteria.selectedItemId !== undefined) {
    if (!event.selectedItem || event.selectedItem.itemId !== criteria.selectedItemId) {
      return false;
    }
  }

  if (criteria.doorUnlockedId !== undefined && event.doorUnlockedId !== criteria.doorUnlockedId) {
    return false;
  }

  if (
    criteria.affectedEntityType !== undefined &&
    event.affectedEntityType !== criteria.affectedEntityType
  ) {
    return false;
  }

  if (
    criteria.affectedEntityId !== undefined &&
    event.affectedEntityId !== criteria.affectedEntityId
  ) {
    return false;
  }

  return true;
};

const doesEventAdvanceStage = (
  criteria: QuestChainDefinition['stages'][number]['completeWhen'],
  event: QuestProgressEvent,
): boolean => {
  if (criteria.eventType === 'item_use_resolved' && event.type === 'item_use_resolved') {
    return isMatchingItemUseCriteria(criteria, event.itemUseEvent);
  }

  return false;
};

const resolveAdvancedStatus = (
  nextIndex: number,
  totalStages: number,
): QuestChainProgress['status'] => {
  if (nextIndex >= totalStages) {
    return 'completed';
  }

  return 'in_progress';
};

export const applyQuestProgressEvent = (
  questState: QuestState,
  event: QuestProgressEvent,
): QuestState => {
  let didChange = false;
  const nextProgressByChainId: Record<string, QuestChainProgress> = { ...questState.progressByChainId };

  for (const chain of questState.chains) {
    const currentProgress =
      nextProgressByChainId[chain.chainId] ?? createInitialChainProgress(chain);

    if (currentProgress.status === 'completed') {
      nextProgressByChainId[chain.chainId] = currentProgress;
      continue;
    }

    const activeStage = chain.stages[currentProgress.currentStageIndex];
    if (!activeStage) {
      const completedProgress: QuestChainProgress = {
        ...currentProgress,
        status: 'completed',
      };
      nextProgressByChainId[chain.chainId] = completedProgress;
      if (completedProgress.status !== currentProgress.status) {
        didChange = true;
      }
      continue;
    }

    if (!doesEventAdvanceStage(activeStage.completeWhen, event)) {
      nextProgressByChainId[chain.chainId] = currentProgress;
      continue;
    }

    const nextStageIndex = currentProgress.currentStageIndex + 1;
    nextProgressByChainId[chain.chainId] = {
      chainId: chain.chainId,
      currentStageIndex: nextStageIndex,
      status: resolveAdvancedStatus(nextStageIndex, chain.stages.length),
      completedStageIds: [...currentProgress.completedStageIds, activeStage.stageId],
      lastAdvancedTick: event.tick,
    };
    didChange = true;
  }

  if (!didChange) {
    return questState;
  }

  return {
    ...questState,
    progressByChainId: nextProgressByChainId,
  };
};

export const applyQuestProgressEventIfValid = (
  questState: QuestState,
  event: unknown,
): QuestState => {
  if (typeof event !== 'object' || event === null || !('type' in event)) {
    return questState;
  }

  const typedEvent = event as Partial<QuestProgressEvent>;
  if (typedEvent.type !== 'item_use_resolved') {
    return questState;
  }

  if (
    typeof typedEvent.tick !== 'number' ||
    typeof typedEvent.itemUseEvent !== 'object' ||
    typedEvent.itemUseEvent === null
  ) {
    return questState;
  }

  return applyQuestProgressEvent(questState, typedEvent as QuestProgressEvent);
};

export const isQuestChainCompleted = (questState: QuestState, chainId: string): boolean => {
  return questState.progressByChainId[chainId]?.status === 'completed';
};

export const countCompletedQuestChains = (questState: QuestState): number => {
  return Object.values(questState.progressByChainId).filter((progress) => progress.status === 'completed')
    .length;
};

export const didItemUseEventSucceed = (event: ItemUseAttemptResultEvent): boolean => {
  return event.result === ('success' satisfies ItemUseAttemptResult);
};
