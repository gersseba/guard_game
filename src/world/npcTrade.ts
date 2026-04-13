import { Item } from './entities/items/Item';
import { validateKnowledgeTokenRequirements } from './knowledgeState';
import type { InventoryItem, Npc, Player } from './types';
import type { KnowledgeState } from './types';

export interface NpcTradeResolution {
  npc: Npc;
  player: Player;
  appliedRuleId: string | null;
  missingKnowledgeTokens: string[];
}

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

const takeRequiredItems = (
  inventoryItems: InventoryItem[],
  requiredItemIds: string[],
  selectedItem: Player['inventory']['selectedItem'],
): { remainingItems: InventoryItem[]; selectedItem: Player['inventory']['selectedItem'] } | null => {
  let remainingItems = [...inventoryItems];
  let nextSelectedItem: Player['inventory']['selectedItem'] = selectedItem ?? null;

  for (const requiredItemId of requiredItemIds) {
    const removedIndex = remainingItems.findIndex((item) => item.itemId === requiredItemId);
    const transferResult = Item.takeFirstByItemId(remainingItems, requiredItemId);
    if (!transferResult.item) {
      return null;
    }

    remainingItems = transferResult.remainingItems;
    nextSelectedItem = reindexSelectedSlotAfterRemoval(nextSelectedItem, removedIndex);
  }

  return {
    remainingItems,
    selectedItem: nextSelectedItem,
  };
};

export const resolveNpcTrade = (
  npc: Npc,
  player: Player,
  currentTick: number,
  knowledgeState?: KnowledgeState,
): NpcTradeResolution => {
  const tradeRules = npc.tradeRules ?? [];
  if (tradeRules.length === 0) {
    return {
      npc,
      player,
      appliedRuleId: null,
      missingKnowledgeTokens: [],
    };
  }

  const completedRuleIds = new Set(npc.tradeState?.completedRuleIds ?? []);
  let firstMissingKnowledgeTokens: string[] = [];

  for (const rule of tradeRules) {
    if (completedRuleIds.has(rule.ruleId)) {
      continue;
    }

    const knowledgeValidation = validateKnowledgeTokenRequirements(
      knowledgeState,
      rule.requiredKnowledgeTokens ?? [],
    );
    if (!knowledgeValidation.isValid) {
      if (firstMissingKnowledgeTokens.length === 0) {
        firstMissingKnowledgeTokens = knowledgeValidation.missingKnowledgeTokens;
      }
      continue;
    }

    const tradeConsumption = takeRequiredItems(
      player.inventory.items,
      rule.requiredItemIds ?? [],
      player.inventory.selectedItem ?? null,
    );
    if (!tradeConsumption) {
      continue;
    }

    const rewardItems = rule.rewardItems.map((rewardItem) =>
      Item.fromInventoryItem({
        itemId: rewardItem.itemId,
        displayName: rewardItem.displayName,
        sourceObjectId: npc.id,
        pickedUpAtTick: currentTick,
      }).toInventoryItem(),
    );

    return {
      npc: {
        ...npc,
        tradeState: {
          completedRuleIds: [...completedRuleIds, rule.ruleId],
        },
      },
      player: {
        ...player,
        inventory: {
          ...player.inventory,
            items: [...tradeConsumption.remainingItems, ...rewardItems],
            selectedItem: tradeConsumption.selectedItem,
        },
      },
      appliedRuleId: rule.ruleId,
      missingKnowledgeTokens: [],
    };
  }

  return {
    npc,
    player,
    appliedRuleId: null,
    missingKnowledgeTokens: firstMissingKnowledgeTokens,
  };
};