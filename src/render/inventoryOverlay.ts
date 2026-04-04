import type { PlayerInventory } from '../world/types';

export interface InventoryOverlayOptions {
  onClose(): void;
}

export interface InventoryOverlay {
  open(inventory: PlayerInventory): void;
  close(): void;
}

const GRID_COLS = 3;
const GRID_ROWS = 3;
const TILE_SIZE = 60;
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

    // Create grid container
    const gridContainer = document.createElement('div');
    gridContainer.style.display = 'grid';
    gridContainer.style.gridTemplateColumns = `repeat(${GRID_COLS}, ${TILE_SIZE}px)`;
    gridContainer.style.gap = '8px';
    gridContainer.style.padding = '20px';
    gridContainer.style.backgroundColor = 'rgba(34, 34, 34, 0.7)';
    gridContainer.style.borderRadius = '8px';
    gridContainer.style.boxShadow = '0 4px 12px rgba(0,0,0,0.8)';

    // Render each tile
    for (let slotIndex = 0; slotIndex < GRID_COLS * GRID_ROWS; slotIndex++) {
      const item = currentInventory.items[slotIndex];
      const tile = document.createElement('div');
      tile.className = 'inventory-tile';
      tile.style.width = `${TILE_SIZE}px`;
      tile.style.height = `${TILE_SIZE}px`;
      tile.style.backgroundColor = item ? '#1a1a1a' : '#0d0d0d';
      tile.style.border = '2px solid #444';
      tile.style.borderRadius = '4px';
      tile.style.display = 'flex';
      tile.style.alignItems = 'center';
      tile.style.justifyContent = 'center';
      tile.style.cursor = 'pointer';
      tile.style.transition = 'all 0.1s ease';
      tile.style.fontSize = '12px';
      tile.style.color = '#fff';
      tile.style.userSelect = 'none';
      tile.style.fontFamily = 'monospace';

      // Highlight selected item
      const isSelected =
        currentInventory.selectedItem &&
        currentInventory.selectedItem.slotIndex === slotIndex;
      if (isSelected) {
        tile.style.borderColor = '#4488ff';
        tile.style.backgroundColor = '#1a2a4a';
        tile.style.boxShadow = '0 0 8px rgba(68, 136, 255, 0.5)';
      }

      // Highlight focused tile for keyboard nav
      const isFocused = focusedSlotIndex === slotIndex;
      if (isFocused) {
        tile.style.outline = '3px solid #88ff00';
        tile.style.outlineOffset = '2px';
      }

      if (item) {
        tile.textContent = item.itemId;

        // Tooltip on hover
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
      }

      // Click to select
      tile.addEventListener('click', () => {
        if (item) {
          // This would normally dispatch a command, but for MVP we just highlight
        }
      });

      gridContainer.appendChild(tile);
    }

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