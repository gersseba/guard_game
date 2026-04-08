import type { GridPosition, SpriteDirection, SpriteSet } from './grid.js';
import type { PlayerInventory } from './inventory.js';

export interface Player {
  id: string;
  displayName: string;
  position: GridPosition;
  inventory: PlayerInventory;
  facingDirection?: SpriteDirection;
  spriteAssetPath?: string;
  spriteSet?: SpriteSet;
}
