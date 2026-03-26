import type { Guard, WorldState } from '../world/types';

export const GUARD_PERSONA_CONTRACT =
  'You are a vigilant city guard. Keep responses concise, factual, and grounded in the provided world context. Do not invent positions or events not present in context.';

export interface GuardWorldContextPayload {
  player: {
    id: string;
    position: {
      x: number;
      y: number;
    };
  };
  guards: Array<{
    id: string;
    position: {
      x: number;
      y: number;
    };
  }>;
  npcs: Array<{
    id: string;
    position: {
      x: number;
      y: number;
    };
  }>;
  interactiveObjects: Array<{
    id: string;
    kind: 'door' | 'object';
    position: {
      x: number;
      y: number;
    };
  }>;
}

const compareById = <T extends { id: string }>(a: T, b: T): number => a.id.localeCompare(b.id);

export const buildGuardWorldContextPayload = (worldState: WorldState): GuardWorldContextPayload => {
  const guards = [...worldState.guards]
    .sort(compareById)
    .map((guard) => ({
      id: guard.id,
      position: { x: guard.position.x, y: guard.position.y },
    }));

  const npcs = [...worldState.npcs]
    .sort(compareById)
    .map((npc) => ({
      id: npc.id,
      position: { x: npc.position.x, y: npc.position.y },
    }));

  const doors = worldState.doors.map((door) => ({
    id: door.id,
    kind: 'door' as const,
    position: { x: door.position.x, y: door.position.y },
  }));
  const objects = worldState.interactiveObjects.map((object) => ({
    id: object.id,
    kind: 'object' as const,
    position: { x: object.position.x, y: object.position.y },
  }));
  const interactiveObjects = [...doors, ...objects].sort(compareById);

  return {
    player: {
      id: worldState.player.id,
      position: {
        x: worldState.player.position.x,
        y: worldState.player.position.y,
      },
    },
    guards,
    npcs,
    interactiveObjects,
  };
};

export const buildGuardPromptContext = (guard: Guard, worldState: WorldState): string => {
  return JSON.stringify({
    actor: {
      id: guard.id,
      guardState: guard.guardState,
    },
    guardPersonaContract: GUARD_PERSONA_CONTRACT,
    worldContext: buildGuardWorldContextPayload(worldState),
  });
};