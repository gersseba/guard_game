import { isLlmRequestError, type LlmRequestError, type LlmClient } from '../llm/client';
import { Item } from '../world/entities/items/Item';
import type { ConversationMessage, Npc, Player, WorldState } from '../world/types';
import { buildNpcPromptContext } from './npcPromptContext';

interface NpcInteractionOutcome {
  giveItem?: string;
  takeItem?: string;
}

const applyTalkTrigger = (npc: Npc): Npc => {
  const talkTrigger = npc.triggers?.onTalk;
  if (!talkTrigger) {
    return npc;
  }

  return {
    ...npc,
    facts: {
      ...(npc.facts ?? {}),
      [talkTrigger.setFact]: talkTrigger.value,
    },
  };
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
  outcome: NpcInteractionOutcome | undefined,
): { npc: Npc; player: Player } => {
  if (!outcome) {
    return { npc, player };
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
  };
};

export interface NpcInteractionRequest {
  npc: Npc;
  player: Player;
  worldState: WorldState;
  playerMessage: string;
}

export interface NpcInteractionResult {
  npcId: string;
  responseText: string;
  updatedWorldState: WorldState;
  llmError?: LlmRequestError;
}

export interface NpcInteractionService {
  handleNpcInteraction(request: NpcInteractionRequest): Promise<NpcInteractionResult>;
}

export const createNpcInteractionService = (llmClient: LlmClient): NpcInteractionService => ({
  handleNpcInteraction: async (request: NpcInteractionRequest): Promise<NpcInteractionResult> => {
    const previousHistory =
      request.worldState.actorConversationHistoryByActorId[request.npc.id] ?? [];
    const playerMessageRecord: ConversationMessage = {
      role: 'player',
      text: request.playerMessage,
    };
    const historyWithPlayerMessage = [...previousHistory, playerMessageRecord];

    const llmResult = await llmClient
      .complete({
        actorId: request.npc.id,
        context: buildNpcPromptContext(request.npc, request.player, request.worldState),
        playerMessage: request.playerMessage,
        conversationHistory: historyWithPlayerMessage,
      })
      .catch((err: unknown): LlmRequestError => ({
        kind: 'llm_request_error',
        message: err instanceof Error ? err.message : 'Unknown error',
      }));

    if (isLlmRequestError(llmResult)) {
      const updatedHistoryByActorId = {
        ...request.worldState.actorConversationHistoryByActorId,
        [request.npc.id]: historyWithPlayerMessage,
      };
      const updatedWorldState: WorldState = {
        ...request.worldState,
        actorConversationHistoryByActorId: updatedHistoryByActorId,
      };

      return {
        npcId: request.npc.id,
        responseText: '',
        llmError: llmResult,
        updatedWorldState,
      };
    }

    const assistantText = llmResult.text;

    const assistantMessageRecord: ConversationMessage = {
      role: 'assistant',
      text: assistantText,
    };

    const updatedHistoryByActorId = {
      ...request.worldState.actorConversationHistoryByActorId,
      [request.npc.id]: [...historyWithPlayerMessage, assistantMessageRecord],
    };

    const stateWithUpdatedHistory: WorldState = {
      ...request.worldState,
      actorConversationHistoryByActorId: updatedHistoryByActorId,
    };

    const npcFromWorldState =
      stateWithUpdatedHistory.npcs.find((candidate) => candidate.id === request.npc.id) ?? request.npc;
    const npcAfterTalkTrigger = applyTalkTrigger(npcFromWorldState);
    const inventoryResult = applyInventoryOutcome(
      npcAfterTalkTrigger,
      stateWithUpdatedHistory.player,
      'outcome' in llmResult ? llmResult.outcome : undefined,
    );

    const updatedWorldState: WorldState = {
      ...stateWithUpdatedHistory,
      player: inventoryResult.player,
      npcs: stateWithUpdatedHistory.npcs.map((npc) =>
        npc.id === request.npc.id ? inventoryResult.npc : npc,
      ),
    };

    return {
      npcId: request.npc.id,
      responseText: `${request.npc.displayName}: ${assistantText}`,
      updatedWorldState,
    };
  },
});

export const handleNpcInteraction = async (
  request: NpcInteractionRequest,
): Promise<NpcInteractionResult> => {
  const fallbackText = `${request.npc.displayName} has nothing to say yet.`;
  const playerMessageRecord: ConversationMessage = {
    role: 'player',
    text: request.playerMessage,
  };
  const assistantMessageRecord: ConversationMessage = {
    role: 'assistant',
    text: fallbackText,
  };
  const previousHistory = request.worldState.actorConversationHistoryByActorId[request.npc.id] ?? [];

  return {
    npcId: request.npc.id,
    responseText: `${request.npc.displayName}: ${fallbackText}`,
    updatedWorldState: {
      ...request.worldState,
      actorConversationHistoryByActorId: {
        ...request.worldState.actorConversationHistoryByActorId,
        [request.npc.id]: [
          ...previousHistory,
          playerMessageRecord,
          assistantMessageRecord,
        ],
      },
    },
  };
};
