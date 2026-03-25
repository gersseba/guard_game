import type { LevelData, WorldState } from './types';

const DEFAULT_TILE_SIZE = 48;

/**
 * Converts a flat LevelData JSON document into a fully-typed WorldState.
 * Pure and deterministic: same input always produces the same output.
 */
export function deserializeLevel(levelData: LevelData): WorldState {
  return {
    tick: 0,
    grid: {
      width: levelData.width,
      height: levelData.height,
      tileSize: DEFAULT_TILE_SIZE,
    },
    player: {
      id: 'player',
      displayName: 'Player',
      position: { x: levelData.player.x, y: levelData.player.y },
    },
    npcs: [],
    guards: levelData.guards.map((g) => ({
      id: g.id,
      displayName: g.displayName,
      position: { x: g.x, y: g.y },
      guardState: g.guardState,
    })),
    doors: levelData.doors.map((d) => ({
      id: d.id,
      displayName: d.displayName,
      position: { x: d.x, y: d.y },
      doorState: d.doorState,
    })),
    interactiveObjects: [],
  };
}
