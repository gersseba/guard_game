import type { ItemUseAttemptResultEvent, WorldState } from '../world/types';
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
 * Implements door unlock resolution: correct item + locked door = success + doorUnlockedId.
 * Wrong item or no selection on required-item door = blocked with no unlock.
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

      // Only doors support item-use for unlocking
      if (adjacentTarget.kind !== 'door') {
        return {
          tick: worldState.tick,
          commandIndex,
          selectedItem,
          result: 'no-target',
          target: null,
        };
      }

      const door = adjacentTarget.target;

      // Door doesn't require an item
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
      const itemMatches = selectedItem.itemId === door.requiredItemId;

      if (itemMatches) {
        // Correct key: success!
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
    },
  };
};