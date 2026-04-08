import { isLlmRequestError, type LlmRequestError, type LlmClient } from '../llm/client';
import type { ConversationMessage, Guard, Player, WorldState } from '../world/types';
import { buildGuardPromptContext } from './guardPromptContext';

export interface GuardInteractionRequest {
  guard: Guard;
  player: Player;
}

export interface GuardInteractionResult {
  guardId: string;
  responseText: string;
  llmError?: LlmRequestError;
}

export interface GuardLlmInteractionResult extends GuardInteractionResult {
  updatedWorldState: WorldState;
}

export interface GuardLlmInteractionRequest {
  guard: Guard;
  player: Player;
  worldState: WorldState;
  playerMessage: string;
}

export interface GuardInteractionService {
  handleGuardInteraction(request: GuardLlmInteractionRequest): Promise<GuardLlmInteractionResult>;
}

const GUARD_STATE_RESPONSES: Record<Guard['guardState'], string> = {
  idle: 'Guard: Halt! Who goes there?',
  patrolling: 'Guard: Keep moving, nothing to see here.',
  alert: 'Guard: Stop right there!',
};

export const handleGuardInteraction = (
  request: GuardInteractionRequest,
): GuardInteractionResult => ({
  guardId: request.guard.id,
  responseText: GUARD_STATE_RESPONSES[request.guard.guardState],
});

export const createGuardInteractionService = (llmClient: LlmClient): GuardInteractionService => ({
  handleGuardInteraction: async (
    request: GuardLlmInteractionRequest,
  ): Promise<GuardLlmInteractionResult> => {
    const previousHistory =
      request.worldState.actorConversationHistoryByActorId[request.guard.id] ?? [];
    const playerMessageRecord: ConversationMessage = {
      role: 'player',
      text: request.playerMessage,
    };
    const historyWithPlayerMessage = [...previousHistory, playerMessageRecord];

    const llmResult = await llmClient
      .complete({
        actorId: request.guard.id,
        context: buildGuardPromptContext(request.guard, request.worldState),
        playerMessage: request.playerMessage,
        conversationHistory: historyWithPlayerMessage,
      })
      .catch((err: unknown): LlmRequestError => ({
        kind: 'llm_request_error',
        message: err instanceof Error ? err.message : 'Unknown error',
      }));

    if (isLlmRequestError(llmResult)) {
      const updatedWorldState: WorldState = {
        ...request.worldState,
        actorConversationHistoryByActorId: {
          ...request.worldState.actorConversationHistoryByActorId,
          [request.guard.id]: historyWithPlayerMessage,
        },
      };

      return {
        guardId: request.guard.id,
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

    const updatedWorldState: WorldState = {
      ...request.worldState,
      actorConversationHistoryByActorId: {
        ...request.worldState.actorConversationHistoryByActorId,
        [request.guard.id]: [...historyWithPlayerMessage, assistantMessageRecord],
      },
    };

    return {
      guardId: request.guard.id,
      responseText: `${request.guard.displayName}: ${assistantText}`,
      updatedWorldState,
    };
  },
});
