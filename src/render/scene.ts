import { Application, Container, Graphics } from 'pixi.js';
import type { WorldState } from '../world/types';

export interface RenderPort {
  render(worldState: WorldState): void;
}

export interface PixiRenderTargets {
  viewport: HTMLElement;
}

interface RenderContext {
  app: Application;
  gridGraphics: Graphics;
  playerGraphics: Graphics;
  rootContainer: Container;
  lastWidth: number;
  lastHeight: number;
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const measureViewport = (viewport: HTMLElement, worldState: WorldState): { width: number; height: number } => {
  const worldWidth = worldState.grid.width * worldState.grid.tileSize;
  const worldHeight = worldState.grid.height * worldState.grid.tileSize;
  const measuredWidth = Math.floor(viewport.clientWidth);
  const measuredHeight = Math.floor(viewport.clientHeight);
  const fallbackWidth = Math.min(worldWidth, 384);
  const fallbackHeight = Math.min(worldHeight, 256);

  return {
    width: clamp(measuredWidth || fallbackWidth, 1, worldWidth),
    height: clamp(measuredHeight || fallbackHeight, 1, worldHeight),
  };
};

const ensureCanvasSize = (
  context: RenderContext,
  worldState: WorldState,
  viewport: HTMLElement,
): void => {
  const { width: nextWidth, height: nextHeight } = measureViewport(viewport, worldState);

  if (context.lastWidth === nextWidth && context.lastHeight === nextHeight) {
    return;
  }

  context.lastWidth = nextWidth;
  context.lastHeight = nextHeight;
  context.app.renderer.resize(nextWidth, nextHeight);
};

const updateCamera = (context: RenderContext, worldState: WorldState): void => {
  const tileSize = worldState.grid.tileSize;
  const worldWidth = worldState.grid.width * tileSize;
  const worldHeight = worldState.grid.height * tileSize;
  const playerCenterX = worldState.player.position.x * tileSize + tileSize / 2;
  const playerCenterY = worldState.player.position.y * tileSize + tileSize / 2;
  const minOffsetX = context.lastWidth - worldWidth;
  const minOffsetY = context.lastHeight - worldHeight;
  const nextOffsetX = clamp(context.lastWidth / 2 - playerCenterX, minOffsetX, 0);
  const nextOffsetY = clamp(context.lastHeight / 2 - playerCenterY, minOffsetY, 0);

  context.rootContainer.position.set(nextOffsetX, nextOffsetY);
};

const drawGrid = (context: RenderContext, worldState: WorldState): void => {
  const tileSize = worldState.grid.tileSize;
  const widthPx = worldState.grid.width * tileSize;
  const heightPx = worldState.grid.height * tileSize;

  context.gridGraphics.clear();
  context.gridGraphics.rect(0, 0, widthPx, heightPx).fill({ color: 0x112332 });

  for (let x = 0; x <= worldState.grid.width; x += 1) {
    context.gridGraphics
      .moveTo(x * tileSize, 0)
      .lineTo(x * tileSize, heightPx)
      .stroke({ color: 0x2f4a5c, width: 1, alpha: 0.95 });
  }

  for (let y = 0; y <= worldState.grid.height; y += 1) {
    context.gridGraphics
      .moveTo(0, y * tileSize)
      .lineTo(widthPx, y * tileSize)
      .stroke({ color: 0x2f4a5c, width: 1, alpha: 0.95 });
  }
};

const drawPlayerMarker = (context: RenderContext, worldState: WorldState): void => {
  const tileSize = worldState.grid.tileSize;
  const centerX = worldState.player.position.x * tileSize + tileSize / 2;
  const centerY = worldState.player.position.y * tileSize + tileSize / 2;
  const radius = Math.max(6, tileSize * 0.28);

  context.playerGraphics.clear();
  context.playerGraphics.circle(centerX, centerY, radius).fill({ color: 0xffcf66 });
  context.playerGraphics
    .circle(centerX, centerY, radius)
    .stroke({ color: 0x6a4c13, width: 2, alpha: 1 });
};

export const createPixiRenderPort = async (targets: PixiRenderTargets): Promise<RenderPort> => {
  const app = new Application();
  await app.init({
    width: 1,
    height: 1,
    antialias: true,
    background: 0x091522,
  });

  targets.viewport.replaceChildren(app.canvas);

  const gridGraphics = new Graphics();
  const playerGraphics = new Graphics();
  const rootContainer = new Container();
  rootContainer.addChild(gridGraphics);
  rootContainer.addChild(playerGraphics);
  app.stage.addChild(rootContainer);

  const context: RenderContext = {
    app,
    gridGraphics,
    playerGraphics,
    rootContainer,
    lastWidth: 0,
    lastHeight: 0,
  };

  return {
    render: (worldState: WorldState) => {
      ensureCanvasSize(context, worldState, targets.viewport);
      drawGrid(context, worldState);
      drawPlayerMarker(context, worldState);
      updateCamera(context, worldState);
    },
  };
};

export const createRenderPortStub = (): RenderPort => ({
  render: (_worldState: WorldState) => {
    // Reserved for non-Pixi render testing scenarios.
  },
});
