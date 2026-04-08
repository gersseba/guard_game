import type { WorldCommand, WorldState, ConversationMessage } from '../world/types';
import type { LlmRequestError } from '../llm/client';
import { resolveAdjacentTarget, type AdjacentTarget } from '../interaction/adjacencyResolver';
import {
  createActionModalSession,
  isActionModalEligibleTarget,
} from '../interaction/actionModalRouting';
import {
  createResultDispatcher,
  isPromiseLike,
  type InteractionDispatcher,
} from '../interaction/interactionDispatcher';
import { getActorConversationHistory } from '../interaction/actorConversationThread';
import type { RuntimeActionModalSession } from './runtimeController';

export interface RuntimeInteractionResultBridgeDependencies {
  world: Pick<{ getState: () => WorldState; resetToState: (worldState: WorldState) => void }, 'getState' | 'resetToState'>;
  interactionDispatcher: InteractionDispatcher;
  onActionModalStarted: (session: RuntimeActionModalSession) => void;
  onConversationStarted: (
    targetId: string,
    displayName: string,
    conversationHistory: ConversationMessage[],
    interactionKind: 'guard' | 'npc',
  ) => void;
}

export interface RuntimeInteractionResultBridge {
  runInteractionIfRequested(worldState: WorldState, commands: WorldCommand[]): void;
  openConversationForActionSession(session: RuntimeActionModalSession): boolean;
  sendConversationMessage(
    actorId: string,
    playerMessage: string,
    onAssistantMessage: (message: string) => void,
    onLlmError?: (error: LlmRequestError) => void,
  ): Promise<void>;
}

export const createRuntimeInteractionResultBridge = (
  dependencies: RuntimeInteractionResultBridgeDependencies,
): RuntimeInteractionResultBridge => {
  const resultDispatcher = createResultDispatcher({
    onConversationStarted: dependencies.onConversationStarted,
    onLevelOutcomeChanged: (levelOutcome: 'win' | 'lose') => {
      const currentWorldState = dependencies.world.getState();
      const updatedState = { ...currentWorldState, levelOutcome };
      dependencies.world.resetToState(updatedState);
    },
    onWorldStateUpdated: (worldState: WorldState) => {
      dependencies.world.resetToState(worldState);
    },
    getCurrentWorldState: () => dependencies.world.getState(),
    getConversationHistory: (worldState: WorldState, targetId: string) =>
      getActorConversationHistory(worldState, targetId),
  });

  const dispatchAndHandleResult = (
    target: AdjacentTarget,
    worldState: WorldState,
    playerMessage?: string,
  ): void => {
    const dispatchResult = dependencies.interactionDispatcher.dispatch(target, worldState, playerMessage);
    if (isPromiseLike(dispatchResult)) {
      void dispatchResult.then((resolvedResult) => {
        resultDispatcher.dispatch(resolvedResult);
      });
      return;
    }

    resultDispatcher.dispatch(dispatchResult);
  };

  return {
    runInteractionIfRequested(worldState: WorldState, commands: WorldCommand[]): void {
      if (worldState.levelOutcome) {
        return;
      }

      const includesInteract = commands.some((command) => command.type === 'interact');
      if (!includesInteract) {
        return;
      }

      const adjacentTarget = resolveAdjacentTarget(worldState);
      if (!adjacentTarget) {
        return;
      }

      if (isActionModalEligibleTarget(adjacentTarget)) {
        const session = createActionModalSession(adjacentTarget);
        dependencies.onActionModalStarted(session);
        return;
      }

      dispatchAndHandleResult(adjacentTarget, worldState);
    },

    openConversationForActionSession(session: RuntimeActionModalSession): boolean {
      const currentWorldState = dependencies.world.getState();
      const target = dependencies.interactionDispatcher.resolveConversationalTarget(
        currentWorldState,
        session.targetId,
      );
      if (!target) {
        return false;
      }

      dispatchAndHandleResult(target, currentWorldState);
      return true;
    },

    async sendConversationMessage(
      actorId: string,
      playerMessage: string,
      onAssistantMessage: (message: string) => void,
      onLlmError?: (error: LlmRequestError) => void,
    ): Promise<void> {
      const currentWorldState = dependencies.world.getState();
      const target = dependencies.interactionDispatcher.resolveConversationalTarget(
        currentWorldState,
        actorId,
      );
      if (!target) {
        return;
      }

      const result = await dependencies.interactionDispatcher.dispatch(
        target,
        currentWorldState,
        playerMessage,
      );

      if (result.llmError) {
        if (result.updatedWorldState) {
          dependencies.world.resetToState(result.updatedWorldState);
        }
        onLlmError?.(result.llmError);
        return;
      }

      const history = getActorConversationHistory(
        result.updatedWorldState ?? currentWorldState,
        actorId,
      );
      const lastMessage = history[history.length - 1];
      if (lastMessage?.role === 'assistant') {
        onAssistantMessage(lastMessage.text);
      }

      if (result.updatedWorldState) {
        dependencies.world.resetToState(result.updatedWorldState);
      }
    },
  };
};
