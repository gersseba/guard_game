import type { Door, Guard, InteractiveObject, Npc, WorldState } from '../world/types';
import { getBlockingOccupants, isInBounds } from '../world/spatialRules';
import { handleDoorInteraction } from './doorInteraction';
import { handleObjectInteraction } from './objectInteraction';
import type { NpcActionCall } from './npcActionFunctions';

type ActionTarget =
  | { kind: 'door'; target: Door }
  | { kind: 'guard'; target: Guard }
  | { kind: 'npc'; target: Npc }
  | { kind: 'interactiveObject'; target: InteractiveObject };

export type NpcActionStepCode =
  | 'executed'
  | 'npc_not_found'
  | 'target_not_found'
  | 'not_adjacent'
  | 'blocked'
  | 'item_missing'
  | 'unsupported_target';

export interface NpcActionStepResult {
  index: number;
  action: NpcActionCall;
  status: 'success' | 'failed';
  code: NpcActionStepCode;
  message: string;
  targetId?: string;
  responseText?: string;
}

export interface NpcActionExecutionRequest {
  npcId: string;
  worldState: WorldState;
  actions: ReadonlyArray<NpcActionCall>;
}

export interface NpcActionExecutionResult {
  updatedWorldState: WorldState;
  steps: NpcActionStepResult[];
  endedChat: boolean;
}

export interface NpcActionExecutor {
  execute(request: NpcActionExecutionRequest): NpcActionExecutionResult;
}

const samePosition = (a: { x: number; y: number }, b: { x: number; y: number }): boolean => {
  return a.x === b.x && a.y === b.y;
};

const isOrthogonallyAdjacent = (a: { x: number; y: number }, b: { x: number; y: number }): boolean => {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
};

const targetPriority: Record<ActionTarget['kind'], number> = {
  guard: 0,
  door: 1,
  npc: 2,
  interactiveObject: 3,
};

const sortTargets = (left: ActionTarget, right: ActionTarget): number => {
  const priorityDiff = targetPriority[left.kind] - targetPriority[right.kind];
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  return left.target.id.localeCompare(right.target.id);
};

const findNpcById = (worldState: WorldState, npcId: string): Npc | null => {
  return worldState.npcs.find((candidate) => candidate.id === npcId) ?? null;
};

const replaceNpc = (worldState: WorldState, nextNpc: Npc): WorldState => {
  return {
    ...worldState,
    npcs: worldState.npcs.map((candidate) => (candidate.id === nextNpc.id ? nextNpc : candidate)),
  };
};

const replaceDoor = (worldState: WorldState, nextDoor: Door): WorldState => {
  return {
    ...worldState,
    doors: worldState.doors.map((candidate) => (candidate.id === nextDoor.id ? nextDoor : candidate)),
  };
};

const replaceGuard = (worldState: WorldState, nextGuard: Guard): WorldState => {
  return {
    ...worldState,
    guards: worldState.guards.map((candidate) => (candidate.id === nextGuard.id ? nextGuard : candidate)),
  };
};

const replaceInteractiveObject = (
  worldState: WorldState,
  nextInteractiveObject: InteractiveObject,
): WorldState => {
  return {
    ...worldState,
    interactiveObjects: worldState.interactiveObjects.map((candidate) =>
      candidate.id === nextInteractiveObject.id ? nextInteractiveObject : candidate,
    ),
  };
};

const findTargetById = (worldState: WorldState, targetId: string, npcId: string): ActionTarget | null => {
  const guard = worldState.guards.find((candidate) => candidate.id === targetId);
  if (guard) {
    return { kind: 'guard', target: guard };
  }

  const door = worldState.doors.find((candidate) => candidate.id === targetId);
  if (door) {
    return { kind: 'door', target: door };
  }

  const npc = worldState.npcs.find((candidate) => candidate.id === targetId && candidate.id !== npcId);
  if (npc) {
    return { kind: 'npc', target: npc };
  }

  const interactiveObject = worldState.interactiveObjects.find((candidate) => candidate.id === targetId);
  if (interactiveObject) {
    return { kind: 'interactiveObject', target: interactiveObject };
  }

  return null;
};

