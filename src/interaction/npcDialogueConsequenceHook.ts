import { Item } from '../world/entities/items/Item';
import { applyKnowledgeTokenOutcome } from '../world/knowledgeState';
import { ensureQuestState, applyQuestProgressEventIfValid } from '../world/questState';
import { resolveNpcTrade } from '../world/npcTrade';
import type { Npc, Player, QuestProgressEvent, WorldState } from '../world/types';

export interface NpcDialogueOutcome {
  giveItem?: string;
  takeItem?: string;
  requireKnowledgeTokens?: string[];
  grantKnowledgeTokens?: string[];
  questProgressEvent?: QuestProgressEvent;
}

export interface NpcDialogueConsequenceRequest {
  npcId: string;
  worldState: WorldState;
  outcome: unknown;
}

export interface NpcDialogueConsequenceTrace {
  outcomeStatus: 'none' | 'accepted' | 'rejected';
  missingKnowledgeTokens: string[];
  inventoryMutated: boolean;
  tradeRuleIdApplied: string | null;
  questStateMutated: boolean;
}

export interface NpcDialogueConsequenceResult {
  updatedWorldState: WorldState;
  trace: NpcDialogueConsequenceTrace;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
};

const hasOnlyAllowedKeys = (record: Record<string, unknown>, allowedKeys: readonly string[]): boolean => {
  return Object.keys(record).every((key) => allowedKeys.includes(key));
};

export const isNpcDialogueOutcome = (value: unknown): value is NpcDialogueOutcome => {
  if (value === undefined) {
    return true;
  }

  if (!isRecord(value)) {
    return false;
  }

  if (
    !hasOnlyAllowedKeys(value, [
      'giveItem',
      'takeItem',
      'requireKnowledgeTokens',
      'grantKnowledgeTokens',
      'questProgressEvent',
    ])
  ) {
    return false;
  }

  if ('giveItem' in value && value.giveItem !== undefined && typeof value.giveItem !== 'string') {
    return false;
  }

  if ('takeItem' in value && value.takeItem !== undefined && typeof value.takeItem !== 'string') {
    return false;
  }

  if (
    'requireKnowledgeTokens' in value &&
    value.requireKnowledgeTokens !== undefined &&
    !isStringArray(value.requireKnowledgeTokens)
  ) {
    return false;
  }

  if (
    'grantKnowledgeTokens' in value &&
    value.grantKnowledgeTokens !== undefined &&
    !isStringArray(value.grantKnowledgeTokens)
  ) {
    return false;
  }

  if (
    'questProgressEvent' in value &&
    value.questProgressEvent !== undefined &&
    !isRecord(value.questProgressEvent)
  ) {
    return false;
  }

  return true;
};

const reindexSelectedSlotAfterRemoval = (
  selectedItem: Player['inventory']['selectedItem'],
  removedSlotIndex: number,
): Player['inventory']['selectedItem'] => {
  if (!selectedItem) {
    return selectedItem;
  }

  if (selectedItem.slotIndex === removedSlotIndex) {
    return null;
  }

  if (selectedItem.slotIndex > removedSlotIndex) {
    return {
      ...selectedItem,
      slotIndex: selectedItem.slotIndex - 1,
    };
  }

  return selectedItem;
};

const applyInventoryOutcome = (
  npc: Npc,
  player: Player,
  outcome: NpcDialogueOutcome | undefined,
): { npc: Npc; player: Player; inventoryMutated: boolean } => {
  if (!outcome) {
    return { npc, player, inventoryMutated: false };
  }

  const npcItems = [...(npc.inventory ?? [])];
  const playerItems = [...player.inventory.items];
  let selectedItem = player.inventory.selectedItem ?? null;
  let npcInventoryChanged = false;
  let playerInventoryChanged = false;

  if (typeof outcome.giveItem === 'string') {
    const transferResult = Item.takeFirstByItemId(npcItems, outcome.giveItem);
    npcItems.splice(0, npcItems.length, ...transferResult.remainingItems);
    if (transferResult.item) {
      playerItems.push(transferResult.item.toInventoryItem());
      npcInventoryChanged = true;
      playerInventoryChanged = true;
    }
  }

  if (typeof outcome.takeItem === 'string') {
    const playerItemIndex = playerItems.findIndex((item) => item.itemId === outcome.takeItem);
    const transferResult = Item.takeFirstByItemId(playerItems, outcome.takeItem);
    playerItems.splice(0, playerItems.length, ...transferResult.remainingItems);
    if (transferResult.item) {
      selectedItem = reindexSelectedSlotAfterRemoval(selectedItem, playerItemIndex) ?? null;
      npcItems.push(transferResult.item.toInventoryItem());
      npcInventoryChanged = true;
      playerInventoryChanged = true;
    }
  }

  const nextNpc = npcInventoryChanged
    ? {
        ...npc,
        inventory: npcItems,
      }
    : npc;

  const nextPlayer = playerInventoryChanged
    ? {
        ...player,
        inventory: {
          ...player.inventory,
          items: playerItems,
          selectedItem,
        },
      }
    : player;

  return {
    npc: nextNpc,
    player: nextPlayer,
    inventoryMutated: npcInventoryChanged || playerInventoryChanged,
  };
};

