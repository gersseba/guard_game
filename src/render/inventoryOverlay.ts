import type { PlayerInventory } from '../world/types';
import { buildInventoryGridElement, GRID_COLS, GRID_ROWS, TILE_SIZE } from './inventoryGrid';

export interface InventoryOverlayOptions {
  onClose(): void;
}

export interface InventoryOverlay {
  open(inventory: PlayerInventory): void;
  close(): void;
}

const TOOLTIP_OFFSET = 10;
const TOOLTIP_MAX_WIDTH = 150;
export const createInventoryOverlay = (
  hostElement: HTMLElement,
  options: InventoryOverlayOptions,
): InventoryOverlay => {
  let currentInventory: PlayerInventory | null = null;
  let tooltipElement: HTMLDivElement | null = null;
  let isOpen = false;
  let focusedSlotIndex: number | null = null;
  let disposeListeners: (() => void) | null = null;

  const createTooltip = (): HTMLDivElement => {
    const tooltip = document.createElement('div');
    tooltip.className = 'inventory-tooltip';
    tooltip.style.position = 'fixed';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.zIndex = '1001';
    tooltip.style.display = 'none';
    tooltip.style.backgroundColor = '#222';
    tooltip.style.color = '#fff';
    tooltip.style.padding = '8px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '12px';
    tooltip.style.maxWidth = `${TOOLTIP_MAX_WIDTH}px`;
    tooltip.style.wordWrap = 'break-word';
    tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.8)';
    return tooltip;
  };

  const positionTooltip = (
    tooltip: HTMLDivElement,
    x: number,
    y: number,
    tileId: string,
  ): void => {
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipRect = tooltip.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width || TOOLTIP_MAX_WIDTH;
    const tooltipHeight = tooltipRect.height || 40;

    // Position below the tile by default, shift if near viewport edge
    let posX = x + TOOLTIP_OFFSET;
    let posY = y + TILE_SIZE + TOOLTIP_OFFSET;

    // Adjust for right edge
    if (posX + tooltipWidth > viewportWidth - 10) {
      posX = x - tooltipWidth - TOOLTIP_OFFSET;
    }

    // Adjust for bottom edge
    if (posY + tooltipHeight > viewportHeight - 10) {
      posY = y - tooltipHeight - TOOLTIP_OFFSET;
    }

    tooltip.style.left = `${posX}px`;
    tooltip.style.top = `${posY}px`;
    tooltip.textContent = tileId;
  };

  const renderGrid = (): (() => void) | undefined => {
    if (!currentInventory) return;

    // Clear host
    hostElement.innerHTML = '';

    // Create tooltip if it doesn't exist
    if (!tooltipElement) {
      tooltipElement = createTooltip();
      document.body.appendChild(tooltipElement);
    }

    // Create grid overlay wrapper
    const overlay = document.createElement('div');
    overlay.className = 'inventory-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.backgroundColor = 'rgba(51, 51, 51, 0.9)';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '1000';
    overlay.style.gap = '20px';

    // Create header
    const header = document.createElement('h2');
    header.textContent = 'Inventory';
    header.style.color = '#fff';
    header.style.margin = '0';
    header.style.marginTop = '-60px';
    overlay.appendChild(header);

    // Build the shared 3×3 tile grid
    const gridContainer = buildInventoryGridElement(currentInventory);
    gridContainer.style.padding = '20px';
    gridContainer.style.backgroundColor = 'rgba(34, 34, 34, 0.7)';
    gridContainer.style.borderRadius = '8px';
    gridContainer.style.boxShadow = '0 4px 12px rgba(0,0,0,0.8)';

    // Apply keyboard focus highlight
    if (focusedSlotIndex !== null) {
      const allTiles = gridContainer.querySelectorAll<HTMLElement>('.inventory-tile');
      const focused = allTiles[focusedSlotIndex];
      if (focused) {
        focused.style.outline = '3px solid #88ff00';
        focused.style.outlineOffset = '2px';
      }
    }

    // Attach tooltip listeners to filled tiles
    const allTiles = gridContainer.querySelectorAll<HTMLElement>('.inventory-tile');
    allTiles.forEach((tile, slotIndex) => {
      const item = currentInventory!.items[slotIndex];
      if (!item) return;

      tile.addEventListener('mouseenter', () => {
        if (tooltipElement) {
          const rect = tile.getBoundingClientRect();
          positionTooltip(tooltipElement, rect.left, rect.top, item.itemId);
          tooltipElement.style.display = 'block';
        }
      });

      tile.addEventListener('mouseleave', () => {
        if (tooltipElement) {
          tooltipElement.style.display = 'none';
        }
      });
    });

    overlay.appendChild(gridContainer);

    // Add close hint
    const hint = document.createElement('p');
    hint.textContent = 'Press ESC to close';
    hint.style.color = '#888';
    hint.style.margin = '0';
    hint.style.marginTop = '10px';
    hint.style.fontSize = '12px';
    overlay.appendChild(hint);

    hostElement.appendChild(overlay);

    // Set up keyboard navigation
    const onKeyDown = (event: KeyboardEvent) => {
      // Arrow key navigation
      let nextIndex = focusedSlotIndex ?? 0;

      if (event.key === 'ArrowRight') {
        nextIndex = (nextIndex + 1) % (GRID_COLS * GRID_ROWS);
        event.preventDefault();
      } else if (event.key === 'ArrowLeft') {
        nextIndex = (nextIndex - 1 + GRID_COLS * GRID_ROWS) % (GRID_COLS * GRID_ROWS);
        event.preventDefault();
      } else if (event.key === 'ArrowDown') {
        nextIndex = (nextIndex + GRID_COLS) % (GRID_COLS * GRID_ROWS);
        event.preventDefault();
      } else if (event.key === 'ArrowUp') {
        nextIndex = (nextIndex - GRID_COLS + GRID_COLS * GRID_ROWS) % (GRID_COLS * GRID_ROWS);
        event.preventDefault();
      }

      if (focusedSlotIndex !== nextIndex) {
        focusedSlotIndex = nextIndex;
        renderGrid();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  };

  const open = (inventory: PlayerInventory): void => {
    currentInventory = inventory;
    isOpen = true;
    focusedSlotIndex = null;
    const cleanup = renderGrid();

    const onEscapeClose = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    window.addEventListener('keydown', onEscapeClose);

    const previousCleanup = cleanup;
    disposeListeners = (): void => {
      previousCleanup?.();
      window.removeEventListener('keydown', onEscapeClose);
      if (tooltipElement) {
        tooltipElement.style.display = 'none';
      }
    };
  };

  const close = (): void => {
    if (!isOpen) return;

    isOpen = false;
    hostElement.innerHTML = '';
    currentInventory = null;
    focusedSlotIndex = null;

    if (tooltipElement) {
      tooltipElement.style.display = 'none';
    }

    if (disposeListeners) {
      disposeListeners();
      disposeListeners = null;
    }

    options.onClose();
  };

  return {
    open,
    close,
  };
};