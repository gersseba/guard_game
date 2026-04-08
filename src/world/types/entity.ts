import type { GridPosition, SpriteSet } from './grid.js';
import type { InventoryItem } from './inventory.js';

/**
 * Shared structural base for all game entities.
 * All world entities share this common root. JSON-serializable.
 */
export interface GameEntity {
  id: string;
  position: GridPosition;
  displayName: string;
  spriteSet?: SpriteSet;
  spriteAssetPath?: string;
  /** Open-ended behavioral traits bag, readable by LLM prompt builders. */
  traits?: Record<string, string>;
  /** Open-ended facts bag for arbitrary key/value data, readable by LLM prompt builders. */
  facts?: Record<string, string | number | boolean>;
}

/**
 * Opt-in capability container for game entities.
 * Capabilities are typed sub-objects; omit a key if the entity lacks that capability.
 */
export interface EntityCapabilities {
  inventory?: { items: InventoryItem[] };
  dialogue?: { threadId?: string };
  patrol?: { path: GridPosition[] };
  lock?: { isLocked: boolean; requiredItemId?: string };
}
