import { createCommandBuffer } from '../input/commands';
import { bindKeyboardCommands } from '../input/keyboard';
import { createGeminiLlmClient } from '../llm/client';
import { createInventoryPanel } from '../render/inventoryPanel';
import { createLevelBriefingPanel } from '../render/levelBriefing';
import { createOutcomeOverlay } from '../render/outcomeOverlay';
import { createLevelUi } from '../render/levelUi';
import { createPixiRenderPort } from '../render/scene';
import { getRuntimeLayoutMarkup } from '../render/runtimeLayout';
import { createViewportOverlay } from '../render/viewportOverlay';
import {
  createRuntimeController,
  type RuntimeActionModalSession,
  type RuntimeController,
} from './runtimeController';
import { createDefaultItemUseResolver } from '../interaction/itemUse';
import { createInteractionDispatcher } from '../interaction/interactionDispatcher';
import { createWorld } from '../world/world';
import type { ConversationMessage } from '../world/types';
import { createFixedTickLoop } from './fixedTickLoop';
import { createLevelLoadOrchestration } from './levelLoadOrchestration';
import { createRuntimeInteractionResultBridge } from './interactionResultBridge';
import { createRuntimeModalCoordinator } from './modalCoordinator';

interface RuntimeShellElements {
  viewportElement: HTMLElement;
  levelBriefingElement: HTMLElement;
  inventoryPanelElement: HTMLElement;
  levelControlsElement: HTMLElement;
  worldStateElement: HTMLElement;
  chatModalHostElement: HTMLElement;
  actionModalHostElement: HTMLElement;
  inventoryOverlayHostElement: HTMLElement;
  outcomeOverlayHostElement: HTMLElement;
}

export interface RuntimeApp {
  start(): Promise<void>;
}

const queryRequiredShellElement = (selector: string): HTMLElement => {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error('Expected runtime shell elements to exist.');
  }

  return element;
};

const getRuntimeShellElements = (): RuntimeShellElements => {
  return {
    viewportElement: queryRequiredShellElement('#viewport'),
    levelBriefingElement: queryRequiredShellElement('#level-briefing'),
    inventoryPanelElement: queryRequiredShellElement('#inventory-panel'),
    levelControlsElement: queryRequiredShellElement('#level-controls'),
    worldStateElement: queryRequiredShellElement('#world-state'),
    chatModalHostElement: queryRequiredShellElement('#chat-modal-host'),
    actionModalHostElement: queryRequiredShellElement('#action-modal-host'),
    inventoryOverlayHostElement: queryRequiredShellElement('#inventory-overlay-host'),
    outcomeOverlayHostElement: queryRequiredShellElement('#outcome-overlay-host'),
  };
};

const LEVELS_BASE_URL = '/levels';
const MANIFEST_URL = `${LEVELS_BASE_URL}/manifest.json`;
const DEFAULT_LEVEL_ID = 'riddle';

