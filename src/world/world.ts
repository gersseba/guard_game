import { createInitialWorldState } from './state';
import { resolveIntent } from './intentResolver';
import type { Intent, World, WorldCommand, WorldState } from './types';

/**
 * Converts dx/dy movement delta to cardinal direction.
 * Used to bridge between legacy WorldCommand format and Intent pipeline.
 */
const deltaToDirection = (dx: number, dy: number): 'up' | 'down' | 'left' | 'right' | null => {
  if (dx === 0 && dy === -1) return 'up';
  if (dx === 0 && dy === 1) return 'down';
  if (dx === -1 && dy === 0) return 'left';
  if (dx === 1 && dy === 0) return 'right';
  return null;
};

const applyCommand = (worldState: WorldState, command: WorldCommand): WorldState => {
  if (command.type === 'move') {
    const direction = deltaToDirection(command.dx, command.dy);
    if (direction === null) {
      // Invalid movement vector; no-op
      return worldState;
    }

    const moveIntent: Intent = {
      actorId: worldState.player.id,
      type: 'move',
      payload: { direction },
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
