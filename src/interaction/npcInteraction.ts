import { REQUEST_FAILURE_FALLBACK_TEXT, type LlmClient } from '../llm/client';
import type { ConversationMessage, Npc, Player, WorldState } from '../world/types';

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
}

export interface NpcInteractionService {
  handleNpcInteraction(request: NpcInteractionRequest): Promise<NpcInteractionResult>;
}

const buildPromptContext = (request: NpcInteractionRequest): string => {
  return [
    `npc:${request.npc.id}`,
    `npcName:${request.npc.displayName}`,
    `dialogueContext:${request.npc.dialogueContextKey}`,
    `player:${request.player.displayName}`,
  ].join('|');
};

export const createNpcInteractionService = (llmClient: LlmClient): NpcInteractionService => ({
  handleNpcInteraction: async (request: NpcInteractionRequest): Promise<NpcInteractionResult> => {
    const previousHistory = request.worldState.npcConversationHistoryByNpcId[request.npc.id] ?? [];
    const playerMessageRecord: ConversationMessage = {
      role: 'player',
      text: request.playerMessage,
    };
    const historyWithPlayerMessage = [...previousHistory, playerMessageRecord];

    const assistantText = await llmClient
      .complete({
        actorId: request.npc.id,
        context: buildPromptContext(request),
        playerMessage: request.playerMessage,
        conversationHistory: historyWithPlayerMessage,
      })
      .then((llmResponse) => llmResponse.text)
      .catch(() => REQUEST_FAILURE_FALLBACK_TEXT);

    const assistantMessageRecord: ConversationMessage = {
      role: 'assistant',
      text: assistantText,
    };

    const updatedHistoryByNpcId = {
      ...request.worldState.npcConversationHistoryByNpcId,
      [request.npc.id]: [...historyWithPlayerMessage, assistantMessageRecord],
    };

    const updatedWorldState: WorldState = {
      ...request.worldState,
      npcConversationHistoryByNpcId: updatedHistoryByNpcId,
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
  const previousHistory = request.worldState.npcConversationHistoryByNpcId[request.npc.id] ?? [];

  return {
    npcId: request.npc.id,
    responseText: fallbackText,
    updatedWorldState: {
      ...request.worldState,
      npcConversationHistoryByNpcId: {
        ...request.worldState.npcConversationHistoryByNpcId,
        [request.npc.id]: [...previousHistory, playerMessageRecord, assistantMessageRecord],
      },
    },
  };
};
