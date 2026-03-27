import type { CommandBuffer } from './input/commands';
import type { World, WorldCommand, WorldState } from './world/types';

export interface RuntimeConversationSession {
  actorId: string;
}

export interface RuntimeControllerDependencies {
  world: Pick<World, 'getState' | 'applyCommands'>;
  commandBuffer: Pick<CommandBuffer, 'drain' | 'clear'>;
  runInteractions: (worldState: WorldState, commands: WorldCommand[]) => void;
}

export interface RuntimeController {
  stepSimulation(): void;
  openConversation(actorId: string): void;
  closeConversation(): void;
  isPaused(): boolean;
  getCurrentInteraction(): RuntimeConversationSession | null;
}

export const createRuntimeController = (
  dependencies: RuntimeControllerDependencies,
): RuntimeController => {
  let paused = false;
  let currentInteraction: RuntimeConversationSession | null = null;

  return {
    stepSimulation(): void {
      if (paused) {
        dependencies.commandBuffer.drain();
        return;
      }

      const worldStateBeforeCommands = dependencies.world.getState();
      let commandsToApply = dependencies.commandBuffer.drain();

      if (worldStateBeforeCommands.levelOutcome) {
        commandsToApply = [];
      }

      dependencies.world.applyCommands(commandsToApply);
      const worldState = dependencies.world.getState();
      dependencies.runInteractions(worldState, commandsToApply);
    },

    openConversation(actorId: string): void {
      currentInteraction = { actorId };
      paused = true;
      dependencies.commandBuffer.clear();
    },

    closeConversation(): void {
      currentInteraction = null;
      paused = false;
      dependencies.commandBuffer.clear();
    },

    isPaused(): boolean {
      return paused;
    },

    getCurrentInteraction(): RuntimeConversationSession | null {
      return currentInteraction;
    },
  };
};