const resolveAdjacentTargetForNpc = (worldState: WorldState, npc: Npc): ActionTarget | null => {
  const candidates: ActionTarget[] = [
    ...worldState.guards
      .filter((guard) => isOrthogonallyAdjacent(npc.position, guard.position))
      .map((guard): ActionTarget => ({ kind: 'guard', target: guard })),
    ...worldState.doors
      .filter((door) => isOrthogonallyAdjacent(npc.position, door.position))
      .map((door): ActionTarget => ({ kind: 'door', target: door })),
    ...worldState.npcs
      .filter(
        (candidate) => candidate.id !== npc.id && isOrthogonallyAdjacent(npc.position, candidate.position),
      )
      .map((candidate): ActionTarget => ({ kind: 'npc', target: candidate })),
    ...worldState.interactiveObjects
      .filter((interactiveObject) => isOrthogonallyAdjacent(npc.position, interactiveObject.position))
      .map((interactiveObject): ActionTarget => ({
        kind: 'interactiveObject',
        target: interactiveObject,
      })),
  ];

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort(sortTargets);
  return candidates[0];
};

const resolveActionNpc = (
  worldState: WorldState,
  npcId: string,
  action: NpcActionCall,
  index: number,
):
  | { npc: Npc }
  | {
      failure: NpcActionStepResult;
    } => {
  const npc = findNpcById(worldState, npcId);
  if (!npc) {
    return {
      failure: {
        index,
        action,
        status: 'failed',
        code: 'npc_not_found',
        message: `NPC ${npcId} was not found in world state.`,
      },
    };
  }

  return { npc };
};

const executeEndChat = (action: NpcActionCall, index: number): NpcActionStepResult => {
  return {
    index,
    action,
    status: 'success',
    code: 'executed',
    message:
      action.name === 'end_chat' && action.arguments.reason
        ? action.arguments.reason
        : 'Conversation ended.',
  };
};

const executeMove = (
  worldState: WorldState,
  npc: Npc,
  action: Extract<NpcActionCall, { name: 'move' }>,
  index: number,
): { worldState: WorldState; step: NpcActionStepResult } => {
  const targetPosition = { x: action.arguments.x, y: action.arguments.y };
  if (!isInBounds(targetPosition, worldState.grid)) {
    return {
      worldState,
      step: {
        index,
        action,
        status: 'failed',
        code: 'blocked',
        message: 'Move target is out of bounds.',
      },
    };
  }

  if (samePosition(targetPosition, worldState.player.position)) {
    return {
      worldState,
      step: {
        index,
        action,
        status: 'failed',
        code: 'blocked',
        message: 'Move target is occupied by the player.',
      },
    };
  }

  const worldStateWithoutActor: WorldState = {
    ...worldState,
    npcs: worldState.npcs.filter((candidate) => candidate.id !== npc.id),
  };

  if (getBlockingOccupants(worldStateWithoutActor, targetPosition).length > 0) {
    return {
      worldState,
      step: {
        index,
        action,
        status: 'failed',
        code: 'blocked',
        message: 'Move target is blocked.',
      },
    };
  }

  const updatedWorldState = replaceNpc(worldState, {
    ...npc,
    position: targetPosition,
  });

  return {
    worldState: updatedWorldState,
    step: {
      index,
      action,
      status: 'success',
      code: 'executed',
      message: `Moved to (${targetPosition.x}, ${targetPosition.y}).`,
    },
  };
};

