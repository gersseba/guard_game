import type { ItemUseAttemptResult, ItemUseAttemptResultEvent } from './inventory.js';

export type QuestItemUseTargetKind = 'door' | 'guard' | 'npc' | 'interactiveObject';
export type QuestAffectedEntityType = 'guard' | 'object';

export interface QuestItemUseResolvedCriteria {
  eventType: 'item_use_resolved';
  result?: ItemUseAttemptResult;
  targetKind?: QuestItemUseTargetKind;
  targetId?: string;
  selectedItemId?: string;
  doorUnlockedId?: string;
  affectedEntityType?: QuestAffectedEntityType;
  affectedEntityId?: string;
}

export type QuestProgressCriteria = QuestItemUseResolvedCriteria;

export interface QuestStageDefinition {
  stageId: string;
  description?: string;
  completeWhen: QuestProgressCriteria;
}

export interface QuestChainDefinition {
  chainId: string;
  displayName: string;
  npcId?: string;
  stages: QuestStageDefinition[];
}

export type QuestChainStatus = 'not_started' | 'in_progress' | 'completed';

export interface QuestChainProgress {
  chainId: string;
  status: QuestChainStatus;
  currentStageIndex: number;
  completedStageIds: string[];
  lastAdvancedTick?: number;
}

export interface QuestState {
  version: 1;
  chains: QuestChainDefinition[];
  progressByChainId: Record<string, QuestChainProgress>;
}

export interface QuestItemUseResolvedEvent {
  type: 'item_use_resolved';
  tick: number;
  itemUseEvent: ItemUseAttemptResultEvent;
}

export type QuestProgressEvent = QuestItemUseResolvedEvent;
