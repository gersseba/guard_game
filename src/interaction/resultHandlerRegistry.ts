import type {
  InteractionHandlerResult,
  ResultHandler,
  ResultHandlerConfig,
  ResultHandlerRegistry,
} from './interactionDispatcherTypes';

export const createConversationalResultHandler = (): ResultHandler => {
  return (result: InteractionHandlerResult, config: ResultHandlerConfig) => {
    if (result.kind !== 'guard' && result.kind !== 'npc') {
      throw new Error('Conversational result handler called with non-conversational result');
    }

    const worldStateForConversation = result.updatedWorldState ?? config.getCurrentWorldState();
    if (result.updatedWorldState) {
      config.onWorldStateUpdated(result.updatedWorldState);
    }

    const history = config.getConversationHistory(worldStateForConversation, result.targetId);

    config.onConversationStarted(
      result.targetId,
      result.displayName || `${result.kind}-${result.targetId}`,
      history,
      result.kind,
    );
  };
};

export const createDoorResultHandler = (): ResultHandler => {
  return (result: InteractionHandlerResult, config: ResultHandlerConfig) => {
    if (result.kind !== 'door') {
      throw new Error('Door result handler called with non-door result');
    }

    if (result.levelOutcome) {
      config.onLevelOutcomeChanged(result.levelOutcome);
    }
  };
};

export const createObjectResultHandler = (): ResultHandler => {
  return (result: InteractionHandlerResult, config: ResultHandlerConfig) => {
    if (result.kind !== 'interactiveObject') {
      throw new Error('Object result handler called with non-object result');
    }

    if (result.updatedWorldState) {
      config.onWorldStateUpdated(result.updatedWorldState);
    }
  };
};

export const createResultHandlerRegistry = (): ResultHandlerRegistry => ({
  guard: createConversationalResultHandler(),
  npc: createConversationalResultHandler(),
  door: createDoorResultHandler(),
  interactiveObject: createObjectResultHandler(),
});