const executeInteract = (
  worldState: WorldState,
  npc: Npc,
  action: Extract<NpcActionCall, { name: 'interact' }>,
  index: number,
): { worldState: WorldState; step: NpcActionStepResult } => {
  const resolvedTarget = findTargetById(worldState, action.arguments.targetId, npc.id);
  if (!resolvedTarget) {
    return {
      worldState,
      step: {
        index,
        action,
        status: 'failed',
        code: 'target_not_found',
        message: `Target ${action.arguments.targetId} was not found.`,
        targetId: action.arguments.targetId,
      },
    };
  }

  if (!isOrthogonallyAdjacent(npc.position, resolvedTarget.target.position)) {
    return {
      worldState,
      step: {
        index,
        action,
        status: 'failed',
        code: 'not_adjacent',
        message: `Target ${action.arguments.targetId} is not adjacent.`,
        targetId: action.arguments.targetId,
      },
    };
  }

  if (resolvedTarget.kind === 'door') {
    const result = handleDoorInteraction({
      door: resolvedTarget.target,
      player: worldState.player,
    });

    return {
      worldState:
        result.levelOutcome === undefined
          ? worldState
          : { ...worldState, levelOutcome: result.levelOutcome },
      step: {
        index,
        action,
        status: 'success',
        code: 'executed',
        message: 'Interaction executed.',
        targetId: resolvedTarget.target.id,
        responseText: result.responseText,
      },
    };
  }

  if (resolvedTarget.kind === 'interactiveObject') {
    if (resolvedTarget.target.pickupItem) {
      return {
        worldState,
        step: {
          index,
          action,
          status: 'failed',
          code: 'unsupported_target',
          message: `Target ${action.arguments.targetId} cannot be interacted with by NPC executor.`,
          targetId: action.arguments.targetId,
        },
      };
    }

    const result = handleObjectInteraction({
      interactiveObject: resolvedTarget.target,
      player: worldState.player,
      worldState,
    });

    return {
      worldState: result.updatedWorldState,
      step: {
        index,
        action,
        status: 'success',
        code: 'executed',
        message: 'Interaction executed.',
        targetId: resolvedTarget.target.id,
        responseText: result.responseText,
      },
    };
  }

  return {
    worldState,
    step: {
      index,
      action,
      status: 'failed',
      code: 'unsupported_target',
      message: `Target ${action.arguments.targetId} is not supported for NPC interaction.`,
      targetId: action.arguments.targetId,
    },
  };
};

