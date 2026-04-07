import { describe, expect, it } from 'vitest';
import type { InventoryItem } from '../../types';
import { Item } from './Item';

describe('Item', () => {
  it('creates an inventory item from pickup descriptor deterministically', () => {
    const item = Item.fromPickup({
      sourceObjectId: 'crate-1',
      pickedUpAtTick: 12,
      pickupItem: {
        itemId: 'brass-key',
        displayName: 'Brass Key',
      },
    });

    expect(item.toInventoryItem()).toEqual({
      itemId: 'brass-key',
      displayName: 'Brass Key',
      sourceObjectId: 'crate-1',
      pickedUpAtTick: 12,
    });
  });

  it('takes first matching item by itemId without mutating input array', () => {
    const inventory: InventoryItem[] = [
      {
        itemId: 'apple',
        displayName: 'Apple',
        sourceObjectId: 'crate-a',
        pickedUpAtTick: 1,
      },
      {
        itemId: 'token',
        displayName: 'Token',
        sourceObjectId: 'crate-b',
        pickedUpAtTick: 2,
      },
      {
        itemId: 'token',
        displayName: 'Token (Spare)',
        sourceObjectId: 'crate-c',
        pickedUpAtTick: 3,
      },
    ];

    const result = Item.takeFirstByItemId(inventory, 'token');

    expect(result.item?.toInventoryItem()).toEqual({
      itemId: 'token',
      displayName: 'Token',
      sourceObjectId: 'crate-b',
      pickedUpAtTick: 2,
    });
    expect(result.remainingItems).toEqual([
      {
        itemId: 'apple',
        displayName: 'Apple',
        sourceObjectId: 'crate-a',
        pickedUpAtTick: 1,
      },
      {
        itemId: 'token',
        displayName: 'Token (Spare)',
        sourceObjectId: 'crate-c',
        pickedUpAtTick: 3,
      },
    ]);
    expect(inventory).toHaveLength(3);
  });

  it('returns null transfer result when itemId is absent', () => {
    const inventory: InventoryItem[] = [
      {
        itemId: 'apple',
        displayName: 'Apple',
        sourceObjectId: 'crate-a',
        pickedUpAtTick: 1,
      },
    ];

    const result = Item.takeFirstByItemId(inventory, 'token');

    expect(result.item).toBeNull();
    expect(result.remainingItems).toEqual(inventory);
  });
});
