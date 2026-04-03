import { createInitialWorldState } from './state';
import { canMovePlayerTo } from './spatialRules';
import type { SpriteDirection, World, WorldCommand, WorldState } from './types';

const toFacingDirectionFromMove = (dx: number, dy: number): SpriteDirection | undefined => {
  if (dx < 0) {
    return 'left';
  }
  if (dx > 0) {
    return 'right';
  }
  if (dy < 0) {
    return 'away';
  }
  if (dy > 0) {
    return 'front';
  }
  return undefined;
};

const applyCommand = (worldState: WorldState, command: WorldCommand): WorldState => {
  if (command.type === 'move') {
    const nextFacingDirection =
      toFacingDirectionFromMove(command.dx, command.dy) ?? worldState.player.facingDirection ?? 'front';
    const nextPosition = {
      x: worldState.player.position.x + command.dx,
      y: worldState.player.position.y + command.dy,
    };

    if (!canMovePlayerTo(worldState, nextPosition)) {
      return {
        ...worldState,
        player: {
          ...worldState.player,
          facingDirection: nextFacingDirection,
        },
      };
    }

    return {
      ...worldState,
      player: {
        ...worldState.player,
        position: nextPosition,
        facingDirection: nextFacingDirection,
      },
    };
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