export const createRuntimeApp = (appElement: HTMLDivElement): RuntimeApp => {
  appElement.innerHTML = getRuntimeLayoutMarkup();
  const shellElements = getRuntimeShellElements();

  const world = createWorld();
  const commandBuffer = createCommandBuffer();
  const llmClient = createGeminiLlmClient();
  const interactionDispatcher = createInteractionDispatcher({ llmClient });
  const itemUseResolver = createDefaultItemUseResolver();
  const outcomeOverlay = createOutcomeOverlay(shellElements.outcomeOverlayHostElement);
  const viewportPauseOverlay = createViewportOverlay(shellElements.viewportElement);
  const levelBriefingPanel = createLevelBriefingPanel(shellElements.levelBriefingElement);
  const inventoryPanel = createInventoryPanel(shellElements.inventoryPanelElement);

  let levelOutcomeShown = false;

  let runtimeController: RuntimeController;
  let actionModalSessionHandler: ((session: RuntimeActionModalSession) => void) | null = null;
  let conversationStartHandler:
    | ((
        targetId: string,
        displayName: string,
        conversationHistory: ConversationMessage[],
        interactionKind: 'guard' | 'npc',
      ) => void)
    | null = null;

  const interactionBridge = createRuntimeInteractionResultBridge({
    world,
    interactionDispatcher,
    onActionModalStarted: (session: RuntimeActionModalSession) => {
      actionModalSessionHandler?.(session);
    },
    onConversationStarted: (targetId, displayName, conversationHistory, interactionKind) => {
      conversationStartHandler?.(targetId, displayName, conversationHistory, interactionKind);
    },
  });

  runtimeController = createRuntimeController({
    world,
    commandBuffer,
    runInteractions: interactionBridge.runInteractionIfRequested,
    itemUseResolver,
    onItemUseAttemptResolved: (event) => {
      const currentState = world.getState();
      let updatedState = {
        ...currentState,
        lastItemUseAttemptEvent: event,
      };

      if (event.doorUnlockedId) {
        updatedState = {
          ...updatedState,
          doors: updatedState.doors.map((door) =>
            door.id === event.doorUnlockedId ? { ...door, isUnlocked: true } : door,
          ),
        };
      }

      if (event.affectedEntityType === 'guard' && event.affectedEntityId) {
        updatedState = {
          ...updatedState,
          guards: updatedState.guards.map((guard) =>
            guard.id === event.affectedEntityId ? { ...guard, guardState: 'alert' as const } : guard,
          ),
        };
      }

      if (event.affectedEntityType === 'object' && event.affectedEntityId) {
        updatedState = {
          ...updatedState,
          interactiveObjects: updatedState.interactiveObjects.map((obj) =>
            obj.id === event.affectedEntityId ? { ...obj, state: 'used' as const } : obj,
          ),
        };
      }

      world.resetToState(updatedState);
    },
  });

  const modalCoordinator = createRuntimeModalCoordinator({
    runtimeController,
    world,
    viewportPauseOverlay,
    chatModalHostElement: shellElements.chatModalHostElement,
    actionModalHostElement: shellElements.actionModalHostElement,
    inventoryOverlayHostElement: shellElements.inventoryOverlayHostElement,
    onOpenConversationForActionSession: interactionBridge.openConversationForActionSession,
    onSendConversationMessage: interactionBridge.sendConversationMessage,
  });

  actionModalSessionHandler = modalCoordinator.openActionModal;
  conversationStartHandler = modalCoordinator.openConversation;

  bindKeyboardCommands(window, commandBuffer, {
    isModalOpen: () => runtimeController.isPaused(),
  });

  const levelLoadOrchestration = createLevelLoadOrchestration({
    levelControlsElement: shellElements.levelControlsElement,
    world,
    outcomeOverlay,
    onLevelLoaded: () => {
      levelOutcomeShown = false;
    },
    levelsBaseUrl: LEVELS_BASE_URL,
    manifestUrl: MANIFEST_URL,
    defaultLevelId: DEFAULT_LEVEL_ID,
    createLevelUiFn: createLevelUi,
  });

  return {
    async start(): Promise<void> {
      const renderPort = await createPixiRenderPort({
        viewport: shellElements.viewportElement,
      });

      const renderFrame = (): void => {
        const currentWorldState = world.getState();
        renderPort.render(currentWorldState);
        levelBriefingPanel.render(currentWorldState.levelMetadata);
        inventoryPanel.render(currentWorldState.player.inventory);
        shellElements.worldStateElement.textContent = JSON.stringify(currentWorldState, null, 2);

        if (currentWorldState.levelOutcome && !levelOutcomeShown) {
          levelOutcomeShown = true;
          outcomeOverlay.show(currentWorldState.levelOutcome);
        }
      };

      renderFrame();
      levelLoadOrchestration.initialize();

      const fixedTickLoop = createFixedTickLoop({
        fixedTickDurationMs: 100,
        stepSimulation: () => runtimeController.stepSimulation(),
        renderFrame,
      });

      fixedTickLoop.start();
    },
  };
};
