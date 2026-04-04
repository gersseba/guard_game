import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { createInventoryOverlay } from './inventoryOverlay';
import type { PlayerInventory } from '../world/types';

describe('inventory overlay', () => {
  let hostElement: HTMLDivElement;
  let onCloseSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    hostElement = document.createElement('div');
    document.body.appendChild(hostElement);
    onCloseSpy = vi.fn();
  });

  afterEach(() => {
    hostElement.remove();
    vi.clearAllMocks();
  });

  it('renders a 3x3 grid of inventory tiles', () => {
    const overlay = createInventoryOverlay(hostElement, { onClose: onCloseSpy });
    const inventory: PlayerInventory = {
      items: [
        { slotIndex: 0, itemId: 'key-1' },
        { slotIndex: 1, itemId: 'coin-5' },
      ],
      selectedItem: { slotIndex: 0, itemId: 'key-1' },
    };

    overlay.open(inventory);

    const tiles = hostElement.querySelectorAll('.inventory-tile');
    expect(tiles.length).toBe(9); // 3x3 grid
  });

  it('highlights selected item with distinct styling', () => {
    const overlay = createInventoryOverlay(hostElement, { onClose: onCloseSpy });
    const inventory: PlayerInventory = {
      items: [{ slotIndex: 0, itemId: 'key-1' }],
      selectedItem: { slotIndex: 0, itemId: 'key-1' },
    };

    overlay.open(inventory);

    const tiles = hostElement.querySelectorAll('.inventory-tile');
    const firstTile = tiles[0] as HTMLElement;
    expect(firstTile.style.borderColor).toContain('4488ff');
  });

  it('displays tooltip on tile hover', () => {
    const overlay = createInventoryOverlay(hostElement, { onClose: onCloseSpy });
    const inventory: PlayerInventory = {
      items: [{ slotIndex: 0, itemId: 'key-1' }],
      selectedItem: null,
    };

    overlay.open(inventory);

    const tile = hostElement.querySelector('.inventory-tile') as HTMLElement;
    if (!tile) throw new Error('Expected tile to exist');

    tile.dispatchEvent(new Event('mouseenter'));
    const tooltip = document.querySelector('.inventory-tooltip') as HTMLElement;
    expect(tooltip).toBeTruthy();
  });

  it('closes on ESC key', () => {
    const overlay = createInventoryOverlay(hostElement, { onClose: onCloseSpy });
    const inventory: PlayerInventory = {
      items: [],
      selectedItem: null,
    };

    overlay.open(inventory);
    expect(hostElement.innerHTML).not.toBe('');

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(escapeEvent);

    overlay.close();
    expect(onCloseSpy).toHaveBeenCalled();
  });

  it('displays empty state for tiles without items', () => {
    const overlay = createInventoryOverlay(hostElement, { onClose: onCloseSpy });
    const inventory: PlayerInventory = {
      items: [],
      selectedItem: null,
    };

    overlay.open(inventory);

    const tiles = hostElement.querySelectorAll('.inventory-tile');
    tiles.forEach((tile) => {
      const element = tile as HTMLElement;
      expect(element.style.backgroundColor).toMatch(/0d0d0d|rgb/);
    });
  });

  it('calls onClose callback when closing', () => {
    const overlay = createInventoryOverlay(hostElement, { onClose: onCloseSpy });
    const inventory: PlayerInventory = {
      items: [],
      selectedItem: null,
    };

    overlay.open(inventory);
    overlay.close();

    expect(onCloseSpy).toHaveBeenCalledOnce();
  });
});
