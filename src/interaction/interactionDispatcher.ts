import type { LlmClient } from '../llm/client';
import type { WorldState, ConversationMessage } from '../world/types';
import type { AdjacentTarget } from './adjacencyResolver';
import { handleDoorInteraction } from './doorInteraction';
import { resolveGuardFacingFromApproach } from './guardFacing';
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
  displayName?: string; // For UI display when result is handled
  responseText?: string;
  updatedWorldState?: WorldState;
  levelOutcome?: 'win' | 'lose' | null;
  isConversational: boolean;
}

export type InteractionDispatchResult = InteractionHandlerResult | Promise<InteractionHandlerResult>;

/**
 * Conditionally async interaction handler.
 * Returns synchronously for immediate open-chat interactions and
 * asynchronously for player-message LLM turns.
 */
export type ConditionalInteractionHandler = (
  target: AdjacentTarget,
  worldState: WorldState,
  playerMessage?: string,
) => InteractionDispatchResult;

/**
 * Sync interaction handler.
 * Used for immediate, non-async interactions (door, object).
 */
export type SyncInteractionHandler = (
  target: AdjacentTarget,
  worldState: WorldState,
  playerMessage?: string,
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
export type InteractionHandler =
  | SyncInteractionHandler
  | AsyncInteractionHandler
  | ConditionalInteractionHandler;

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
      displayName: target.target.displayName,
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
      displayName: target.target.displayName,
      responseText: result.responseText,
      updatedWorldState: result.updatedWorldState,
      isConversational: false,
    };
  };
};

/**
 * Wraps guard interaction logic into dispatcher handler format (async).
 */
const createGuardHandler = (llmClient: LlmClient): ConditionalInteractionHandler => {
  const guardService = createGuardInteractionService(llmClient);

  return (target: AdjacentTarget, worldState: WorldState, playerMessage?: string) => {
    if (target.kind !== 'guard') {
      throw new Error('Guard handler called with non-guard target');
    }

    // If no player message, just return initial state response (not conversational).
    if (!playerMessage) {
      const guardFacingDirection =
        resolveGuardFacingFromApproach(worldState.player.position, target.target.position) ??
        target.target.facingDirection ??
        'front';
      const updatedWorldState: WorldState = {
        ...worldState,
        guards: worldState.guards.map((guard) =>
          guard.id === target.target.id ? { ...guard, facingDirection: guardFacingDirection } : guard,
        ),
      };

      return {
        kind: 'guard',
        targetId: target.target.id,
        displayName: target.target.displayName,
        responseText: target.target.displayName, // Initial greeting in chat modal
        updatedWorldState,
        isConversational: false,
      };
    }

    return guardService
      .handleGuardInteraction({
        guard: target.target,
        player: worldState.player,
        worldState,
        playerMessage,
      })
      .then((result) => ({
        kind: 'guard' as const,
        targetId: result.guardId,
        displayName: target.target.displayName,
        responseText: result.responseText,
        updatedWorldState: result.updatedWorldState,
        isConversational: true,
      }));
  };
};

/**
 * Wraps NPC interaction logic into dispatcher handler format (async).
 */
