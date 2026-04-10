import type { GameEntity } from './entity.js';

/** A door that the player can pass through or be blocked by. */
export interface Door extends GameEntity {
  /** Whether the door is currently open. */
  isOpen: boolean;
  /** Whether the door is currently locked. */
  isLocked: boolean;
  /** Deterministic level outcome trigger for this door. true => win, false => lose. */
  isSafe?: boolean;
  /** Item ID required to unlock this door (if set, door must be interacted with using this item) */
  requiredItemId?: string;
}