const executeUseItem = (
  worldState: WorldState,
  npc: Npc,
  action: Extract<NpcActionCall, { name: 'use_item' }>,
  index: number,
): { worldState: WorldState; step: NpcActionStepResult } => {
  const inventoryItem = npc.inventory?.find((candidate) => candidate.itemId === action.arguments.itemId);
  if (!inventoryItem) {
    return {
      worldState,
      step: {
        index,
        action,
        status: 'failed',
        code: 'item_missing',
        message: `NPC does not have item ${action.arguments.itemId}.`,
        targetId: action.arguments.targetId,
      },
    };
  }

  const resolvedTarget = action.arguments.targetId
    ? findTargetById(worldState, action.arguments.targetId, npc.id)
    : resolveAdjacentTargetForNpc(worldState, npc);

  if (!resolvedTarget) {
    return {
      worldState,
      step: {
        index,
        action,
        status: 'failed',
        code: 'target_not_found',
        message: action.arguments.targetId
          ? `Target ${action.arguments.targetId} was not found.`
          : 'No adjacent target available for item use.',
        targetId: action.arguments.targetId,
      },
    };
  }

  if (!isOrthogonallyAdjacent(npc.position, resolvedTarget.target.position)) {
    return {
      worldState,
      step: {
        index,
        action,
        status: 'failed',
        code: 'not_adjacent',
        message: `Target ${resolvedTarget.target.id} is not adjacent.`,
        targetId: resolvedTarget.target.id,
      },
    };
  }

  if (resolvedTarget.kind === 'door') {
    if (!resolvedTarget.target.isLocked || resolvedTarget.target.isOpen || !resolvedTarget.target.requiredItemId) {
      return {
        worldState,
        step: {
          index,
          action,
          status: 'failed',
          code: 'unsupported_target',
          message: `Door ${resolvedTarget.target.id} cannot be unlocked by NPC item use.`,
          targetId: resolvedTarget.target.id,
        },
      };
    }

    if (resolvedTarget.target.requiredItemId !== inventoryItem.itemId) {
      return {
        worldState,
        step: {
          index,
          action,
          status: 'failed',
          code: 'blocked',
          message: `Item ${inventoryItem.itemId} does not unlock door ${resolvedTarget.target.id}.`,
          targetId: resolvedTarget.target.id,
        },
      };
    }

    return {
      worldState: replaceDoor(worldState, {
        ...resolvedTarget.target,
        isLocked: false,
        isOpen: true,
      }),
      step: {
        index,
        action,
        status: 'success',
        code: 'executed',
        message: `Unlocked door ${resolvedTarget.target.id}.`,
        targetId: resolvedTarget.target.id,
      },
    };
  }

  if (resolvedTarget.kind === 'guard') {
    const rule = resolvedTarget.target.itemUseRules?.[inventoryItem.itemId];
    if (!rule) {
      return {
        worldState,
        step: {
          index,
          action,
          status: 'failed',
          code: 'unsupported_target',
          message: `Guard ${resolvedTarget.target.id} has no item-use rule for ${inventoryItem.itemId}.`,
          targetId: resolvedTarget.target.id,
        },
      };
    }

    if (!rule.allowed) {
      return {
        worldState,
        step: {
          index,
          action,
          status: 'failed',
          code: 'blocked',
          message: rule.responseText,
          targetId: resolvedTarget.target.id,
          responseText: rule.responseText,
        },
      };
    }

    return {
      worldState: replaceGuard(worldState, {
        ...resolvedTarget.target,
        guardState: 'alert',
      }),
      step: {
        index,
        action,
        status: 'success',
        code: 'executed',
        message: rule.responseText,
        targetId: resolvedTarget.target.id,
        responseText: rule.responseText,
      },
    };
  }

  if (resolvedTarget.kind === 'interactiveObject') {
    const rule = resolvedTarget.target.itemUseRules?.[inventoryItem.itemId];
    if (!rule) {
      return {
        worldState,
        step: {
          index,
          action,
          status: 'failed',
          code: 'unsupported_target',
          message: `Object ${resolvedTarget.target.id} has no item-use rule for ${inventoryItem.itemId}.`,
          targetId: resolvedTarget.target.id,
        },
      };
    }

    if (!rule.allowed) {
      return {
        worldState,
        step: {
          index,
          action,
          status: 'failed',
          code: 'blocked',
          message: rule.responseText,
          targetId: resolvedTarget.target.id,
          responseText: rule.responseText,
        },
      };
    }

    return {
      worldState: replaceInteractiveObject(worldState, {
        ...resolvedTarget.target,
        state: 'used',
      }),
      step: {
        index,
        action,
        status: 'success',
        code: 'executed',
        message: rule.responseText,
        targetId: resolvedTarget.target.id,
        responseText: rule.responseText,
      },
    };
  }

  return {
    worldState,
    step: {
      index,
      action,
      status: 'failed',
      code: 'unsupported_target',
      message: `Target ${resolvedTarget.target.id} does not support NPC item use.`,
      targetId: resolvedTarget.target.id,
    },
  };
};

export const createNpcActionExecutor = (): NpcActionExecutor => {
  return {
    execute(request: NpcActionExecutionRequest): NpcActionExecutionResult {
      let currentWorldState = request.worldState;
      const steps: NpcActionStepResult[] = [];
      let endedChat = false;

      request.actions.forEach((action, index) => {
        const resolvedActor = resolveActionNpc(currentWorldState, request.npcId, action, index);
        if ('failure' in resolvedActor) {
          steps.push(resolvedActor.failure);
          return;
        }

        if (action.name === 'end_chat') {
          endedChat = true;
          steps.push(executeEndChat(action, index));
          return;
        }

        if (action.name === 'move') {
          const result = executeMove(currentWorldState, resolvedActor.npc, action, index);
          currentWorldState = result.worldState;
          steps.push(result.step);
          return;
        }

        if (action.name === 'interact') {
          const result = executeInteract(currentWorldState, resolvedActor.npc, action, index);
          currentWorldState = result.worldState;
          steps.push(result.step);
          return;
        }

        const result = executeUseItem(currentWorldState, resolvedActor.npc, action, index);
        currentWorldState = result.worldState;
        steps.push(result.step);
      });

      return {
        updatedWorldState: currentWorldState,
        steps,
        endedChat,
      };
    },
  };
};