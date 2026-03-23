import { createInitialWorldState } from './state';
import type { World, WorldCommand, WorldState } from './types';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const applyCommand = (worldState: WorldState, command: WorldCommand): WorldState => {
  if (command.type === 'move') {
    const nextX = clamp(worldState.player.position.x + command.dx, 0, worldState.grid.width - 1);
    const nextY = clamp(worldState.player.position.y + command.dy, 0, worldState.grid.height - 1);

    return {
      ...worldState,
      player: {
        ...worldState.player,
        position: {
          x: nextX,
          y: nextY,
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
  };
};
