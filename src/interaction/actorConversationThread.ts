import type { ConversationMessage, WorldState } from '../world/types';

const formatConversationLine = (message: ConversationMessage): string => {
  const speaker = message.role === 'player' ? 'Player' : 'NPC';
  return `${speaker}: ${message.text}`;
};

export const getActorConversationHistory = (
  worldState: WorldState,
  actorId: string,
): ConversationMessage[] => worldState.actorConversationHistoryByActorId[actorId] ?? [];

export const renderActorConversationThread = (
  worldState: WorldState,
  actorId: string,
): string => getActorConversationHistory(worldState, actorId).map(formatConversationLine).join('\n');