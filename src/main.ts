import './style.css';
import { createCommandBuffer } from './input/commands';
import { bindKeyboardCommands } from './input/keyboard';
import { resolveAdjacentTarget } from './interaction/adjacencyResolver';
import {
  createInteractionDispatcher,
  createResultDispatcher,
  isPromiseLike,
} from './interaction/interactionDispatcher';
import { getActorConversationHistory } from './interaction/actorConversationThread';
import { createDefaultItemUseResolver } from './interaction/itemUse';
import { createGeminiLlmClient } from './llm/client';
import { createPixiRenderPort } from './render/scene';
import { createLevelUi } from './render/levelUi';
import { createLevelBriefingPanel } from './render/levelBriefing';
import { createChatModal } from './render/chatModal';
import { createOutcomeOverlay } from './render/outcomeOverlay';
import { createViewportOverlay } from './render/viewportOverlay';
import { getRuntimeLayoutMarkup } from './render/runtimeLayout';
import { createRuntimeController } from './runtimeController';
import type { WorldCommand, WorldState, ConversationMessage } from './world/types';
import { createWorld } from './world/world';
import { fetchAndLoadLevel, fetchLevelManifest } from './world/levelLoader';

const appElement = document.querySelector<HTMLDivElement>('#app');

if (!appElement) {
  throw new Error('Expected #app root element.');
}

appElement.innerHTML = getRuntimeLayoutMarkup();

const viewportElement = document.querySelector<HTMLElement>('#viewport');
const levelBriefingElement = document.querySelector<HTMLElement>('#level-briefing');
const levelControlsElement = document.querySelector<HTMLElement>('#level-controls');
const worldStateElement = document.querySelector<HTMLElement>('#world-state');
const chatModalHostElement = document.querySelector<HTMLElement>('#chat-modal-host');
const outcomeOverlayHostElement = document.querySelector<HTMLElement>('#outcome-overlay-host');

if (
  !viewportElement ||
  !levelBriefingElement ||
  !levelControlsElement ||
  !worldStateElement ||
  !chatModalHostElement ||
  !outcomeOverlayHostElement
) {
  throw new Error('Expected runtime shell elements to exist.');
}

const world = createWorld();
const commandBuffer = createCommandBuffer();
const llmClient = createGeminiLlmClient();
const interactionDispatcher = createInteractionDispatcher({ llmClient });
const itemUseResolver = createDefaultItemUseResolver();
const outcomeOverlay = createOutcomeOverlay(outcomeOverlayHostElement);
const viewportPauseOverlay = createViewportOverlay(viewportElement);
const levelBriefingPanel = createLevelBriefingPanel(levelBriefingElement);

/**
 * Chat modal instance with callbacks wired to game logic.
 */
const chatModal = createChatModal(chatModalHostElement, {
  onSend(playerMessage: string): void {
    const currentInteraction = runtimeController.getCurrentInteraction();
    if (!currentInteraction) {
      chatModal.close();
      viewportPauseOverlay.hide();
      return; // Safety check.
    }

    const interaction = currentInteraction; // Capture for async closure.
    const currentWorldState = world.getState();
    chatModal.setLoading(true);
    chatModal.appendMessage('player', playerMessage);

    void (async () => {
      const target = interactionDispatcher.resolveConversationalTarget(
        currentWorldState,
        interaction.actorId,
      );
      if (!target) {
        chatModal.setLoading(false);
        return;
      }

      const result = await interactionDispatcher.dispatch(target, currentWorldState, playerMessage);

      // Extract the AI response from the updated history.
      const history = getActorConversationHistory(
        result.updatedWorldState ?? currentWorldState,
        interaction.actorId,
      );
      const lastMessage = history[history.length - 1];
      if (lastMessage?.role === 'assistant') {
        chatModal.appendMessage('assistant', lastMessage.text);
      }

      // Update world state with the new interaction history if updated.
      if (result.updatedWorldState) {
        world.resetToState(result.updatedWorldState);
      }

      chatModal.setLoading(false);
    })();
  },

  onClose(): void {
    runtimeController.closeConversation();
    viewportPauseOverlay.hide();
  },
});

bindKeyboardCommands(window, commandBuffer, {
  isModalOpen: () => chatModal.isOpen(),
});

// Create result dispatcher with config that bridges interaction results to main loop state
const resultDispatcher = createResultDispatcher({
  onConversationStarted: (
    targetId: string,
    displayName: string,
    conversationHistory: ConversationMessage[],
  ) => {
    runtimeController.openConversation(targetId);
    viewportPauseOverlay.show();
    chatModal.open(targetId, displayName, conversationHistory);
  },
  onLevelOutcomeChanged: (levelOutcome: 'win' | 'lose') => {
    const currentWorldState = world.getState();
    const updatedState = { ...currentWorldState, levelOutcome };
    world.resetToState(updatedState);
  },
  onWorldStateUpdated: (worldState: WorldState) => {
    world.resetToState(worldState);
  },
  getCurrentWorldState: () => world.getState(),
  getConversationHistory: (worldState: WorldState, targetId: string) =>
    getActorConversationHistory(worldState, targetId),
});

const LEVELS_BASE_URL = '/levels';
const MANIFEST_URL = `${LEVELS_BASE_URL}/manifest.json`;
const DEFAULT_LEVEL_ID = 'riddle';

/** Tracks which level id is currently active so reset can reload the same level. */
let activeLevelId: string | null = null;

