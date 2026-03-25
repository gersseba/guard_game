import type { WorldState } from '../world/types';

export interface RenderPort {
  render(worldState: WorldState): void;
}

export interface DomRenderTargets {
  viewport: HTMLElement;
  worldState: HTMLElement;
}

const formatPlayerPosition = (worldState: WorldState): string => {
  const { x, y } = worldState.player.position;
  return `Player @ (${x}, ${y})`;
};

export const createRenderPortStub = (targets: DomRenderTargets): RenderPort => ({
  render: (worldState: WorldState) => {
    targets.viewport.textContent = formatPlayerPosition(worldState);
    targets.worldState.textContent = JSON.stringify(worldState, null, 2);
  },
});
