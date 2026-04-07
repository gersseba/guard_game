// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createRuntimeModalCoordinator } from './modalCoordinator';
import type {
  RuntimeActionModalSession,
  RuntimeController,
  RuntimeConversationSession,
} from '../runtimeController';
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
      onSendConversationMessage: vi.fn(async () => {}),
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
});
