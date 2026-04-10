import { createActionModal } from '../render/actionModal';
import { createChatModal } from '../render/chatModal';
import { createInventoryOverlay } from '../render/inventoryOverlay';
import type { ViewportOverlay } from '../render/viewportOverlay';
import type {
  RuntimeActionModalSession,
  RuntimeController,
  RuntimeConversationSession,
} from './runtimeController';
import type { ConversationMessage, WorldState } from '../world/types';
import type { LlmRequestError } from '../llm/client';

export interface RuntimeModalCoordinatorDependencies {
  runtimeController: Pick<
    RuntimeController,
    | 'closeActionModal'
    | 'closeConversation'
    | 'closeInventoryOverlay'
    | 'getCurrentActionModal'
    | 'getCurrentInteraction'
    | 'openActionModal'
    | 'openConversation'
    | 'openInventoryOverlay'
  >;
  world: Pick<{ getState: () => WorldState; resetToState: (state: WorldState) => void }, 'getState' | 'resetToState'>;
  viewportPauseOverlay: Pick<ViewportOverlay, 'show' | 'hide'>;
  chatModalHostElement: HTMLElement;
  actionModalHostElement: HTMLElement;
  inventoryOverlayHostElement: HTMLElement;
  onOpenConversationForActionSession: (session: RuntimeActionModalSession) => boolean;
  onSendConversationMessage: (
    actorId: string,
    playerMessage: string,
    onAssistantMessage: (message: string) => void,
    onLlmError?: (error: LlmRequestError) => void,
  ) => Promise<{ endedConversation: boolean }>;
}

export interface RuntimeModalCoordinator {
  openConversation(
    targetId: string,
    displayName: string,
    conversationHistory: ConversationMessage[],
    interactionKind: 'guard' | 'npc',
  ): void;
  openActionModal(session: RuntimeActionModalSession): void;
}

export const createRuntimeModalCoordinator = (
  dependencies: RuntimeModalCoordinatorDependencies,
): RuntimeModalCoordinator => {
  const chatModal = createChatModal(dependencies.chatModalHostElement, {
    onSend(playerMessage: string): void {
      const currentInteraction = dependencies.runtimeController.getCurrentInteraction();
      if (!currentInteraction) {
        chatModal.close();
        dependencies.viewportPauseOverlay.hide();
        return;
      }

      const interaction: RuntimeConversationSession = currentInteraction;
      chatModal.setError(null);
      chatModal.setLoading(true);
      chatModal.appendMessage('player', playerMessage);

      void (async () => {
        const result = await dependencies.onSendConversationMessage(
          interaction.actorId,
          playerMessage,
          (assistantMessage: string) => {
            chatModal.appendMessage('assistant', assistantMessage);
          },
          (_error: LlmRequestError) => {
            chatModal.setError('Request failed. Please try again.');
          },
        );

        if (result.endedConversation) {
          chatModal.close();
          return;
        }

        chatModal.setLoading(false);
      })();
    },

    onClose(): void {
      dependencies.runtimeController.closeConversation();
      dependencies.viewportPauseOverlay.hide();
    },
  });

  const inventoryOverlay = createInventoryOverlay(dependencies.inventoryOverlayHostElement, {
    onItemSelected(slotIndex: number): void {
      const currentState = dependencies.world.getState();
      const selectedCandidate = currentState.player.inventory.items[slotIndex] ?? null;
      if (!selectedCandidate) {
        return;
      }

      dependencies.world.resetToState({
        ...currentState,
        player: {
          ...currentState.player,
          inventory: {
            ...currentState.player.inventory,
            selectedItem: {
              slotIndex,
              itemId: selectedCandidate.itemId,
            },
          },
        },
      });

      inventoryOverlay.close();
    },

    onClose(): void {
      dependencies.runtimeController.closeInventoryOverlay();
      dependencies.viewportPauseOverlay.hide();
    },
  });

  const actionModal = createActionModal(dependencies.actionModalHostElement, {
    onActionSelected(action): void {
      const session = dependencies.runtimeController.getCurrentActionModal();
      if (!session) {
        actionModal.close();
        dependencies.viewportPauseOverlay.hide();
        return;
      }

      if (action === 'chat') {
        actionModal.close();
        const didStartConversation = dependencies.onOpenConversationForActionSession(session);
        if (!didStartConversation) {
          actionModal.open(session.displayName);
          dependencies.viewportPauseOverlay.show();
        }
        return;
      }

      if (action === 'inventory') {
        actionModal.close();
        dependencies.runtimeController.openInventoryOverlay(session);
        dependencies.viewportPauseOverlay.show();
        inventoryOverlay.open(dependencies.world.getState().player.inventory);
      }
    },

    onClose(): void {
      actionModal.close();
      dependencies.runtimeController.closeActionModal();
      dependencies.viewportPauseOverlay.hide();
    },
  });

  return {
    openConversation(
      targetId: string,
      displayName: string,
      conversationHistory: ConversationMessage[],
      interactionKind: 'guard' | 'npc',
    ): void {
      void interactionKind;
      dependencies.runtimeController.openConversation(targetId);
      dependencies.viewportPauseOverlay.show();
      chatModal.open(targetId, displayName, conversationHistory);
    },

    openActionModal(session: RuntimeActionModalSession): void {
      dependencies.runtimeController.openActionModal(session);
      dependencies.viewportPauseOverlay.show();
      actionModal.open(session.displayName);
    },
  };
};
