import './style.css';
import { createCommandBuffer } from './input/commands';
import { handleNpcInteraction } from './interaction/npcInteraction';
import { createStubLlmClient } from './llm/client';
import { createRenderPortStub } from './render/scene';
import type { WorldCommand } from './world/types';
import { createWorld } from './world/world';

const FIXED_TIME_STEP_MS = 100;

const appRoot = document.querySelector<HTMLDivElement>('#app');
if (!appRoot) {
  throw new Error('Missing #app root element.');
}

appRoot.innerHTML = `
  <main>
    <h1>Guard Game</h1>
    <p>Runtime bootstrap active. Grid rendering and movement are implemented in follow-up tickets.</p>
    <button id="test-interaction" type="button">Test NPC Interaction</button>
    <p id="status">Status: idle</p>
    <pre id="state-output"></pre>
  </main>
`;

const interactionButton = document.querySelector<HTMLButtonElement>('#test-interaction');
const statusOutput = document.querySelector<HTMLParagraphElement>('#status');
const stateOutput = document.querySelector<HTMLPreElement>('#state-output');

if (!interactionButton || !statusOutput || !stateOutput) {
  throw new Error('Missing runtime UI elements.');
}

const world = createWorld();
const commandBuffer = createCommandBuffer();
const renderPort = createRenderPortStub();
const llmClient = createStubLlmClient();

interactionButton.addEventListener('click', () => {
  commandBuffer.enqueue({ type: 'interact' });
});

const processInteraction = async (): Promise<void> => {
  const state = world.getState();
  const firstNpc = state.npcs[0];
  if (!firstNpc) {
    statusOutput.textContent = 'Status: no NPC available for interaction.';
    return;
  }

  const interactionResult = await handleNpcInteraction({
    npc: firstNpc,
    player: state.player,
  });
  const llmResult = await llmClient.complete({
    actorId: firstNpc.id,
    context: firstNpc.dialogueContextKey,
    playerMessage: interactionResult.responseText,
  });

  statusOutput.textContent = `Status: ${interactionResult.responseText} | LLM: ${llmResult.text}`;
};

const tick = (): void => {
  const commands = commandBuffer.drain();
  const hasInteractionCommand = commands.some((command: WorldCommand) => command.type === 'interact');

  world.applyCommands(commands);

  const nextState = world.getState();
  renderPort.render(nextState);
  stateOutput.textContent = JSON.stringify(nextState, null, 2);

  if (hasInteractionCommand) {
    void processInteraction();
  }
};

let previousTime = performance.now();
let accumulator = 0;

const runFrame = (now: number): void => {
  accumulator += now - previousTime;
  previousTime = now;

  while (accumulator >= FIXED_TIME_STEP_MS) {
    tick();
    accumulator -= FIXED_TIME_STEP_MS;
  }

  requestAnimationFrame(runFrame);
};

tick();
requestAnimationFrame(runFrame);
