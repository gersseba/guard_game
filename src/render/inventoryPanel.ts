import type { PlayerInventory } from '../world/types';
import { buildInventoryGridElement } from './inventoryGrid';

export interface InventoryPanelHandle {
  render(inventory: PlayerInventory): void;
}

/**
 * Renders a persistent 3×3 inventory grid inside the level briefing sidebar.
 * Shares the same tile appearance as the full-screen inventory overlay.
 */
export const createInventoryPanel = (container: HTMLElement): InventoryPanelHandle => {
  return {
    render(inventory: PlayerInventory): void {
      const grid = buildInventoryGridElement(inventory);
      grid.style.padding = '12px';
      grid.style.backgroundColor = 'rgba(34, 34, 34, 0.85)';
      grid.style.borderRadius = '8px';
      container.replaceChildren(grid);
    },
  };
};
