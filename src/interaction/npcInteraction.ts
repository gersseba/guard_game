import { REQUEST_FAILURE_FALLBACK_TEXT, type LlmClient } from '../llm/client';
import type { ConversationMessage, Npc, Player, WorldState } from '../world/types';
import { buildNpcPromptContext } from './npcPromptContext';

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

export const createNpcInteractionService = (llmClient: LlmClient): NpcInteractionService => ({
  handleNpcInteraction: async (request: NpcInteractionRequest): Promise<NpcInteractionResult> => {
    const previousHistory =
      request.worldState.actorConversationHistoryByActorId[request.npc.id] ?? [];
    const playerMessageRecord: ConversationMessage = {
      role: 'player',
      text: request.playerMessage,
    };
    const historyWithPlayerMessage = [...previousHistory, playerMessageRecord];

    const assistantText = await llmClient
      .complete({
        actorId: request.npc.id,
        context: buildNpcPromptContext(request.npc, request.player, request.worldState),
        playerMessage: request.playerMessage,
        conversationHistory: historyWithPlayerMessage,
      })
      .then((llmResponse) => llmResponse.text)
      .catch(() => REQUEST_FAILURE_FALLBACK_TEXT);

    const assistantMessageRecord: ConversationMessage = {
      role: 'assistant',
      text: assistantText,
    };

    const updatedHistoryByActorId = {
      ...request.worldState.actorConversationHistoryByActorId,
      [request.npc.id]: [...historyWithPlayerMessage, assistantMessageRecord],
    };

    const updatedWorldState: WorldState = {
      ...request.worldState,
      actorConversationHistoryByActorId: updatedHistoryByActorId,
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
