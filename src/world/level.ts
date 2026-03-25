import type { LevelData, WorldState } from './types';

const DEFAULT_TILE_SIZE = 48;

/**
 * Validates that an unknown value conforms to the LevelData schema.
 * Throws a descriptive Error if any required field is missing or has an unexpected type/value.
 */
export function validateLevelData(input: unknown): LevelData {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Invalid level data: expected an object');
  }

  const raw = input as Record<string, unknown>;

  if (raw['version'] !== 1) {
    throw new Error('Invalid level data: version must be 1');
  }

  if (typeof raw['name'] !== 'string' || raw['name'].trim() === '') {
    throw new Error('Invalid level data: name must be a non-empty string');
  }

  if (typeof raw['width'] !== 'number' || raw['width'] <= 0) {
    throw new Error('Invalid level data: width must be a positive number');
  }

  if (typeof raw['height'] !== 'number' || raw['height'] <= 0) {
    throw new Error('Invalid level data: height must be a positive number');
  }

  const player = raw['player'];
  if (
    typeof player !== 'object' ||
    player === null ||
    typeof (player as Record<string, unknown>)['x'] !== 'number' ||
    typeof (player as Record<string, unknown>)['y'] !== 'number'
  ) {
    throw new Error('Invalid level data: player must have numeric x and y');
  }

  if (!Array.isArray(raw['guards'])) {
    throw new Error('Invalid level data: guards must be an array');
  }

  if (!Array.isArray(raw['doors'])) {
    throw new Error('Invalid level data: doors must be an array');
  }

  return raw as unknown as LevelData;
}

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
