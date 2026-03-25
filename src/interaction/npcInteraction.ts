import type { LlmClient } from '../llm/client';
import type { Npc, Player } from '../world/types';

export interface NpcInteractionRequest {
  npc: Npc;
  player: Player;
}

export interface NpcInteractionResult {
  npcId: string;
  responseText: string;
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
    const llmResponse = await llmClient.complete({
      actorId: request.npc.id,
      context: buildPromptContext(request),
      playerMessage: `${request.player.displayName} interacts.`,
    });

    return {
      npcId: request.npc.id,
      responseText: `${request.npc.displayName}: ${llmResponse.text}`,
    };
  },
});

export const handleNpcInteraction = async (
  request: NpcInteractionRequest,
): Promise<NpcInteractionResult> => {
  return {
    npcId: request.npc.id,
    responseText: `${request.npc.displayName} has nothing to say yet.`,
  };
};
