// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createRuntimeModalCoordinator } from './modalCoordinator';
import type {
  RuntimeActionModalSession,
  RuntimeController,
  RuntimeConversationSession,
} from './runtimeController';
import type { WorldState } from '../world/types';

const createWorldState = (): WorldState => ({
  tick: 0,
  grid: { width: 10, height: 10, tileSize: 32 },
  levelMetadata: {
    name: 'Modal Coordinator Test',
    premise: 'Runtime modal seam fixture',
    goal: 'Verify fallback behavior',
  },
  levelObjective: 'Talk to guard',
  player: {
    id: 'player',
    displayName: 'Player',
    position: { x: 1, y: 1 },
    inventory: {
      items: [],
      selectedItem: null,
    },
  },
  guards: [
    {
      id: 'guard-1',
      displayName: 'Guard One',
      position: { x: 2, y: 1 },
      guardState: 'idle',
    },
  ],
  doors: [],
  npcs: [],
  interactiveObjects: [],
  actorConversationHistoryByActorId: {},
  levelOutcome: null,
});

type RuntimeControllerSubset = Pick<
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

const createRuntimeControllerMock = (
  currentActionModal: RuntimeActionModalSession | null,
): RuntimeControllerSubset => {
  let actionModalSession = currentActionModal;
  let conversationSession: RuntimeConversationSession | null = null;

  return {
    closeActionModal: vi.fn(() => {
      actionModalSession = null;
    }),
    closeConversation: vi.fn(() => {
      conversationSession = null;
    }),
    closeInventoryOverlay: vi.fn(() => {
      actionModalSession = null;
    }),
    getCurrentActionModal: vi.fn(() => actionModalSession),
    getCurrentInteraction: vi.fn(() => conversationSession),
    openActionModal: vi.fn((session: RuntimeActionModalSession) => {
      actionModalSession = session;
      conversationSession = null;
    }),
    openConversation: vi.fn((actorId: string) => {
      conversationSession = { actorId };
      actionModalSession = null;
    }),
    openInventoryOverlay: vi.fn((session: RuntimeActionModalSession) => {
      actionModalSession = session;
    }),
  };
};

