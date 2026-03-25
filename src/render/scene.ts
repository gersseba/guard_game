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
  boundaryGraphics: Graphics;
  gridGraphics: Graphics;
  playerGraphics: Graphics;
  rootContainer: Container;
  lastWidth: number;
  lastHeight: number;
}

const VIEWPORT_TILE_WIDTH = 6;
const VIEWPORT_TILE_HEIGHT = 10;
const EDGE_BAND_TILES = 1;

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const measureViewport = (worldState: WorldState): { width: number; height: number } => {
  const worldWidth = worldState.grid.width * worldState.grid.tileSize;
  const worldHeight = worldState.grid.height * worldState.grid.tileSize;
  const fixedWidth = VIEWPORT_TILE_WIDTH * worldState.grid.tileSize;
  const fixedHeight = VIEWPORT_TILE_HEIGHT * worldState.grid.tileSize;

  return {
    width: clamp(fixedWidth, 1, worldWidth + EDGE_BAND_TILES * worldState.grid.tileSize * 2),
    height: clamp(fixedHeight, 1, worldHeight + EDGE_BAND_TILES * worldState.grid.tileSize * 2),
  };
};

const ensureCanvasSize = (
  context: RenderContext,
  worldState: WorldState,
): void => {
  const { width: nextWidth, height: nextHeight } = measureViewport(worldState);

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
  const edgeBandSize = tileSize * EDGE_BAND_TILES;
  const minOffsetX = context.lastWidth - worldWidth - edgeBandSize;
  const minOffsetY = context.lastHeight - worldHeight - edgeBandSize;
  const maxOffsetX = edgeBandSize;
  const maxOffsetY = edgeBandSize;
  const nextOffsetX = clamp(context.lastWidth / 2 - playerCenterX, minOffsetX, maxOffsetX);
  const nextOffsetY = clamp(context.lastHeight / 2 - playerCenterY, minOffsetY, maxOffsetY);

  context.rootContainer.position.set(nextOffsetX, nextOffsetY);
};

const drawBoundaryBand = (context: RenderContext, worldState: WorldState): void => {
  const tileSize = worldState.grid.tileSize;
  const worldWidth = worldState.grid.width * tileSize;
  const worldHeight = worldState.grid.height * tileSize;
  const edgeBandSize = tileSize * EDGE_BAND_TILES;

  context.boundaryGraphics.clear();
  context.boundaryGraphics
    .rect(-edgeBandSize, -edgeBandSize, worldWidth + edgeBandSize * 2, worldHeight + edgeBandSize * 2)
    .fill({ color: 0x3d2135 });
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
  const boundaryGraphics = new Graphics();
  const playerGraphics = new Graphics();
  const rootContainer = new Container();
  rootContainer.addChild(boundaryGraphics);
  rootContainer.addChild(gridGraphics);
  rootContainer.addChild(playerGraphics);
  app.stage.addChild(rootContainer);

  const context: RenderContext = {
    app,
    boundaryGraphics,
    gridGraphics,
    playerGraphics,
    rootContainer,
    lastWidth: 0,
    lastHeight: 0,
  };

  return {
    render: (worldState: WorldState) => {
      ensureCanvasSize(context, worldState);
      drawBoundaryBand(context, worldState);
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