const replaceNpc = (worldState: WorldState, npc: Npc): WorldState => {
  return {
    ...worldState,
    npcs: worldState.npcs.map((candidate) => (candidate.id === npc.id ? npc : candidate)),
  };
};

const applyQuestProgressEvent = (
  worldState: WorldState,
  outcome: NpcDialogueOutcome,
): { worldState: WorldState; questStateMutated: boolean } => {
  if (!outcome.questProgressEvent) {
    return {
      worldState,
      questStateMutated: false,
    };
  }

  const currentQuestState = ensureQuestState(worldState.questState);
  const nextQuestState = applyQuestProgressEventIfValid(currentQuestState, outcome.questProgressEvent);
  if (nextQuestState === currentQuestState) {
    return {
      worldState,
      questStateMutated: false,
    };
  }

  return {
    worldState: {
      ...worldState,
      questState: nextQuestState,
    },
    questStateMutated: true,
  };
};

export const applyNpcDialogueConsequences = (
  request: NpcDialogueConsequenceRequest,
): NpcDialogueConsequenceResult => {
  const npc = request.worldState.npcs.find((candidate) => candidate.id === request.npcId);
  if (!npc) {
    return {
      updatedWorldState: request.worldState,
      trace: {
        outcomeStatus: 'rejected',
        missingKnowledgeTokens: [],
        inventoryMutated: false,
        tradeRuleIdApplied: null,
        questStateMutated: false,
      },
    };
  }

  if (!isNpcDialogueOutcome(request.outcome)) {
    return {
      updatedWorldState: request.worldState,
      trace: {
        outcomeStatus: 'rejected',
        missingKnowledgeTokens: [],
        inventoryMutated: false,
        tradeRuleIdApplied: null,
        questStateMutated: false,
      },
    };
  }

  const normalizedOutcome = request.outcome;
  if (normalizedOutcome === undefined) {
    return {
      updatedWorldState: request.worldState,
      trace: {
        outcomeStatus: 'none',
        missingKnowledgeTokens: [],
        inventoryMutated: false,
        tradeRuleIdApplied: null,
        questStateMutated: false,
      },
    };
  }

  const knowledgeResolution = applyKnowledgeTokenOutcome(
    request.worldState.knowledgeState,
    normalizedOutcome,
    {
      tick: request.worldState.tick,
      grantedByActorId: request.npcId,
    },
  );
  if (!knowledgeResolution.isValid) {
    return {
      updatedWorldState: request.worldState,
      trace: {
        outcomeStatus: 'rejected',
        missingKnowledgeTokens: knowledgeResolution.missingKnowledgeTokens,
        inventoryMutated: false,
        tradeRuleIdApplied: null,
        questStateMutated: false,
      },
    };
  }

  const stateWithKnowledgeTokens: WorldState = {
    ...request.worldState,
    knowledgeState: knowledgeResolution.knowledgeState,
  };

  const npcAfterKnowledge =
    stateWithKnowledgeTokens.npcs.find((candidate) => candidate.id === request.npcId) ?? npc;
  const tradeResult = resolveNpcTrade(
    npcAfterKnowledge,
    stateWithKnowledgeTokens.player,
    stateWithKnowledgeTokens.tick,
  );

  const inventoryResult = applyInventoryOutcome(
    tradeResult.npc,
    tradeResult.player,
    tradeResult.npc.tradeRules?.length ? undefined : normalizedOutcome,
  );

  const stateWithNpcPlayer = replaceNpc(
    {
      ...stateWithKnowledgeTokens,
      player: inventoryResult.player,
    },
    inventoryResult.npc,
  );

  const questResult = applyQuestProgressEvent(stateWithNpcPlayer, normalizedOutcome);

  return {
    updatedWorldState: questResult.worldState,
    trace: {
      outcomeStatus: 'accepted',
      missingKnowledgeTokens: [],
      inventoryMutated: inventoryResult.inventoryMutated,
      tradeRuleIdApplied: tradeResult.appliedRuleId,
      questStateMutated: questResult.questStateMutated,
    },
  };
};