const createNpcHandler = (llmClient: LlmClient): ConditionalInteractionHandler => {
  const npcService = createNpcInteractionService(llmClient);

  return (target: AdjacentTarget, worldState: WorldState, playerMessage?: string) => {
    if (target.kind !== 'npc') {
      throw new Error('NPC handler called with non-npc target');
    }

    // If no player message, just return initial state (not conversational).
    if (!playerMessage) {
      return {
        kind: 'npc',
        targetId: target.target.id,
        displayName: target.target.displayName,
        responseText: target.target.displayName, // Initial greeting in chat modal
        isConversational: false,
      };
    }

    return npcService
      .handleNpcInteraction({
        npc: target.target,
        player: worldState.player,
        worldState,
        playerMessage,
      })
      .then((result) => ({
        kind: 'npc' as const,
        targetId: result.npcId,
        displayName: target.target.displayName,
        responseText: result.responseText,
        updatedWorldState: result.updatedWorldState,
        isConversational: true,
      }));
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

  const conversationalTargetResolvers: ConversationalTargetResolver[] = [
    (worldState: WorldState, targetId: string) => {
      const guard = worldState.guards.find((candidate) => candidate.id === targetId);
      if (!guard) {
        return null;
      }

      return {
        kind: 'guard',
        target: guard,
      };
    },
    (worldState: WorldState, targetId: string) => {
      const npc = worldState.npcs.find((candidate) => candidate.id === targetId);
      if (!npc) {
        return null;
      }

      return {
        kind: 'npc',
        target: npc,
      };
    },
  ];

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

    resolveConversationalTarget(worldState: WorldState, targetId: string): ConversationalTarget | null {
      for (const resolveTarget of conversationalTargetResolvers) {
        const target = resolveTarget(worldState, targetId);
        if (target) {
          return target;
        }
      }

      return null;
    },
  };
};

/**
 * Result handler for a specific interaction result kind.
 * Handles side effects based on result type.
 */
export type ResultHandler = (
  result: InteractionHandlerResult,
  config: ResultHandlerConfig,
) => void;

/**
 * Registry of result handlers keyed by result kind.
 */
export type ResultHandlerRegistry = Partial<
  Record<InteractionHandlerResult['kind'], ResultHandler>
>;

/**
 * Configuration for result handler.
 * Provides access to main loop state and callbacks for side effects.
 */
export interface ResultHandlerConfig {
  // Callbacks for side effects
  onConversationStarted: (
    targetId: string,
    displayName: string,
    conversationHistory: ConversationMessage[],
    interactionKind: 'guard' | 'npc',
  ) => void;
  onLevelOutcomeChanged: (levelOutcome: 'win' | 'lose') => void;
  onWorldStateUpdated: (worldState: WorldState) => void;
  // Accessor for current world state
  getCurrentWorldState: () => WorldState;
  // Accessor for getting conversation history
  getConversationHistory: (worldState: WorldState, targetId: string) => ConversationMessage[];
}

/**
 * Result dispatcher.
 * Routes interaction results to appropriate result handlers based on kind.
 */
export interface ResultDispatcher {
  dispatch(result: InteractionHandlerResult): void;
}

/**
 * Creates a result handler for conversational interactions (guard, npc).
 */
const createConversationalResultHandler = (): ResultHandler => {
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

/**
 * Creates a result handler for door interactions.
 */
const createDoorResultHandler = (): ResultHandler => {
  return (result: InteractionHandlerResult, config: ResultHandlerConfig) => {
    if (result.kind !== 'door') {
      throw new Error('Door result handler called with non-door result');
    }

    // Apply level outcome if present
    if (result.levelOutcome) {
      config.onLevelOutcomeChanged(result.levelOutcome);
    }
  };
};

/**
 * Creates a result handler for interactive object interactions.
 */
const createObjectResultHandler = (): ResultHandler => {
  return (result: InteractionHandlerResult, config: ResultHandlerConfig) => {
    if (result.kind !== 'interactiveObject') {
      throw new Error('Object result handler called with non-object result');
    }

    // Apply world state update if present
    if (result.updatedWorldState) {
      config.onWorldStateUpdated(result.updatedWorldState);
    }
  };
};

/**
 * Creates and returns a result dispatcher with registered result handlers.
 * Routes interaction results to appropriate handlers based on kind.
 */
export const createResultDispatcher = (config: ResultHandlerConfig): ResultDispatcher => {
  const registry: ResultHandlerRegistry = {
    guard: createConversationalResultHandler(),
    npc: createConversationalResultHandler(),
    door: createDoorResultHandler(),
    interactiveObject: createObjectResultHandler(),
  };

  return {
    dispatch(result: InteractionHandlerResult): void {
      const handler = registry[result.kind];

      if (!handler) {
        throw new Error(`No result handler registered for kind: ${result.kind}`);
      }

      handler(result, config);
    },
  };
};
