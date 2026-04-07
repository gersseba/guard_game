import type { Intent, IntentType, SpriteDirection, WorldState } from './types';
import { canMovePlayerTo } from './spatialRules';

/**
 * Maps cardinal direction to delta-x, delta-y movement vector.
 */
const directionToDelta = (
  direction: 'up' | 'down' | 'left' | 'right',
): { dx: number; dy: number } => {
  switch (direction) {
    case 'up':
      return { dx: 0, dy: -1 };
    case 'down':
      return { dx: 0, dy: 1 };
    case 'left':
      return { dx: -1, dy: 0 };
    case 'right':
      return { dx: 1, dy: 0 };
  }
};

/**
 * Determines sprite facing direction from direction change.
 * Returns undefined if no meaningful facing change.
 */
const toFacingDirectionFromDirection = (direction: 'up' | 'down' | 'left' | 'right'): SpriteDirection => {
  switch (direction) {
    case 'left':
      return 'left';
    case 'right':
      return 'right';
    case 'up':
      return 'away';
    case 'down':
      return 'front';
  }
};

/**
 * Resolves a move intent for an actor, applying collision checking.
 * Currently supports player movement; NPC movement to be extended.
 * Returns new WorldState with updated player position (if move is valid),
 * or with updated facing direction only (if move is blocked).
 */
export const resolveMoveIntent = (state: WorldState, intent: Intent): WorldState => {
  // Currently only support player movement
  if (intent.actorId !== state.player.id) {
    return state;
  }

  if (!intent.payload?.direction) {
    return state;
  }

  const { dx, dy } = directionToDelta(intent.payload.direction);
  const nextFacingDirection = toFacingDirectionFromDirection(intent.payload.direction);

  const nextPosition = {
    x: state.player.position.x + dx,
    y: state.player.position.y + dy,
  };

  if (!canMovePlayerTo(state, nextPosition)) {
    // Move blocked, but update facing direction to show player intent
    return {
      ...state,
      player: {
        ...state.player,
        facingDirection: nextFacingDirection,
      },
    };
  }

  // Move valid, apply position and facing direction
  return {
    ...state,
    player: {
      ...state.player,
      position: nextPosition,
      facingDirection: nextFacingDirection,
    },
  };
};

/**
 * Resolves an interact intent.
 * Currently a no-op; interaction logic remains in interaction dispatcher.
 * Intent type exists to support future unified interaction pipeline.
 */
export const resolveInteractIntent = (state: WorldState, intent: Intent): WorldState => {
  // Interaction handling delegated to interactionDispatcher
  return state;
};

/**
 * Resolves a wait intent (no-op action).
 * Useful for NPCs to explicitly pause or scripted delays.
 */
export const resolveWaitIntent = (state: WorldState, intent: Intent): WorldState => {
  return state;
};

/**
 * Deterministic intent resolver: processes a single actor intent and returns
 * updated WorldState. The state is immutable and contains all side effects
 * of the action (movement, facing, etc.).
 *
 * Each intent type is routed to its handler. Unrecognized intent types
 * are treated as no-ops.
 *
 * @param state Current world state
 * @param intent Actor action to resolve
 * @returns Updated world state with intent effects applied
 */
export const resolveIntent = (state: WorldState, intent: Intent): WorldState => {
  switch (intent.type) {
    case 'move':
      return resolveMoveIntent(state, intent);
    case 'interact':
      return resolveInteractIntent(state, intent);
    case 'wait':
      return resolveWaitIntent(state, intent);
    default:
      // Unknown intent type; treat as no-op
      const _exhaustive: never = intent.type;
      return _exhaustive;
  }
};
