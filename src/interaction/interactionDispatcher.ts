import type { LlmClient } from '../llm/client';
import type { WorldState } from '../world/types';
import type { AdjacentTarget } from './adjacencyResolver';
import { handleDoorInteraction } from './doorInteraction';
import { createGuardInteractionService } from './guardInteraction';
import { createNpcInteractionService } from './npcInteraction';
import { handleInteractiveObjectInteraction } from './objectInteraction';

/**
 * Base handler result shape.
 * Handlers transform AdjacentTarget into a dispatcher result.
 */
export interface InteractionHandlerResult {
  kind: AdjacentTarget['kind'];
  targetId: string;
  responseText?: string;
  updatedWorldState?: WorldState;
  levelOutcome?: 'win' | 'lose' | null;
  isConversational: boolean;
}

/**
 * Sync interaction handler.
 * Used for immediate, non-async interactions (door, object).
 */
export type SyncInteractionHandler = (
  target: AdjacentTarget,
  worldState: WorldState,
) => InteractionHandlerResult;

/**
 * Async interaction handler.
 * Used for LLM-based interactions (guard, npc).
 */
export type AsyncInteractionHandler = (
  target: AdjacentTarget,
  worldState: WorldState,
  playerMessage?: string,
) => Promise<InteractionHandlerResult>;

/**
 * Union type of all handler types.
 */
export type InteractionHandler = SyncInteractionHandler | AsyncInteractionHandler;

/**
 * Registry keyed by target kind.
 * Allows registration and lookup of handlers for each interactable type.
 */
export type InteractionHandlerRegistry = Partial<
  Record<AdjacentTarget['kind'], InteractionHandler>
>;

/**
 * Dispatcher configuration with LLM client (needed for guard/npc handlers).
 */
export interface DispatcherConfig {
  llmClient: LlmClient;
}

/**
 * Interaction dispatcher.
 * Routes adjacentTarget to the appropriate registered handler
 * and returns a unified result type.
 */
export interface InteractionDispatcher {
  dispatch(
    target: AdjacentTarget,
    worldState: WorldState,
    playerMessage?: string,
  ): Promise<InteractionHandlerResult>;
}

/**
 * Wraps door interaction logic into dispatcher handler format (sync).
 */
const createDoorHandler = (): SyncInteractionHandler => {
  return (target: AdjacentTarget, worldState: WorldState) => {
    if (target.kind !== 'door') {
      throw new Error('Door handler called with non-door target');
    }

    const result = handleDoorInteraction({
      door: target.target,
      player: worldState.player,
    });

    return {
      kind: 'door',
      targetId: result.doorId,
      responseText: result.responseText,
      levelOutcome: result.levelOutcome ?? null,
      isConversational: false,
    };
  };
};

/**
 * Wraps interactive object interaction logic into dispatcher handler format (sync).
 */
const createObjectHandler = (): SyncInteractionHandler => {
  return (target: AdjacentTarget, worldState: WorldState) => {
    if (target.kind !== 'interactiveObject') {
      throw new Error('Object handler called with non-object target');
    }

    const result = handleInteractiveObjectInteraction({
      interactiveObject: target.target,
      player: worldState.player,
      worldState,
    });

    return {
      kind: 'interactiveObject',
      targetId: result.objectId,
      responseText: result.responseText,
      updatedWorldState: result.updatedWorldState,
      isConversational: false,
    };
  };
};

/**
 * Wraps guard interaction logic into dispatcher handler format (async).
 */
const createGuardHandler = (llmClient: LlmClient): AsyncInteractionHandler => {
  const guardService = createGuardInteractionService(llmClient);

  return async (target: AdjacentTarget, worldState: WorldState, playerMessage?: string) => {
    if (target.kind !== 'guard') {
      throw new Error('Guard handler called with non-guard target');
    }

    // If no player message, just return initial state response (not conversational).
    if (!playerMessage) {
      return {
        kind: 'guard',
        targetId: target.target.id,
        responseText: target.target.displayName, // Initial greeting in chat modal
        isConversational: false,
      };
    }

    const result = await guardService.handleGuardInteraction({
      guard: target.target,
      player: worldState.player,
      worldState,
      playerMessage,
    });

    return {
      kind: 'guard',
      targetId: result.guardId,
      responseText: result.responseText,
      updatedWorldState: result.updatedWorldState,
      isConversational: true,
    };
  };
};

/**
 * Wraps NPC interaction logic into dispatcher handler format (async).
 */
const createNpcHandler = (llmClient: LlmClient): AsyncInteractionHandler => {
  const npcService = createNpcInteractionService(llmClient);

  return async (target: AdjacentTarget, worldState: WorldState, playerMessage?: string) => {
    if (target.kind !== 'npc') {
      throw new Error('NPC handler called with non-npc target');
    }

    // If no player message, just return initial state (not conversational).
    if (!playerMessage) {
      return {
        kind: 'npc',
        targetId: target.target.id,
        responseText: target.target.displayName, // Initial greeting in chat modal
        isConversational: false,
      };
    }

    const result = await npcService.handleNpcInteraction({
      npc: target.target,
      player: worldState.player,
      worldState,
      playerMessage,
    });

    return {
      kind: 'npc',
      targetId: result.npcId,
      responseText: result.responseText,
      updatedWorldState: result.updatedWorldState,
      isConversational: true,
    };
  };
};

/**
 * Creates and returns an interaction dispatcher with registered handlers.
 */
export const createInteractionDispatcher = (config: DispatcherConfig): InteractionDispatcher => {
  const registry: InteractionHandlerRegistry = {
    guard: createGuardHandler(config.llmClient),
    door: createDoorHandler(),
    npc: createNpcHandler(config.llmClient),
    interactiveObject: createObjectHandler(),
  };

  return {
    async dispatch(
      target: AdjacentTarget,
      worldState: WorldState,
      playerMessage?: string,
    ): Promise<InteractionHandlerResult> {
      const handler = registry[target.kind];

      if (!handler) {
        throw new Error(`No handler registered for kind: ${target.kind}`);
      }

      // Call handler (works for both sync and async)
      return Promise.resolve(handler(target, worldState, playerMessage));
    },
  };
};
