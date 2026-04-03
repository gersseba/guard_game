import type { ItemUseAttemptResultEvent, WorldState } from '../world/types';

export interface ItemUseResolutionInput {
  worldState: WorldState;
  commandIndex: number;
}

export interface ItemUseResolver {
  resolveItemUseAttempt(input: ItemUseResolutionInput): ItemUseAttemptResultEvent;
}

/**
 * Default deterministic resolver for item-use attempts.
 * Later tickets can extend this with door/guard/object-specific rule checks.
 */
export const createDefaultItemUseResolver = (): ItemUseResolver => {
  return {
    resolveItemUseAttempt({ worldState, commandIndex }: ItemUseResolutionInput): ItemUseAttemptResultEvent {
      const selectedItem = worldState.player.inventory.selectedItem ?? null;

      return {
        tick: worldState.tick,
        commandIndex,
        selectedItem,
        result: selectedItem ? 'no-target' : 'no-selection',
        target: null,
      };
    },
  };
};