const runInteractionIfRequested = (
  worldState: WorldState,
  commands: WorldCommand[],
): void => {
  // Block all interactions if level outcome is already set
  if (worldState.levelOutcome) {
    return;
  }

  const includesInteract = commands.some((command) => command.type === 'interact');
  if (!includesInteract) {
    return;
  }

  const adjacentTarget = resolveAdjacentTarget(worldState);
  if (!adjacentTarget) {
    // No adjacent target — silent no-op.
    return;
  }

  // Dispatch interaction via unified dispatcher
  const dispatchResult = interactionDispatcher.dispatch(adjacentTarget, worldState);
  if (isPromiseLike(dispatchResult)) {
    void dispatchResult.then((resolvedResult) => {
      resultDispatcher.dispatch(resolvedResult);
    });
    return;
  }

  resultDispatcher.dispatch(dispatchResult);
};

const runtimeController = createRuntimeController({
  world,
  commandBuffer,
  runInteractions: runInteractionIfRequested,
  itemUseResolver,
  onItemUseAttemptResolved: (event) => {
    const currentState = world.getState();
    let updatedState = {
      ...currentState,
      lastItemUseAttemptEvent: event,
    };

    // If a door was unlocked, apply the unlock mutation
    if (event.doorUnlockedId) {
      updatedState = {
        ...updatedState,
        doors: updatedState.doors.map((door) =>
          door.id === event.doorUnlockedId ? { ...door, isUnlocked: true } : door,
        ),
      };
    }

    // If a guard was affected by item-use success, mark it
    if (event.affectedEntityType === 'guard' && event.affectedEntityId) {
      updatedState = {
        ...updatedState,
        guards: updatedState.guards.map((guard) =>
          guard.id === event.affectedEntityId ? { ...guard, guardState: 'alert' as const } : guard,
        ),
      };
    }

    // If an object was affected by item-use success, mark it as used
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

const fixedTickDurationMs = 100;
let previousFrameTime = performance.now();
let accumulatedTime = 0;
let levelOutcomeShown = false;

const startRuntime = async (): Promise<void> => {
  const renderPort = await createPixiRenderPort({
    viewport: viewportElement,
  });

  // Wire level UI controls (DOM only — no game logic inside levelUi).
  const levelUi = createLevelUi(levelControlsElement, {
    onLevelSelect: (levelId: string) => {
      activeLevelId = levelId;
      const levelUrl = `${LEVELS_BASE_URL}/${levelId}.json`;
      fetchAndLoadLevel(levelUrl)
        .then((newState) => {
          world.resetToState(newState);
          levelUi.setSelectedLevel(levelId);
          levelUi.setLevelObjective(newState.levelObjective ?? newState.levelMetadata.goal);
          outcomeOverlay.hide();
          levelOutcomeShown = false;
        })
        .catch((err: unknown) => {
          console.error('Failed to load level:', err);
        });
    },
    onReset: () => {
      if (!activeLevelId) return;
      const levelUrl = `${LEVELS_BASE_URL}/${activeLevelId}.json`;
      fetchAndLoadLevel(levelUrl)
        .then((newState) => {
          world.resetToState(newState);
          levelUi.setLevelObjective(newState.levelObjective ?? newState.levelMetadata.goal);
          outcomeOverlay.hide();
          levelOutcomeShown = false;
        })
        .catch((err: unknown) => {
          console.error('Failed to reset level:', err);
        });
    },
  });

  // Load manifest and populate the level selector. Fail gracefully when absent.
  fetchLevelManifest(MANIFEST_URL)
    .then((levels) => {
      const defaultLevel =
        levels.find((level) => level.id === DEFAULT_LEVEL_ID) ?? levels[0];

      if (defaultLevel) {
        const orderedLevels = [
          defaultLevel,
          ...levels.filter((level) => level.id !== defaultLevel.id),
        ];
        levelUi.populateLevels(orderedLevels);
        activeLevelId = defaultLevel.id;
        levelUi.setSelectedLevel(defaultLevel.id);
        return fetchAndLoadLevel(`${LEVELS_BASE_URL}/${defaultLevel.id}.json`).then((newState) => {
          world.resetToState(newState);
          levelUi.setLevelObjective(newState.levelObjective ?? newState.levelMetadata.goal);
        });
      }

      levelUi.populateLevels(levels);
    })
    .catch((err: unknown) => {
      console.error('Failed to load level manifest:', err);
    });

  const runFrame = (currentTime: number): void => {
    accumulatedTime += currentTime - previousFrameTime;
    previousFrameTime = currentTime;

    while (accumulatedTime >= fixedTickDurationMs) {
      runtimeController.stepSimulation();
      accumulatedTime -= fixedTickDurationMs;
    }

    const currentWorldState = world.getState();
    renderPort.render(currentWorldState);
    levelBriefingPanel.render(currentWorldState.levelMetadata);
    worldStateElement.textContent = JSON.stringify(currentWorldState, null, 2);

    if (currentWorldState.levelOutcome && !levelOutcomeShown) {
      levelOutcomeShown = true;
      outcomeOverlay.show(currentWorldState.levelOutcome);
    }

    requestAnimationFrame(runFrame);
  };

  const initialWorldState = world.getState();
  renderPort.render(initialWorldState);
  levelBriefingPanel.render(initialWorldState.levelMetadata);
  worldStateElement.textContent = JSON.stringify(initialWorldState, null, 2);
  requestAnimationFrame(runFrame);
};

void startRuntime();
