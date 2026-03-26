import { REQUEST_FAILURE_FALLBACK_TEXT, type LlmClient } from '../llm/client';
import type { WorldState } from '../world/types';
import type { Guard, Player } from '../world/types';
import { buildGuardPromptContext } from './guardPromptContext';

export interface GuardInteractionRequest {
  guard: Guard;
  player: Player;
}

export interface GuardInteractionResult {
  guardId: string;
  responseText: string;
}

export interface GuardLlmInteractionRequest {
  guard: Guard;
  player: Player;
  worldState: WorldState;
  playerMessage: string;
}

export interface GuardInteractionService {
  handleGuardInteraction(request: GuardLlmInteractionRequest): Promise<GuardInteractionResult>;
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
  ): Promise<GuardInteractionResult> => {
    const assistantText = await llmClient
      .complete({
        actorId: request.guard.id,
        context: buildGuardPromptContext(request.guard, request.worldState),
        playerMessage: request.playerMessage,
        conversationHistory: [{ role: 'player', text: request.playerMessage }],
      })
      .then((llmResponse) => llmResponse.text)
      .catch(() => REQUEST_FAILURE_FALLBACK_TEXT);

    return {
      guardId: request.guard.id,
      responseText: `${request.guard.displayName}: ${assistantText}`,
    };
  },
});
