import './style.css';
import { createCommandBuffer } from './input/commands';
import { bindKeyboardCommands } from './input/keyboard';
import { resolveAdjacentTarget } from './interaction/adjacencyResolver';
import { createGuardInteractionService } from './interaction/guardInteraction';
import { createNpcInteractionService } from './interaction/npcInteraction';
import { getNpcConversationHistory } from './interaction/npcThread';
import { createGeminiLlmClient } from './llm/client';
import { createPixiRenderPort } from './render/scene';
import { createLevelUi } from './render/levelUi';
import { createChatModal } from './render/chatModal';
import { getRuntimeLayoutMarkup } from './render/runtimeLayout';
import type { WorldCommand, WorldState } from './world/types';
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

if (!viewportElement || !levelControlsElement || !worldStateElement || !chatModalHostElement) {
  throw new Error('Expected runtime shell elements to exist.');
}

const world = createWorld();
const commandBuffer = createCommandBuffer();
const llmClient = createGeminiLlmClient();
const guardInteractionService = createGuardInteractionService(llmClient);
const npcInteractionService = createNpcInteractionService(llmClient);

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

    if (interaction.kind === 'npc') {
      const npc = currentWorldState.npcs.find((n) => n.id === interaction.actorId);
      if (!npc) {
        chatModal.setLoading(false);
        return;
      }

      void (async () => {
        const result = await npcInteractionService.handleNpcInteraction({
          npc,
          player: currentWorldState.player,
          worldState: currentWorldState,
          playerMessage,
        });

        // Extract the AI response text from the updated history.
        const history = getNpcConversationHistory(result.updatedWorldState, interaction.actorId);
        const lastMessage = history[history.length - 1];
        if (lastMessage?.role === 'assistant') {
          chatModal.appendMessage('assistant', lastMessage.text);
        }

        // Update world state with the new interaction history.
        world.resetToState(result.updatedWorldState);
        chatModal.setLoading(false);
      })();
    } else if (interaction.kind === 'guard') {
      const guard = currentWorldState.guards.find((g) => g.id === interaction.actorId);
      if (!guard) {
        chatModal.setLoading(false);
        return;
      }

      void (async () => {
        const result = await guardInteractionService.handleGuardInteraction({
          guard,
          player: currentWorldState.player,
          worldState: currentWorldState,
          playerMessage,
        });

        // Extract the AI response from the updated history.
        const history =
          result.updatedWorldState.npcConversationHistoryByNpcId[interaction.actorId] ?? [];
        const lastMessage = history[history.length - 1];
        if (lastMessage?.role === 'assistant') {
          chatModal.appendMessage('assistant', lastMessage.text);
        }

        // Update world state with the new interaction history.
        world.resetToState(result.updatedWorldState);
        chatModal.setLoading(false);
      })();
    }
  },

  onClose(): void {
    currentInteraction = null;
  },
});

bindKeyboardCommands(window, commandBuffer, {
  isModalOpen: () => chatModal.isOpen(),
});

const LEVELS_BASE_URL = '/levels';
const MANIFEST_URL = `${LEVELS_BASE_URL}/manifest.json`;

/** Tracks which level id is currently active so reset can reload the same level. */
let activeLevelId: string | null = null;

const runInteractionIfRequested = async (
  worldState: WorldState,
  commands: WorldCommand[],
): Promise<void> => {
  const includesInteract = commands.some((command) => command.type === 'interact');
  if (!includesInteract) {
    return;
  }

  const adjacentTarget = resolveAdjacentTarget(worldState);
  if (!adjacentTarget) {
    // No adjacent target — silent no-op.
    return;
  }

  if (adjacentTarget.kind === 'guard') {
    currentInteraction = {
      kind: 'guard',
      actorId: adjacentTarget.target.id,
    };
    const history = worldState.npcConversationHistoryByNpcId[adjacentTarget.target.id] ?? [];
    chatModal.open(adjacentTarget.target.id, adjacentTarget.target.displayName, history);
    return;
  }

  if (adjacentTarget.kind === 'door') {
    // Door interactions are currently not displayed in the chat modal.
    // Silently ignore them or could add a separate notification system.
    return;
  }

  // adjacentTarget.kind === 'npc'
  currentInteraction = {
    kind: 'npc',
    actorId: adjacentTarget.target.id,
  };
  const history = getNpcConversationHistory(worldState, adjacentTarget.target.id);
  chatModal.open(adjacentTarget.target.id, adjacentTarget.target.displayName, history);
};

const fixedTickDurationMs = 100;
let previousFrameTime = performance.now();
let accumulatedTime = 0;

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
      const commands = commandBuffer.drain();
      world.applyCommands(commands);
      const worldState = world.getState();
      void runInteractionIfRequested(worldState, commands);
      accumulatedTime -= fixedTickDurationMs;
    }

    const currentWorldState = world.getState();
    renderPort.render(currentWorldState);
    worldStateElement.textContent = JSON.stringify(currentWorldState, null, 2);
    requestAnimationFrame(runFrame);
  };

  const initialWorldState = world.getState();
  renderPort.render(initialWorldState);
  worldStateElement.textContent = JSON.stringify(initialWorldState, null, 2);
  requestAnimationFrame(runFrame);
};

void startRuntime();
