import type { WorldState } from '../world/types';

export interface RenderPort {
  render(worldState: WorldState): void;
}

export const createRenderPortStub = (): RenderPort => ({
  render: (_worldState: WorldState) => {
    // Render implementation is added in the next increment.
  },
});
