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
  entityGraphics: Graphics;
  playerGraphics: Graphics;
  rootContainer: Container;
  lastWidth: number;
  lastHeight: number;
}

export interface EntityCircleSpec {
  typeKey: string;
  centerX: number;
  centerY: number;
  radius: number;
  color: number;
}

const VIEWPORT_TILE_WIDTH = 6;
const VIEWPORT_TILE_HEIGHT = 10;
const EDGE_BAND_TILES = 1;

const KNOWN_TYPE_COLORS: Record<string, number> = {
  npc: 0x50d1c8,
  guard: 0xf26b6b,
  door: 0x4f8dd8,
  'interactive-object:inspect': 0x7ad17a,
  'interactive-object:use': 0xf1a248,
  'interactive-object:talk': 0xc885f7,
};

const FALLBACK_PALETTE = [0x87d6b0, 0x7ca9ff, 0xf7b267, 0xff9fa3, 0x9fdbff, 0xc7b8ff];

const hashTypeKey = (typeKey: string): number => {
  let hash = 0;
  for (const char of typeKey) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
};

export const getColorForEntityType = (typeKey: string): number => {
  const knownColor = KNOWN_TYPE_COLORS[typeKey];
  if (knownColor !== undefined) {
    return knownColor;
  }

  const hash = hashTypeKey(typeKey);
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
};

export const buildEntityCircleSpecs = (worldState: WorldState): EntityCircleSpec[] => {
  const tileSize = worldState.grid.tileSize;
  const radius = Math.max(5, tileSize * 0.22);
  const toCenter = (x: number, y: number): { centerX: number; centerY: number } => ({
    centerX: x * tileSize + tileSize / 2,
    centerY: y * tileSize + tileSize / 2,
  });

  const npcCircles = worldState.npcs.map((npc) => {
    const typeKey = 'npc';
    const center = toCenter(npc.position.x, npc.position.y);
    return {
      typeKey,
      ...center,
      radius,
      color: getColorForEntityType(typeKey),
    };
  });

  const guardCircles = worldState.guards.map((guard) => {
    const typeKey = 'guard';
    const center = toCenter(guard.position.x, guard.position.y);
    return {
      typeKey,
      ...center,
      radius,
      color: getColorForEntityType(typeKey),
    };
  });

  const doorCircles = worldState.doors.map((door) => {
    const typeKey = 'door';
    const center = toCenter(door.position.x, door.position.y);
    return {
      typeKey,
      ...center,
      radius,
      color: getColorForEntityType(typeKey),
    };
  });

  const objectCircles = worldState.interactiveObjects.map((interactiveObject) => {
    const typeKey = `interactive-object:${interactiveObject.interactionType}`;
    const center = toCenter(interactiveObject.position.x, interactiveObject.position.y);
    return {
      typeKey,
      ...center,
      radius,
      color: getColorForEntityType(typeKey),
    };
  });

  return [...npcCircles, ...guardCircles, ...doorCircles, ...objectCircles];
};

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

const drawEntityMarkers = (context: RenderContext, worldState: WorldState): void => {
  const circles = buildEntityCircleSpecs(worldState);

  context.entityGraphics.clear();
  for (const circle of circles) {
    context.entityGraphics.circle(circle.centerX, circle.centerY, circle.radius).fill({ color: circle.color });
    context.entityGraphics
      .circle(circle.centerX, circle.centerY, circle.radius)
      .stroke({ color: 0x102131, width: 2, alpha: 0.9 });
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
  const entityGraphics = new Graphics();
  const playerGraphics = new Graphics();
  const rootContainer = new Container();
  rootContainer.addChild(boundaryGraphics);
  rootContainer.addChild(gridGraphics);
  rootContainer.addChild(entityGraphics);
  rootContainer.addChild(playerGraphics);
  app.stage.addChild(rootContainer);

  const context: RenderContext = {
    app,
    boundaryGraphics,
    gridGraphics,
    entityGraphics,
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
      drawEntityMarkers(context, worldState);
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
