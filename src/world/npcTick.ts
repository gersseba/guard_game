import type { GridPosition, Npc, WorldState } from './types';

const samePosition = (a: GridPosition, b: GridPosition): boolean => a.x === b.x && a.y === b.y;

const getNextPatrolPosition = (npc: Npc): GridPosition | null => {
  const path = npc.patrol?.path;
  if (!path || path.length === 0) {
    return null;
  }

  const currentIndex = path.findIndex((step) => samePosition(step, npc.position));
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % path.length : 0;
  return path[nextIndex];
};

export const tickNpcPatrols = (state: WorldState): WorldState => {
  const nextNpcs = state.npcs.map((npc) => {
    const nextPosition = getNextPatrolPosition(npc);
    if (!nextPosition) {
      return npc;
    }

    // NPC patrols pause when the player's tile is the next patrol step.
    if (samePosition(nextPosition, state.player.position)) {
      return npc;
    }

    return {
      ...npc,
      position: { x: nextPosition.x, y: nextPosition.y },
    };
  });

  return {
    ...state,
    npcs: nextNpcs,
  };
};
