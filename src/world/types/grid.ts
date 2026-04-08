export interface GridPosition {
  x: number;
  y: number;
}

export type SpriteDirection = 'front' | 'away' | 'left' | 'right';

/**
 * Serializable sprite configuration for entities with optional directional variants.
 * `default` provides a deterministic base asset when a directional key is missing.
 */
export interface SpriteSet {
  default?: string;
  front?: string;
  away?: string;
  left?: string;
  right?: string;
}
