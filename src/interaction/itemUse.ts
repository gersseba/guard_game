import type { ItemUseAttemptResultEvent, WorldState } from '../world/types';
import { Item } from '../world/entities/items/Item';
import { resolveAdjacentTarget } from './adjacencyResolver';

export interface ItemUseResolutionInput {
  worldState: WorldState;
  commandIndex: number;
}

export interface ItemUseResolver {
  resolveItemUseAttempt(input: ItemUseResolutionInput): ItemUseAttemptResultEvent;
}

/**
 * Deterministic resolver for item-use attempts.
 * Supports:
 * - Guard rules: matching rule + allowed = success with affectedEntityId/Type
 * - Object rules: matching rule + allowed = success with affectedEntityId/Type
 * Wrong item or unsupported target = blocked/no-rule with no mutation.
 */
export const createDefaultItemUseResolver = (): ItemUseResolver => {
  return {
    resolveItemUseAttempt({ worldState, commandIndex }: ItemUseResolutionInput): ItemUseAttemptResultEvent {
      const selectedItem = worldState.player.inventory.selectedItem ?? null;

      // No item selected: fail early
      if (!selectedItem) {
        return {
          tick: worldState.tick,
          commandIndex,
          selectedItem: null,
          result: 'no-selection',
          target: null,
        };
      }

      const selectedInventoryDto = worldState.player.inventory.items[selectedItem.slotIndex];
      if (!selectedInventoryDto) {
        return {
          tick: worldState.tick,
          commandIndex,
          selectedItem: null,
          result: 'no-selection',
          target: null,
        };
      }

      const selectedInventoryItem = Item.fromInventoryItem(selectedInventoryDto);
      if (!selectedInventoryItem.matchesItemId(selectedItem.itemId)) {
        return {
          tick: worldState.tick,
          commandIndex,
          selectedItem: null,
          result: 'no-selection',
          target: null,
        };
      }

      // Find adjacent target
      const adjacentTarget = resolveAdjacentTarget(worldState);

      // No adjacent target
      if (!adjacentTarget) {
        return {
          tick: worldState.tick,
          commandIndex,
          selectedItem,
          result: 'no-target',
          target: null,
        };
      }

      // Handle door item-use (key-based unlock)
      if (adjacentTarget.kind === 'door') {
        const door = adjacentTarget.target;

        // Door has no required item: item-use has no effect on this door
        if (!door.requiredItemId) {
          return {
            tick: worldState.tick,
            commandIndex,
            selectedItem,
            result: 'no-target',
            target: {
              kind: 'door',
              targetId: door.id,
            },
          };
        }

        // Door requires an item. Check if selected item matches.
        if (selectedInventoryItem.matchesItemId(door.requiredItemId)) {
          // Correct key: unlock the door
          return {
            tick: worldState.tick,
            commandIndex,
            selectedItem,
            result: 'success',
            target: {
              kind: 'door',
              targetId: door.id,
            },
            doorUnlockedId: door.id,
          };
        } else {
          // Wrong key: blocked
          return {
            tick: worldState.tick,
            commandIndex,
            selectedItem,
            result: 'blocked',
            target: {
              kind: 'door',
              targetId: door.id,
            },
          };
        }
      }

      // Handle guard item-use (rules)
      if (adjacentTarget.kind === 'guard') {
        const guard = adjacentTarget.target;
        const rule = guard.itemUseRules?.[selectedInventoryItem.itemId];

        // No rule defined for this item on this guard
        if (!rule) {
          return {
            tick: worldState.tick,
            commandIndex,
            selectedItem,
            result: 'no-rule',
            target: {
              kind: 'guard',
              targetId: guard.id,
            },
          };
        }

        // Rule exists: check if allowed
        if (rule.allowed) {
          // Rule allows use: success with affected entity
          return {
            tick: worldState.tick,
            commandIndex,
            selectedItem,
            result: 'success',
            target: {
              kind: 'guard',
              targetId: guard.id,
            },
            affectedEntityType: 'guard',
            affectedEntityId: guard.id,
            ruleResponseText: rule.responseText,
          };
        } else {
          // Rule prohibits use: blocked
          return {
            tick: worldState.tick,
            commandIndex,
            selectedItem,
            result: 'blocked',
            target: {
              kind: 'guard',
              targetId: guard.id,
            },
            ruleResponseText: rule.responseText,
          };
        }
      }

      // Handle interactive object item-use (rules)
      if (adjacentTarget.kind === 'interactiveObject') {
        const obj = adjacentTarget.target;
        const rule = obj.itemUseRules?.[selectedInventoryItem.itemId];

        // No rule defined for this item on this object
        if (!rule) {
          return {
            tick: worldState.tick,
            commandIndex,
            selectedItem,
            result: 'no-rule',
            target: {
              kind: 'interactiveObject',
              targetId: obj.id,
            },
          };
        }

        // Rule exists: check if allowed
        if (rule.allowed) {
          // Rule allows use: success with affected entity
          return {
            tick: worldState.tick,
            commandIndex,
            selectedItem,
            result: 'success',
            target: {
              kind: 'interactiveObject',
              targetId: obj.id,
            },
            affectedEntityType: 'object',
            affectedEntityId: obj.id,
            ruleResponseText: rule.responseText,
          };
        } else {
          // Rule prohibits use: blocked
          return {
            tick: worldState.tick,
            commandIndex,
            selectedItem,
            result: 'blocked',
            target: {
              kind: 'interactiveObject',
              targetId: obj.id,
            },
            ruleResponseText: rule.responseText,
          };
        }
      }

      // Unsupported target type for item-use
      return {
        tick: worldState.tick,
        commandIndex,
        selectedItem,
        result: 'no-target',
        target: null,
      };
    },
  };
};