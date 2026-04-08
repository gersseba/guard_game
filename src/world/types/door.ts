import type { GameEntity } from './entity.js';

/** A door that the player can pass through or be blocked by. */
export interface Door extends GameEntity {
  doorState: 'open' | 'closed' | 'locked';
  outcome?: 'safe' | 'danger';
  /** Item ID required to unlock this door (if set, door must be interacted with using this item) */
  requiredItemId?: string;
  /** Whether this door has been unlocked via item-use (persists unlock state; default: false) */
  isUnlocked?: boolean;
}
