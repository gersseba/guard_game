import type { GridPosition, SpriteDirection } from '../world/types';

/**
 * Maps player approach position relative to a guard into the guard-facing token.
 * Returns undefined for non-orthogonal or non-adjacent positions.
 */
export const resolveGuardFacingFromApproach = (
  playerPosition: GridPosition,
  guardPosition: GridPosition,
): SpriteDirection | undefined => {
  const deltaX = playerPosition.x - guardPosition.x;
  const deltaY = playerPosition.y - guardPosition.y;

  if (deltaX === -1 && deltaY === 0) {
    return 'left';
  }
  if (deltaX === 1 && deltaY === 0) {
    return 'right';
  }
  if (deltaX === 0 && deltaY === -1) {
    return 'away';
  }
  if (deltaX === 0 && deltaY === 1) {
    return 'front';
  }

  return undefined;
};