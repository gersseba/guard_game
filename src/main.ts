import './style.css';
import { createCommandBuffer } from './input/commands';
import { createNpcInteractionService } from './interaction/npcInteraction';
import { createStubLlmClient } from './llm/client';
import { createPixiRenderPort } from './render/scene';
import type { WorldCommand, WorldState } from './world/types';
import { createWorld } from './world/world';

const appElement = document.querySelector<HTMLDivElement>('#app');

if (!appElement) {
  throw new Error('Expected #app root element.');
}

appElement.innerHTML = `
  <div class="guard-game-shell">
    <header class="guard-game-header">
      <h1>Guard Game</h1>
      <p>Deterministic runtime bootstrap</p>
    </header>
    <main class="guard-game-main">
      <section class="guard-game-panel">
        <h2>Viewport</h2>
        <div id="viewport" class="guard-game-viewport"></div>
      </section>
      <section class="guard-game-panel">
        <h2>World State</h2>
        <pre id="world-state" class="guard-game-world-state"></pre>
      </section>
      <section class="guard-game-panel">
        <h2>Interaction</h2>
        <p id="interaction-log" class="guard-game-interaction-log">No interaction yet.</p>
      </section>
    </main>
  </div>
`;

const viewportElement = document.querySelector<HTMLElement>('#viewport');
const worldStateElement = document.querySelector<HTMLElement>('#world-state');
const interactionLogElement = document.querySelector<HTMLElement>('#interaction-log');

if (!viewportElement || !worldStateElement || !interactionLogElement) {
  throw new Error('Expected runtime shell elements to exist.');
}

const world = createWorld();
const commandBuffer = createCommandBuffer();
const llmClient = createStubLlmClient();
const npcInteractionService = createNpcInteractionService(llmClient);

const keyToCommandMap: Record<string, WorldCommand> = {
  ArrowUp: { type: 'move', dx: 0, dy: -1 },
  ArrowDown: { type: 'move', dx: 0, dy: 1 },
  ArrowLeft: { type: 'move', dx: -1, dy: 0 },
  ArrowRight: { type: 'move', dx: 1, dy: 0 },
  w: { type: 'move', dx: 0, dy: -1 },
  a: { type: 'move', dx: -1, dy: 0 },
  s: { type: 'move', dx: 0, dy: 1 },
  d: { type: 'move', dx: 1, dy: 0 },
  e: { type: 'interact' },
};

window.addEventListener('keydown', (event: KeyboardEvent) => {
  const command = keyToCommandMap[event.key];
  if (!command) {
    return;
  }

  event.preventDefault();
  commandBuffer.enqueue(command);
});

const runInteractionIfRequested = async (
  worldState: WorldState,
  commands: WorldCommand[],
): Promise<void> => {
  const includesInteract = commands.some((command) => command.type === 'interact');
  if (!includesInteract) {
    return;
  }

  const nearbyNpc = worldState.npcs.find((npc) => {
    const deltaX = Math.abs(npc.position.x - worldState.player.position.x);
    const deltaY = Math.abs(npc.position.y - worldState.player.position.y);
    return deltaX + deltaY <= 1;
  });

  if (!nearbyNpc) {
    interactionLogElement.textContent = 'No NPC nearby to interact with.';
    return;
  }

  const interactionResult = await npcInteractionService.handleNpcInteraction({
    npc: nearbyNpc,
    player: worldState.player,
  });

  interactionLogElement.textContent = interactionResult.responseText;
};

const fixedTickDurationMs = 100;
let previousFrameTime = performance.now();
let accumulatedTime = 0;

const startRuntime = async (): Promise<void> => {
  const renderPort = await createPixiRenderPort({
    viewport: viewportElement,
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
