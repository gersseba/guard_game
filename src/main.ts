import './style.css';
import { createCommandBuffer } from './input/commands';
import { bindKeyboardCommands } from './input/keyboard';
import { resolveAdjacentTarget } from './interaction/adjacencyResolver';
import { handleDoorInteraction } from './interaction/doorInteraction';
import { handleGuardInteraction } from './interaction/guardInteraction';
import { createNpcInteractionService } from './interaction/npcInteraction';
import { createGeminiLlmClient } from './llm/client';
import { createPixiRenderPort } from './render/scene';
import { createLevelUi } from './render/levelUi';
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
const interactionLogElement = document.querySelector<HTMLElement>('#interaction-log');

if (!viewportElement || !levelControlsElement || !worldStateElement || !interactionLogElement) {
  throw new Error('Expected runtime shell elements to exist.');
}

const world = createWorld();
const commandBuffer = createCommandBuffer();
const llmClient = createGeminiLlmClient();
const npcInteractionService = createNpcInteractionService(llmClient);
bindKeyboardCommands(window, commandBuffer);

const LEVELS_BASE_URL = '/levels';
const MANIFEST_URL = `${LEVELS_BASE_URL}/manifest.json`;
const DEFAULT_NPC_PLAYER_MESSAGE = 'Can you help me?';

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
    const result = handleGuardInteraction({ guard: adjacentTarget.target, player: worldState.player });
    interactionLogElement.textContent = result.responseText;
    return;
  }

  if (adjacentTarget.kind === 'door') {
    const result = handleDoorInteraction({ door: adjacentTarget.target, player: worldState.player });
    interactionLogElement.textContent = result.responseText;
    return;
  }

  // adjacentTarget.kind === 'npc'
  const interactionResult = await npcInteractionService.handleNpcInteraction({
    npc: adjacentTarget.target,
    player: worldState.player,
    worldState,
    playerMessage: DEFAULT_NPC_PLAYER_MESSAGE,
  });
  world.resetToState(interactionResult.updatedWorldState);
  interactionLogElement.textContent = interactionResult.responseText;
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
