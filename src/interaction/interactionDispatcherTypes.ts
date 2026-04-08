import type { LlmClient } from '../llm/client';
import type { ConversationMessage, WorldState } from '../world/types';
import type { AdjacentTarget } from './adjacencyResolver';

export interface InteractionHandlerResult {
  kind: AdjacentTarget['kind'];
  targetId: string;
  displayName?: string;
  responseText?: string;
  updatedWorldState?: WorldState;
  levelOutcome?: 'win' | 'lose' | null;
  isConversational: boolean;
}

export type InteractionDispatchResult = InteractionHandlerResult | Promise<InteractionHandlerResult>;

export type ConditionalInteractionHandler = (
  target: AdjacentTarget,
  worldState: WorldState,
  playerMessage?: string,
) => InteractionDispatchResult;

export type SyncInteractionHandler = (
  target: AdjacentTarget,
  worldState: WorldState,
  playerMessage?: string,
) => InteractionHandlerResult;

export type AsyncInteractionHandler = (
  target: AdjacentTarget,
  worldState: WorldState,
  playerMessage?: string,
) => Promise<InteractionHandlerResult>;

export type InteractionHandler =
  | SyncInteractionHandler
  | AsyncInteractionHandler
  | ConditionalInteractionHandler;

export type InteractionHandlerRegistry = Partial<
  Record<AdjacentTarget['kind'], InteractionHandler>
>;

export interface DispatcherConfig {
  llmClient: LlmClient;
}

export interface InteractionDispatcher {
  dispatch(
    target: AdjacentTarget,
    worldState: WorldState,
    playerMessage?: string,
  ): InteractionDispatchResult;
  resolveConversationalTarget(worldState: WorldState, targetId: string): ConversationalTarget | null;
}

type ConversationalInteractionKind = 'guard' | 'npc';

export type ConversationalTarget = Extract<AdjacentTarget, { kind: ConversationalInteractionKind }>;

export type ConversationalTargetResolver = (
  worldState: WorldState,
  targetId: string,
) => ConversationalTarget | null;

export const isPromiseLike = <T>(value: T | Promise<T>): value is Promise<T> => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as Promise<T>).then === 'function'
  );
};

export type ResultHandler = (
  result: InteractionHandlerResult,
  config: ResultHandlerConfig,
) => void;

export type ResultHandlerRegistry = Partial<
  Record<InteractionHandlerResult['kind'], ResultHandler>
>;

export interface ResultHandlerConfig {
  onConversationStarted: (
    targetId: string,
    displayName: string,
    conversationHistory: ConversationMessage[],
    interactionKind: 'guard' | 'npc',
  ) => void;
  onLevelOutcomeChanged: (levelOutcome: 'win' | 'lose') => void;
  onWorldStateUpdated: (worldState: WorldState) => void;
  getCurrentWorldState: () => WorldState;
  getConversationHistory: (worldState: WorldState, targetId: string) => ConversationMessage[];
}

export interface ResultDispatcher {
  dispatch(result: InteractionHandlerResult): void;
}