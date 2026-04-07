import type { InventoryItem, InteractiveObject } from '../../types';

export interface ItemInit {
  itemId: string;
  displayName: string;
  sourceObjectId: string;
  pickedUpAtTick: number;
}

export interface PickupItemDescriptor {
  sourceObjectId: string;
  pickedUpAtTick: number;
  pickupItem: NonNullable<InteractiveObject['pickupItem']>;
}

export interface ItemTransferResult {
  item: Item | null;
  remainingItems: InventoryItem[];
}

export class Item {
  public readonly itemId: string;
  public readonly displayName: string;
  public readonly sourceObjectId: string;
  public readonly pickedUpAtTick: number;

  public constructor(init: ItemInit) {
    this.itemId = init.itemId;
    this.displayName = init.displayName;
    this.sourceObjectId = init.sourceObjectId;
    this.pickedUpAtTick = init.pickedUpAtTick;
  }

  public static fromInventoryItem(item: InventoryItem): Item {
    return new Item({
      itemId: item.itemId,
      displayName: item.displayName,
      sourceObjectId: item.sourceObjectId,
      pickedUpAtTick: item.pickedUpAtTick,
    });
  }

  public static fromPickup(descriptor: PickupItemDescriptor): Item {
    return new Item({
      itemId: descriptor.pickupItem.itemId,
      displayName: descriptor.pickupItem.displayName,
      sourceObjectId: descriptor.sourceObjectId,
      pickedUpAtTick: descriptor.pickedUpAtTick,
    });
  }

  public static takeFirstByItemId(inventoryItems: InventoryItem[], itemId: string): ItemTransferResult {
    const index = inventoryItems.findIndex((item) => item.itemId === itemId);
    if (index < 0) {
      return {
        item: null,
        remainingItems: [...inventoryItems],
      };
    }

    const remainingItems = [...inventoryItems];
    const [transferredItem] = remainingItems.splice(index, 1);

    return {
      item: Item.fromInventoryItem(transferredItem),
      remainingItems,
    };
  }

  public matchesItemId(itemId: string): boolean {
    return this.itemId === itemId;
  }

  public toInventoryItem(): InventoryItem {
    return {
      itemId: this.itemId,
      displayName: this.displayName,
      sourceObjectId: this.sourceObjectId,
      pickedUpAtTick: this.pickedUpAtTick,
    };
  }
}
