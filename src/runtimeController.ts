import type { CommandBuffer } from './input/commands';
import type { ItemUseResolver } from './interaction/itemUse';
import type { ItemUseAttemptResultEvent } from './world/types';
import type { World, WorldCommand, WorldState } from './world/types';

export interface RuntimeConversationSession {
  actorId: string;
}

export interface RuntimeActionModalSession {
  targetId: string;
  targetKind: 'guard' | 'npc';
  displayName: string;
}

export interface RuntimeControllerDependencies {
  world: Pick<World, 'getState' | 'applyCommands'>;
  commandBuffer: Pick<CommandBuffer, 'drain' | 'clear'>;
  runInteractions: (worldState: WorldState, commands: WorldCommand[]) => void;
  itemUseResolver?: ItemUseResolver;
  onItemUseAttemptResolved?: (event: ItemUseAttemptResultEvent) => void;
}

export interface RuntimeController {
  stepSimulation(): void;
  openConversation(actorId: string): void;
  closeConversation(): void;
  openActionModal(session: RuntimeActionModalSession): void;
  closeActionModal(): void;
  getCurrentActionModal(): RuntimeActionModalSession | null;
  openInventoryOverlay(session: RuntimeActionModalSession): void;
  closeInventoryOverlay(): void;
  isPaused(): boolean;
  getCurrentInteraction(): RuntimeConversationSession | null;
}

export const createRuntimeController = (
  dependencies: RuntimeControllerDependencies,
): RuntimeController => {
  let interactionMode: 'none' | 'conversation' | 'action-modal' | 'inventory' = 'none';
  let currentInteraction: RuntimeConversationSession | null = null;
  let currentActionModal: RuntimeActionModalSession | null = null;

  return {
    stepSimulation(): void {
      if (interactionMode !== 'none') {
        dependencies.commandBuffer.drain();
        return;
      }

      const worldStateBeforeCommands = dependencies.world.getState();
      let commandsToApply = dependencies.commandBuffer.drain();

      if (worldStateBeforeCommands.levelOutcome) {
        commandsToApply = [];
      }

      const useSelectedItemCommandIndexes = commandsToApply
        .map((command, index) => (command.type === 'useSelectedItem' ? index : null))
        .filter((index): index is number => index !== null);

      dependencies.world.applyCommands(commandsToApply);
      const worldState = dependencies.world.getState();

      if (dependencies.itemUseResolver && dependencies.onItemUseAttemptResolved) {
        useSelectedItemCommandIndexes.forEach((commandIndex) => {
          const event = dependencies.itemUseResolver?.resolveItemUseAttempt({
            worldState,
            commandIndex,
          });
          if (event) {
            dependencies.onItemUseAttemptResolved?.(event);
          }
        });
      }

      dependencies.runInteractions(worldState, commandsToApply);
    },

    openConversation(actorId: string): void {
      currentInteraction = { actorId };
      currentActionModal = null;
      interactionMode = 'conversation';
      dependencies.commandBuffer.clear();
    },

    closeConversation(): void {
      currentInteraction = null;
      interactionMode = 'none';
      dependencies.commandBuffer.clear();
    },

    openActionModal(session: RuntimeActionModalSession): void {
      currentActionModal = session;
      currentInteraction = null;
      interactionMode = 'action-modal';
      dependencies.commandBuffer.clear();
    },

    closeActionModal(): void {
      currentActionModal = null;
      interactionMode = 'none';
      dependencies.commandBuffer.clear();
    },

    getCurrentActionModal(): RuntimeActionModalSession | null {
      return currentActionModal;
    },

    openInventoryOverlay(session: RuntimeActionModalSession): void {
      currentActionModal = session;
      interactionMode = 'inventory';
      dependencies.commandBuffer.clear();
    },

    closeInventoryOverlay(): void {
      currentActionModal = null;
      interactionMode = 'none';
      dependencies.commandBuffer.clear();
    },

    isPaused(): boolean {
      return interactionMode !== 'none';
    },

    getCurrentInteraction(): RuntimeConversationSession | null {
      return currentInteraction;
    },
  };
};
