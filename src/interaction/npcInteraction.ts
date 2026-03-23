import type { Npc, Player } from '../world/types';

export interface NpcInteractionRequest {
  npc: Npc;
  player: Player;
}

export interface NpcInteractionResult {
  npcId: string;
  responseText: string;
}

export const handleNpcInteraction = async (
  request: NpcInteractionRequest,
): Promise<NpcInteractionResult> => {
  return {
    npcId: request.npc.id,
    responseText: `${request.npc.displayName} has nothing to say yet.`,
  };
};
