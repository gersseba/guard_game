export interface ConversationMessage {
  role: 'player' | 'assistant';
  text: string;
}

export type ActorConversationHistoryByActorId = Record<string, ConversationMessage[]>;
