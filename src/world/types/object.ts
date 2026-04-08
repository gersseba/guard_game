import type { GameEntity } from './entity.js';
import type { ItemUseRule } from './inventory.js';

/**
 * Capability flags define what an interactive object can do.
 * Objects declare capabilities, and the interaction handler applies matching effects.
 */
export interface ObjectCapabilities {
  containsItems?: boolean;
  isActivatable?: boolean;
  isLockable?: boolean;
}

export interface InteractiveObject extends GameEntity {
  objectType: string;
  interactionType: 'inspect' | 'use' | 'talk';
  state: 'idle' | 'used';
  pickupItem?: {
    itemId: string;
    displayName: string;
  };
  idleMessage?: string;
  usedMessage?: string;
  firstUseOutcome?: 'win' | 'lose';
  /** Capability flags that drive behavior dispatch */
  capabilities?: ObjectCapabilities;
  /** Deterministic item-use rules: item ID → rule definition */
  itemUseRules?: Record<string, ItemUseRule>;
}
