import { createInitialWorldState } from './state';
import { resolveIntent } from './intentResolver';
import type { Intent, World, WorldCommand, WorldState } from './types';

const applyCommand = (worldState: WorldState, command: WorldCommand): WorldState => {
  if (command.type === 'move') {
    // Convert WorldCommand move to Intent format with delta payload
    // (supports both cardinal directions and arbitrary movement vectors)
    const moveIntent: Intent = {
      actorId: worldState.player.id,
      type: 'move',
      payload: {
        delta: { dx: command.dx, dy: command.dy },
      },
    };

    return resolveIntent(worldState, moveIntent);
  }

  if (command.type === 'selectInventorySlot') {
    const selectedCandidate = worldState.player.inventory.items[command.slotIndex];
    const selectedItem = selectedCandidate
      ? {
          slotIndex: command.slotIndex,
          itemId: selectedCandidate.itemId,
        }
      : null;

    return {
      ...worldState,
      player: {
        ...worldState.player,
        inventory: {
          ...worldState.player.inventory,
          selectedItem,
        },
      },
    };
  }

  return worldState;
};

export const createWorld = (): World => {
  let worldState = createInitialWorldState();

  return {
    getState: () => worldState,
    applyCommands: (commands: WorldCommand[]) => {
      const nextState = commands.reduce(applyCommand, worldState);
      worldState = {
        ...nextState,
        tick: nextState.tick + 1,
      };
    },
    resetToState: (state: WorldState) => {
      worldState = state;
    },
  };
};
