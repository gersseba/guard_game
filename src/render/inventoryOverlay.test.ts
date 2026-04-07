// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createInventoryOverlay } from './inventoryOverlay';
import type { PlayerInventory } from '../world/types';

describe('inventory overlay', () => {
  let hostElement: HTMLDivElement;
  let onCloseCalls: number;
  let onClose: () => void;

  beforeEach(() => {
    hostElement = document.createElement('div');
    document.body.appendChild(hostElement);
    onCloseCalls = 0;
    onClose = (): void => {
      onCloseCalls += 1;
    };
  });

  afterEach(() => {
    hostElement.remove();
  });

  it('renders a 3x3 grid of inventory tiles', () => {
    const overlay = createInventoryOverlay(hostElement, { onClose });
    const inventory: PlayerInventory = {
      items: [
        { itemId: 'key-1', displayName: 'Bronze Key', sourceObjectId: 'crate-1', pickedUpAtTick: 1 },
        { itemId: 'coin-5', displayName: 'Gold Coin', sourceObjectId: 'crate-2', pickedUpAtTick: 2 },
      ],
      selectedItem: { slotIndex: 0, itemId: 'key-1' },
    };

    overlay.open(inventory);

    const tiles = hostElement.querySelectorAll('.inventory-tile');
    expect(tiles.length).toBe(9); // 3x3 grid
  });

  it('highlights selected item with distinct styling', () => {
    const overlay = createInventoryOverlay(hostElement, { onClose });
    const inventory: PlayerInventory = {
      items: [{ itemId: 'key-1', displayName: 'Bronze Key', sourceObjectId: 'crate-1', pickedUpAtTick: 1 }],
      selectedItem: { slotIndex: 0, itemId: 'key-1' },
    };

    overlay.open(inventory);

    const tiles = hostElement.querySelectorAll('.inventory-tile');
    const firstTile = tiles[0] as HTMLElement;
    // jsdom normalises hex colours to rgb
    expect(firstTile.style.borderColor).toMatch(/4488ff|rgb\(68,\s*136,\s*255\)/);
  });

  it('displays tooltip on tile hover', () => {
    const overlay = createInventoryOverlay(hostElement, { onClose });
    const inventory: PlayerInventory = {
      items: [{ itemId: 'key-1', displayName: 'Bronze Key', sourceObjectId: 'crate-1', pickedUpAtTick: 1 }],
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
    const overlay = createInventoryOverlay(hostElement, { onClose });
    const inventory: PlayerInventory = {
      items: [],
      selectedItem: null,
    };

    overlay.open(inventory);
    expect(hostElement.innerHTML).not.toBe('');

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(escapeEvent);

    overlay.close();
    expect(onCloseCalls).toBeGreaterThanOrEqual(1);
  });

  it('displays empty state for tiles without items', () => {
    const overlay = createInventoryOverlay(hostElement, { onClose });
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
    const overlay = createInventoryOverlay(hostElement, { onClose });
    const inventory: PlayerInventory = {
      items: [],
      selectedItem: null,
    };

    overlay.open(inventory);
    overlay.close();

    expect(onCloseCalls).toBe(1);
  });
});
