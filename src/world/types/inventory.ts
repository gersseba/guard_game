export interface InventoryItem {
  itemId: string;
  displayName: string;
  sourceObjectId: string;
  pickedUpAtTick: number;
}

export interface PlayerInventory {
  items: InventoryItem[];
  selectedItem?: SelectedInventoryItem | null;
}

export interface SelectedInventoryItem {
  slotIndex: number;
  itemId: string;
}

/**
 * Deterministic item-use rule for guards or objects.
 * Defines whether an item can be used and what response to provide.
 */
export interface ItemUseRule {
  allowed: boolean;
  responseText: string;
}

export type ItemUseAttemptResult = 'no-selection' | 'no-target' | 'blocked' | 'success' | 'no-rule';

export interface ItemUseAttemptResultEvent {
  tick: number;
  commandIndex: number;
  selectedItem: SelectedInventoryItem | null;
  result: ItemUseAttemptResult;
  target: {
    kind: 'door' | 'guard' | 'npc' | 'interactiveObject';
    targetId: string;
  } | null;
  /** If a door was unlocked via correct item-use, contains the door ID */
  doorUnlockedId?: string;
  /** Type of entity affected by successful item-use rule (guard or object) */
  affectedEntityType?: 'guard' | 'object';
  /** ID of entity affected by successful item-use rule */
  affectedEntityId?: string;
  /** Response text from the applied item-use rule */
  ruleResponseText?: string;
}
