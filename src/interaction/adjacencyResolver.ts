import type { Door, Guard, Npc, Player, WorldState } from '../world/types';

export type AdjacentTarget =
  | { kind: 'guard'; target: Guard }
  | { kind: 'door'; target: Door }
  | { kind: 'npc'; target: Npc };

const isOrthogonallyAdjacent = (player: Player, position: { x: number; y: number }): boolean => {
  const deltaX = Math.abs(position.x - player.position.x);
  const deltaY = Math.abs(position.y - player.position.y);
  return deltaX + deltaY === 1;
};

/**
 * Resolves the adjacent interactable target for the player.
 * Returns null when no orthogonally adjacent target exists (silent no-op).
 * Returns a random target when multiple adjacent targets exist.
 *
 * @param randomFn - injectable random source for testability; defaults to Math.random
 */
export const resolveAdjacentTarget = (
  worldState: WorldState,
  randomFn: () => number = Math.random,
): AdjacentTarget | null => {
  const { player, guards, doors, npcs } = worldState;

  const candidates: AdjacentTarget[] = [
    ...guards
      .filter((g) => isOrthogonallyAdjacent(player, g.position))
      .map((g): AdjacentTarget => ({ kind: 'guard', target: g })),
    ...doors
      .filter((d) => isOrthogonallyAdjacent(player, d.position))
      .map((d): AdjacentTarget => ({ kind: 'door', target: d })),
    ...npcs
      .filter((n) => isOrthogonallyAdjacent(player, n.position))
      .map((n): AdjacentTarget => ({ kind: 'npc', target: n })),
  ];

  if (candidates.length === 0) {
    return null;
  }

  const index = Math.floor(randomFn() * candidates.length);
  return candidates[index];
};
