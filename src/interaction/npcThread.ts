import type { ConversationMessage, WorldState } from '../world/types';

const formatConversationLine = (message: ConversationMessage): string => {
  const speaker = message.role === 'player' ? 'Player' : 'NPC';
  return `${speaker}: ${message.text}`;
};

export const getNpcConversationHistory = (
  worldState: WorldState,
  npcId: string,
): ConversationMessage[] => worldState.npcConversationHistoryByNpcId[npcId] ?? [];

export const renderNpcConversationThread = (
  worldState: WorldState,
  npcId: string,
): string => getNpcConversationHistory(worldState, npcId).map(formatConversationLine).join('\n');
