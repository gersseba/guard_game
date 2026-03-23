import type { WorldCommand } from '../world/types';

export interface CommandBuffer {
  enqueue(command: WorldCommand): void;
  drain(): WorldCommand[];
}

export const createCommandBuffer = (): CommandBuffer => {
  const pendingCommands: WorldCommand[] = [];

  return {
    enqueue: (command: WorldCommand) => {
      pendingCommands.push(command);
    },
    drain: () => {
      const snapshot = [...pendingCommands];
      pendingCommands.length = 0;
      return snapshot;
    },
  };
};
