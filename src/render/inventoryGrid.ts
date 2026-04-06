import type { PlayerInventory } from '../world/types';

export const GRID_COLS = 3;
export const GRID_ROWS = 3;
export const TILE_SIZE = 60;

/**
 * Builds and returns a 3×3 inventory grid element.
 * No event listeners attached — callers add whatever interactions they need.
 */
export const buildInventoryGridElement = (inventory: PlayerInventory): HTMLDivElement => {
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = `repeat(${GRID_COLS}, ${TILE_SIZE}px)`;
  grid.style.gap = '8px';

  for (let slotIndex = 0; slotIndex < GRID_COLS * GRID_ROWS; slotIndex++) {
    const item = inventory.items[slotIndex];
    const tile = document.createElement('div');
    tile.className = 'inventory-tile';
    tile.style.width = `${TILE_SIZE}px`;
    tile.style.height = `${TILE_SIZE}px`;
    tile.style.backgroundColor = item ? '#1a1a1a' : '#0d0d0d';
    tile.style.border = '2px solid #444';
    tile.style.borderRadius = '4px';
    tile.style.display = 'flex';
    tile.style.flexDirection = 'column';
    tile.style.alignItems = 'center';
    tile.style.justifyContent = 'center';
    tile.style.gap = '2px';
    tile.style.padding = '4px';
    tile.style.cursor = 'pointer';
    tile.style.transition = 'all 0.1s ease';
    tile.style.fontSize = '12px';
    tile.style.color = '#fff';
    tile.style.userSelect = 'none';
    tile.style.fontFamily = 'monospace';
    tile.style.overflow = 'hidden';
    tile.style.textAlign = 'center';
    tile.style.lineHeight = '1.2';
    tile.style.boxSizing = 'border-box';

    const isSelected =
      inventory.selectedItem != null &&
      inventory.selectedItem.slotIndex === slotIndex;

    if (isSelected) {
      tile.style.borderColor = '#4488ff';
      tile.style.backgroundColor = '#1a2a4a';
      tile.style.boxShadow = '0 0 8px rgba(68, 136, 255, 0.5)';
    }

    const slotLabel = document.createElement('span');
    slotLabel.style.fontSize = '10px';
    slotLabel.style.color = item ? '#888' : '#444';
    slotLabel.textContent = `${slotIndex + 1}`;
    tile.appendChild(slotLabel);

    if (item) {
      const nameEl = document.createElement('span');
      nameEl.textContent = item.displayName;
      nameEl.style.overflow = 'hidden';
      nameEl.style.textOverflow = 'ellipsis';
      nameEl.style.whiteSpace = 'nowrap';
      nameEl.style.maxWidth = '100%';
      tile.appendChild(nameEl);
    }

    grid.appendChild(tile);
  }

  return grid;
};
