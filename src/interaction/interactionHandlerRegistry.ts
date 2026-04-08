import type { LlmClient } from '../llm/client';
import type { WorldState } from '../world/types';
import type { AdjacentTarget } from './adjacencyResolver';
import { handleDoorInteraction } from './doorInteraction';
import { resolveGuardFacingFromApproach } from './guardFacing';
import { createGuardInteractionService } from './guardInteraction';
import { createNpcInteractionService } from './npcInteraction';
import { handleInteractiveObjectInteraction } from './objectInteraction';
import type {
  ConditionalInteractionHandler,
  InteractionHandlerRegistry,
  SyncInteractionHandler,
} from './interactionDispatcherTypes';

export const createDoorHandler = (): SyncInteractionHandler => {
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

export const createObjectHandler = (): SyncInteractionHandler => {
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

export const createGuardHandler = (llmClient: LlmClient): ConditionalInteractionHandler => {
  const guardService = createGuardInteractionService(llmClient);

  return (target: AdjacentTarget, worldState: WorldState, playerMessage?: string) => {
    if (target.kind !== 'guard') {
      throw new Error('Guard handler called with non-guard target');
    }

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
        responseText: target.target.displayName,
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
        llmError: result.llmError,
      }));
  };
};

export const createNpcHandler = (llmClient: LlmClient): ConditionalInteractionHandler => {
  const npcService = createNpcInteractionService(llmClient);

  return (target: AdjacentTarget, worldState: WorldState, playerMessage?: string) => {
    if (target.kind !== 'npc') {
      throw new Error('NPC handler called with non-npc target');
    }

    if (!playerMessage) {
      return {
        kind: 'npc',
        targetId: target.target.id,
        displayName: target.target.displayName,
        responseText: target.target.displayName,
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
        llmError: result.llmError,
      }));
  };
};

export const createInteractionHandlerRegistry = (
  llmClient: LlmClient,
): InteractionHandlerRegistry => ({
  guard: createGuardHandler(llmClient),
  door: createDoorHandler(),
  npc: createNpcHandler(llmClient),
  interactiveObject: createObjectHandler(),
});