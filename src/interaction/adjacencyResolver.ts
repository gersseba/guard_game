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

const kindPriority: Record<AdjacentTarget['kind'], number> = {
  guard: 0,
  door: 1,
  npc: 2,
};

const sortCandidatesDeterministically = (a: AdjacentTarget, b: AdjacentTarget): number => {
  const kindDiff = kindPriority[a.kind] - kindPriority[b.kind];
  if (kindDiff !== 0) {
    return kindDiff;
  }

  return a.target.id.localeCompare(b.target.id);
};

/**
 * Resolves the adjacent interactable target for the player.
 * Returns null when no orthogonally adjacent target exists (silent no-op).
 * Uses a deterministic tie-break when multiple adjacent targets exist:
 * kind priority (guard, door, npc), then lexical target id.
 */
export const resolveAdjacentTarget = (
  worldState: WorldState,
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

  candidates.sort(sortCandidatesDeterministically);
  return candidates[0];
};
