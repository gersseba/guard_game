import { createInitialWorldState } from './state';
import { canMovePlayerTo } from './spatialRules';
import type { World, WorldCommand, WorldState } from './types';

const applyCommand = (worldState: WorldState, command: WorldCommand): WorldState => {
  if (command.type === 'move') {
    const nextPosition = {
      x: worldState.player.position.x + command.dx,
      y: worldState.player.position.y + command.dy,
    };

    if (!canMovePlayerTo(worldState, nextPosition)) {
      return worldState;
    }

    return {
      ...worldState,
      player: {
        ...worldState.player,
        position: nextPosition,
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
