import { createConversationalTargetResolver } from './conversationalTargetResolver';
import { createInteractionHandlerRegistry } from './interactionHandlerRegistry';
import { createResultHandlerRegistry } from './resultHandlerRegistry';
import type {
  DispatcherConfig,
  InteractionDispatchResult,
  InteractionDispatcher,
  ResultDispatcher,
  ResultHandlerConfig,
} from './interactionDispatcherTypes';
import type { AdjacentTarget } from './adjacencyResolver';
import type { WorldState } from '../world/types';

export const createInteractionDispatcher = (config: DispatcherConfig): InteractionDispatcher => {
  const registry = createInteractionHandlerRegistry(config.llmClient);
  const resolveConversationalTarget = createConversationalTargetResolver();

  return {
    dispatch(
      target: AdjacentTarget,
      worldState: WorldState,
      playerMessage?: string,
    ): InteractionDispatchResult {
      const handler = registry[target.kind];

      if (!handler) {
        throw new Error(`No handler registered for kind: ${target.kind}`);
      }

      return handler(target, worldState, playerMessage);
    },

    resolveConversationalTarget,
  };
};

export const createResultDispatcher = (config: ResultHandlerConfig): ResultDispatcher => {
  const registry = createResultHandlerRegistry();

  return {
    dispatch(result): void {
      const handler = registry[result.kind];

      if (!handler) {
        throw new Error(`No result handler registered for kind: ${result.kind}`);
      }

      handler(result, config);
    },
  };
};