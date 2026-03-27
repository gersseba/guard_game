import './style.css';
import { createCommandBuffer } from './input/commands';
import { bindKeyboardCommands } from './input/keyboard';
import { resolveAdjacentTarget } from './interaction/adjacencyResolver';
import { createInteractionDispatcher, createResultDispatcher } from './interaction/interactionDispatcher';
import { getNpcConversationHistory } from './interaction/npcThread';
import { createGeminiLlmClient } from './llm/client';
import { createPixiRenderPort } from './render/scene';
import { createLevelUi } from './render/levelUi';
import { createChatModal } from './render/chatModal';
import { createOutcomeOverlay } from './render/outcomeOverlay';
import { getRuntimeLayoutMarkup } from './render/runtimeLayout';
import type { WorldCommand, WorldState, ConversationMessage } from './world/types';
import { createWorld } from './world/world';
import { fetchAndLoadLevel, fetchLevelManifest } from './world/levelLoader';

const appElement = document.querySelector<HTMLDivElement>('#app');

if (!appElement) {
  throw new Error('Expected #app root element.');
}

appElement.innerHTML = getRuntimeLayoutMarkup();

const viewportElement = document.querySelector<HTMLElement>('#viewport');
const levelControlsElement = document.querySelector<HTMLElement>('#level-controls');
const worldStateElement = document.querySelector<HTMLElement>('#world-state');
const chatModalHostElement = document.querySelector<HTMLElement>('#chat-modal-host');
const outcomeOverlayHostElement = document.querySelector<HTMLElement>('#outcome-overlay-host');

if (!viewportElement || !levelControlsElement || !worldStateElement || !chatModalHostElement || !outcomeOverlayHostElement) {
  throw new Error('Expected runtime shell elements to exist.');
}

const world = createWorld();
const commandBuffer = createCommandBuffer();
const llmClient = createGeminiLlmClient();
const interactionDispatcher = createInteractionDispatcher({ llmClient });
const outcomeOverlay = createOutcomeOverlay(outcomeOverlayHostElement);

/** Tracks the current interaction in progress (for chat modal message handling). */
interface CurrentInteraction {
  kind: 'npc' | 'guard';
  actorId: string;
}

let currentInteraction: CurrentInteraction | null = null;

/**
 * Chat modal instance with callbacks wired to game logic.
 */
const chatModal = createChatModal(chatModalHostElement, {
  onSend(playerMessage: string): void {
    if (!currentInteraction) {
      return; // Safety check.
    }

    const interaction = currentInteraction; // Capture for async closure.
    const currentWorldState = world.getState();
    chatModal.setLoading(true);
    chatModal.appendMessage('player', playerMessage);

    void (async () => {
      // Find the target based on stored interaction kind and actorId.
      let target = null;
      if (interaction.kind === 'npc') {
        const npc = currentWorldState.npcs.find((n) => n.id === interaction.actorId);
        if (!npc) {
          chatModal.setLoading(false);
          return;
        }
        target = { kind: 'npc' as const, target: npc };
      } else if (interaction.kind === 'guard') {
        const guard = currentWorldState.guards.find((g) => g.id === interaction.actorId);
        if (!guard) {
          chatModal.setLoading(false);
          return;
        }
        target = { kind: 'guard' as const, target: guard };
      }

      if (!target) {
        chatModal.setLoading(false);
        return;
      }

      const result = await interactionDispatcher.dispatch(target, currentWorldState, playerMessage);

      // Extract the AI response from the updated history.
      const history = getNpcConversationHistory(
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
    currentInteraction = null;
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
    interactionKind: 'guard' | 'npc',
  ) => {
    currentInteraction = {
      kind: interactionKind,
      actorId: targetId,
    };
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
    getNpcConversationHistory(worldState, targetId),
});

const LEVELS_BASE_URL = '/levels';
const MANIFEST_URL = `${LEVELS_BASE_URL}/manifest.json`;

/** Tracks which level id is currently active so reset can reload the same level. */
let activeLevelId: string | null = null;

const runInteractionIfRequested = async (
  worldState: WorldState,
  commands: WorldCommand[],
): Promise<void> => {
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
  const result = await interactionDispatcher.dispatch(adjacentTarget, worldState);

  // Route result to appropriate handler via result dispatcher
  resultDispatcher.dispatch(result);
};

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
      levelUi.populateLevels(levels);
      if (levels.length > 0) {
        const first = levels[0];
        activeLevelId = first.id;
        levelUi.setSelectedLevel(first.id);
        return fetchAndLoadLevel(`${LEVELS_BASE_URL}/${first.id}.json`).then((newState) => {
          world.resetToState(newState);
        });
      }
    })
    .catch((err: unknown) => {
      console.error('Failed to load level manifest:', err);
    });

  const runFrame = (currentTime: number): void => {
    accumulatedTime += currentTime - previousFrameTime;
    previousFrameTime = currentTime;

    while (accumulatedTime >= fixedTickDurationMs) {
      const worldStateBeforeCommands = world.getState();
      let commandsToApply = commandBuffer.drain();

      // Block all commands if level outcome is already set
      if (worldStateBeforeCommands.levelOutcome) {
        commandsToApply = [];
      }

      world.applyCommands(commandsToApply);
      const worldState = world.getState();
      void runInteractionIfRequested(worldState, commandsToApply);
      accumulatedTime -= fixedTickDurationMs;
    }

    const currentWorldState = world.getState();
    renderPort.render(currentWorldState);
    worldStateElement.textContent = JSON.stringify(currentWorldState, null, 2);

    if (currentWorldState.levelOutcome && !levelOutcomeShown) {
      levelOutcomeShown = true;
      outcomeOverlay.show(currentWorldState.levelOutcome);
    }

    requestAnimationFrame(runFrame);
  };

  const initialWorldState = world.getState();
  renderPort.render(initialWorldState);
  worldStateElement.textContent = JSON.stringify(initialWorldState, null, 2);
  requestAnimationFrame(runFrame);
};

void startRuntime();