describe('createRuntimeModalCoordinator', () => {
  it('reopens the action modal when chat target resolution fails', () => {
    document.body.innerHTML = `
      <div id="chat-host"></div>
      <div id="action-host"></div>
      <div id="inventory-host"></div>
    `;

    const session: RuntimeActionModalSession = {
      targetId: 'guard-1',
      targetKind: 'guard',
      displayName: 'Guard One',
    };

    const runtimeController = createRuntimeControllerMock(session);
    const pauseOverlay = {
      show: vi.fn(),
      hide: vi.fn(),
    };

    const coordinator = createRuntimeModalCoordinator({
      runtimeController,
      world: {
        getState: () => createWorldState(),
      },
      viewportPauseOverlay: pauseOverlay,
      chatModalHostElement: document.querySelector<HTMLElement>('#chat-host')!,
      actionModalHostElement: document.querySelector<HTMLElement>('#action-host')!,
      inventoryOverlayHostElement: document.querySelector<HTMLElement>('#inventory-host')!,
      onOpenConversationForActionSession: vi.fn(() => false),
      onSendConversationMessage: vi.fn(async () => ({ endedConversation: false })),
    });

    coordinator.openActionModal(session);

    const chatButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent === 'Chat',
    );
    expect(chatButton).toBeDefined();

    chatButton?.click();

    const overlays = document.querySelectorAll('.action-modal-overlay');
    expect(overlays).toHaveLength(1);
    expect(runtimeController.openActionModal).toHaveBeenCalledTimes(1);
    expect(pauseOverlay.show).toHaveBeenCalledTimes(2);
    expect(pauseOverlay.hide).not.toHaveBeenCalled();
  });

  it('shows request error in status slot and does not append assistant bubble on failure', async () => {
    document.body.innerHTML = `
      <div id="chat-host"></div>
      <div id="action-host"></div>
      <div id="inventory-host"></div>
    `;

    const runtimeController = createRuntimeControllerMock(null);
    const pauseOverlay = {
      show: vi.fn(),
      hide: vi.fn(),
    };

    const onSendConversationMessage = vi.fn(
      async (
        _actorId: string,
        _playerMessage: string,
        _onAssistantMessage: (message: string) => void,
        onLlmError?: (error: { kind: 'llm_request_error'; message: string; statusCode?: number }) => void,
      ) => {
        onLlmError?.({ kind: 'llm_request_error', message: 'LLM request failed.', statusCode: 503 });
        return { endedConversation: false };
      },
    );

    const coordinator = createRuntimeModalCoordinator({
      runtimeController,
      world: {
        getState: () => createWorldState(),
      },
      viewportPauseOverlay: pauseOverlay,
      chatModalHostElement: document.querySelector<HTMLElement>('#chat-host')!,
      actionModalHostElement: document.querySelector<HTMLElement>('#action-host')!,
      inventoryOverlayHostElement: document.querySelector<HTMLElement>('#inventory-host')!,
      onOpenConversationForActionSession: vi.fn(() => true),
      onSendConversationMessage,
    });

    coordinator.openConversation('guard-1', 'Guard One', [], 'guard');

    const input = document.querySelector<HTMLInputElement>('.chat-modal-input');
    const sendButton = document.querySelector<HTMLButtonElement>('.chat-modal-send-btn');
    input!.value = 'State your orders.';
    sendButton?.click();
    await Promise.resolve();

    const status = document.querySelector<HTMLDivElement>('.chat-modal-loading');
    expect(status?.hidden).toBe(false);
    expect(status?.textContent).toBe('Request failed. Please try again.');
    expect(status?.getAttribute('aria-label')).toBe('Error');

    const assistantBubbles = document.querySelectorAll('.chat-bubble-assistant');
    expect(assistantBubbles).toHaveLength(0);
  });

  it('clears error state on next successful send and appends assistant bubble', async () => {
    document.body.innerHTML = `
      <div id="chat-host"></div>
      <div id="action-host"></div>
      <div id="inventory-host"></div>
    `;

    const runtimeController = createRuntimeControllerMock(null);
    const pauseOverlay = {
      show: vi.fn(),
      hide: vi.fn(),
    };

    let callCount = 0;
    const onSendConversationMessage = vi.fn(
      async (
        _actorId: string,
        _playerMessage: string,
        onAssistantMessage: (message: string) => void,
        onLlmError?: (error: { kind: 'llm_request_error'; message: string; statusCode?: number }) => void,
      ) => {
        callCount += 1;
        if (callCount === 1) {
          onLlmError?.({ kind: 'llm_request_error', message: 'Network request failed.' });
          return { endedConversation: false };
        }

        onAssistantMessage('Permission granted.');
        return { endedConversation: false };
      },
    );

    const coordinator = createRuntimeModalCoordinator({
      runtimeController,
      world: {
        getState: () => createWorldState(),
      },
      viewportPauseOverlay: pauseOverlay,
      chatModalHostElement: document.querySelector<HTMLElement>('#chat-host')!,
      actionModalHostElement: document.querySelector<HTMLElement>('#action-host')!,
      inventoryOverlayHostElement: document.querySelector<HTMLElement>('#inventory-host')!,
      onOpenConversationForActionSession: vi.fn(() => true),
      onSendConversationMessage,
    });

    coordinator.openConversation('guard-1', 'Guard One', [], 'guard');

    const input = document.querySelector<HTMLInputElement>('.chat-modal-input');
    const sendButton = document.querySelector<HTMLButtonElement>('.chat-modal-send-btn');

    input!.value = 'First attempt';
    sendButton?.click();
    await Promise.resolve();

    let status = document.querySelector<HTMLDivElement>('.chat-modal-loading');
    expect(status?.hidden).toBe(false);
    expect(status?.textContent).toBe('Request failed. Please try again.');

    input!.value = 'Second attempt';
    sendButton?.click();
    await Promise.resolve();

    status = document.querySelector<HTMLDivElement>('.chat-modal-loading');
    expect(status?.hidden).toBe(true);

    const assistantBubbles = document.querySelectorAll('.chat-bubble-assistant');
    expect(assistantBubbles).toHaveLength(1);
    expect(assistantBubbles[0].textContent).toContain('Permission granted.');
  });

  it('opens inventory from the action modal and selects an item', () => {
    document.body.innerHTML = `
      <div id="chat-host"></div>
      <div id="action-host"></div>
      <div id="inventory-host"></div>
    `;

    const session: RuntimeActionModalSession = {
      targetId: 'guard-1',
      targetKind: 'guard',
      displayName: 'Guard One',
    };

    const runtimeController = createRuntimeControllerMock(session);
    const pauseOverlay = {
      show: vi.fn(),
      hide: vi.fn(),
    };

    let worldState = {
      ...createWorldState(),
      player: {
        ...createWorldState().player,
        inventory: {
          items: [
            { itemId: 'key-1', displayName: 'Bronze Key', sourceObjectId: 'crate-1', pickedUpAtTick: 1 },
          ],
          selectedItem: null,
        },
      },
    };

    const coordinator = createRuntimeModalCoordinator({
      runtimeController,
      world: {
        getState: () => worldState,
        resetToState: (nextState) => {
          worldState = nextState;
        },
      },
      viewportPauseOverlay: pauseOverlay,
      chatModalHostElement: document.querySelector<HTMLElement>('#chat-host')!,
      actionModalHostElement: document.querySelector<HTMLElement>('#action-host')!,
      inventoryOverlayHostElement: document.querySelector<HTMLElement>('#inventory-host')!,
      onOpenConversationForActionSession: vi.fn(() => true),
      onSendConversationMessage: vi.fn(async () => ({ endedConversation: false })),
    });

    coordinator.openActionModal(session);

    const inventoryButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent === 'Inventory',
    );
    inventoryButton?.click();

    const inventoryTile = document.querySelector<HTMLElement>('.inventory-tile');
    inventoryTile?.click();

    expect(worldState.player.inventory.selectedItem).toEqual({
      slotIndex: 0,
      itemId: 'key-1',
    });
    expect(runtimeController.openInventoryOverlay).toHaveBeenCalledWith(session);
    expect(runtimeController.closeInventoryOverlay).toHaveBeenCalledTimes(1);
    expect(pauseOverlay.hide).toHaveBeenCalledTimes(1);
  });

  it('closes the chat modal cleanly when the conversation send reports endedChat', async () => {
    document.body.innerHTML = `
      <div id="chat-host"></div>
      <div id="action-host"></div>
      <div id="inventory-host"></div>
    `;

    const runtimeController = createRuntimeControllerMock(null);
    const pauseOverlay = {
      show: vi.fn(),
      hide: vi.fn(),
    };

    const coordinator = createRuntimeModalCoordinator({
      runtimeController,
      world: {
        getState: () => createWorldState(),
      },
      viewportPauseOverlay: pauseOverlay,
      chatModalHostElement: document.querySelector<HTMLElement>('#chat-host')!,
      actionModalHostElement: document.querySelector<HTMLElement>('#action-host')!,
      inventoryOverlayHostElement: document.querySelector<HTMLElement>('#inventory-host')!,
      onOpenConversationForActionSession: vi.fn(() => true),
      onSendConversationMessage: vi.fn(async (_actorId, _playerMessage, onAssistantMessage) => {
        onAssistantMessage('We are done here.');
        return { endedConversation: true };
      }),
    });

    coordinator.openConversation('guard-1', 'Guard One', [], 'guard');

    const input = document.querySelector<HTMLInputElement>('.chat-modal-input');
    const sendButton = document.querySelector<HTMLButtonElement>('.chat-modal-send-btn');
    input!.value = 'Understood.';
    sendButton?.click();
    await Promise.resolve();

    const overlay = document.querySelector<HTMLElement>('.chat-modal-overlay');
    expect(overlay?.hidden).toBe(true);
    expect(runtimeController.closeConversation).toHaveBeenCalledTimes(1);
    expect(pauseOverlay.hide).toHaveBeenCalledTimes(1);
  });
});
