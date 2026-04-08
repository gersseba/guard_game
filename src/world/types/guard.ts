import type { GameEntity } from './entity.js';
import type { SpriteDirection } from './grid.js';
import type { ItemUseRule } from './inventory.js';

/** A guard entity that the player can interact with. */
export interface Guard extends GameEntity {
  guardState: 'idle' | 'patrolling' | 'alert';
  facingDirection?: SpriteDirection;
  /** Instance-specific knowledge this guard has (overrides or extends type-level knowledge). */
  instanceKnowledge?: string;
  /** Instance-specific behavior traits for this guard (overrides or extends type-level behavior). */
  instanceBehavior?: string;
  /** Deterministic item-use rules: item ID → rule definition */
  itemUseRules?: Record<string, ItemUseRule>;
}
