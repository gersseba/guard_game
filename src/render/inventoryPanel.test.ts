// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createInventoryPanel } from './inventoryPanel';

describe('createInventoryPanel', () => {
  it('always renders a 3x3 grid of 9 inventory tiles', () => {
    const container = document.createElement('div');
    const panel = createInventoryPanel(container);

    panel.render({ items: [], selectedItem: null });

    const tiles = container.querySelectorAll('.inventory-tile');
    expect(tiles).toHaveLength(9);
  });

  it('re-renders with fresh tiles on each call', () => {
    const container = document.createElement('div');
    const panel = createInventoryPanel(container);

    panel.render({ items: [], selectedItem: null });
    panel.render({ items: [], selectedItem: null });

    expect(container.querySelectorAll('.inventory-tile')).toHaveLength(9);
  });

  it('highlights the selected slot with blue border', () => {
    const container = document.createElement('div');
    const panel = createInventoryPanel(container);

    panel.render({
      items: [
        {
          itemId: 'key-1',
          displayName: 'Bronze Key',
          sourceObjectId: 'crate-1',
          pickedUpAtTick: 2,
        },
      ],
      selectedItem: { slotIndex: 0, itemId: 'key-1' },
    });

    const tiles = container.querySelectorAll<HTMLElement>('.inventory-tile');
    // jsdom normalises hex to rgb
    expect(tiles[0]?.style.borderColor).toMatch(/4488ff|rgb\(68,\s*136,\s*255\)/);
    expect(tiles[1]?.style.borderColor).not.toMatch(/4488ff|rgb\(68,\s*136,\s*255\)/);
  });

  it('shows item display name in filled tile', () => {
    const container = document.createElement('div');
    const panel = createInventoryPanel(container);

    panel.render({
      items: [
        {
          itemId: 'coin-1',
          displayName: 'Gold Coin',
          sourceObjectId: 'crate-2',
          pickedUpAtTick: 3,
        },
      ],
      selectedItem: null,
    });

    const tiles = container.querySelectorAll<HTMLElement>('.inventory-tile');
    expect(tiles[0]?.textContent).toContain('Gold Coin');
  });
});
