import type { LevelData, WorldState } from './types';
import { validateSpatialLayout } from './spatialRules';

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

  if (
    (player as Record<string, unknown>)['spriteAssetPath'] !== undefined &&
    typeof (player as Record<string, unknown>)['spriteAssetPath'] !== 'string'
  ) {
    throw new Error('Invalid level data: player spriteAssetPath must be a string when provided');
  }

  if (!Array.isArray(raw['guards'])) {
    throw new Error('Invalid level data: guards must be an array');
  }

  for (let i = 0; i < (raw['guards'] as unknown[]).length; i++) {
    const guard = (raw['guards'] as unknown[])[i] as Record<string, unknown>;
    if (
      typeof guard !== 'object' ||
      guard === null ||
      typeof guard['id'] !== 'string' ||
      typeof guard['displayName'] !== 'string' ||
      typeof guard['x'] !== 'number' ||
      typeof guard['y'] !== 'number' ||
      typeof guard['guardState'] !== 'string'
    ) {
      throw new Error(
        `Invalid level data: guard at index ${i} must have id, displayName, x, y, and guardState`,
      );
    }
    // honestyTrait is optional
    if (guard['honestyTrait'] !== undefined) {
      if (guard['honestyTrait'] !== 'truth-teller' && guard['honestyTrait'] !== 'liar') {
        throw new Error(
          `Invalid level data: guard at index ${i} has invalid honestyTrait (must be 'truth-teller' or 'liar')`,
        );
      }
    }

    if (guard['spriteAssetPath'] !== undefined && typeof guard['spriteAssetPath'] !== 'string') {
      throw new Error(
        `Invalid level data: guard at index ${i} has invalid spriteAssetPath (must be a string when provided)`,
      );
    }
  }

  if (!Array.isArray(raw['doors'])) {
    throw new Error('Invalid level data: doors must be an array');
  }

  for (let i = 0; i < (raw['doors'] as unknown[]).length; i++) {
    const door = (raw['doors'] as unknown[])[i] as Record<string, unknown>;
    if (
      typeof door !== 'object' ||
      door === null ||
      typeof door['id'] !== 'string' ||
      typeof door['displayName'] !== 'string' ||
      typeof door['x'] !== 'number' ||
      typeof door['y'] !== 'number' ||
      typeof door['doorState'] !== 'string' ||
      typeof door['outcome'] !== 'string'
    ) {
      throw new Error(
        `Invalid level data: door at index ${i} must have id, displayName, x, y, doorState, and outcome`,
      );
    }
    if (door['outcome'] !== 'safe' && door['outcome'] !== 'danger') {
      throw new Error(
        `Invalid level data: door at index ${i} has invalid outcome (must be 'safe' or 'danger')`,
      );
    }
  }

  if (raw['npcs'] !== undefined) {
    if (!Array.isArray(raw['npcs'])) {
      throw new Error('Invalid level data: npcs must be an array');
    }

    for (let i = 0; i < (raw['npcs'] as unknown[]).length; i++) {
      const npc = (raw['npcs'] as unknown[])[i] as Record<string, unknown>;
      if (
        typeof npc !== 'object' ||
        npc === null ||
        typeof npc['id'] !== 'string' ||
        typeof npc['displayName'] !== 'string' ||
        typeof npc['x'] !== 'number' ||
        typeof npc['y'] !== 'number' ||
        typeof npc['npcType'] !== 'string'
      ) {
        throw new Error(
          `Invalid level data: npc at index ${i} must have id, displayName, x, y, and npcType`,
        );
      }

      if (npc['spriteAssetPath'] !== undefined && typeof npc['spriteAssetPath'] !== 'string') {
        throw new Error(
          `Invalid level data: npc at index ${i} has invalid spriteAssetPath (must be a string when provided)`,
        );
      }
    }
  }

  if (raw['interactiveObjects'] !== undefined) {
    if (!Array.isArray(raw['interactiveObjects'])) {
      throw new Error('Invalid level data: interactiveObjects must be an array');
    }

    for (let i = 0; i < (raw['interactiveObjects'] as unknown[]).length; i++) {
      const interactiveObject = (raw['interactiveObjects'] as unknown[])[i] as Record<string, unknown>;
      if (
        typeof interactiveObject !== 'object' ||
        interactiveObject === null ||
        typeof interactiveObject['id'] !== 'string' ||
        typeof interactiveObject['displayName'] !== 'string' ||
        typeof interactiveObject['x'] !== 'number' ||
        typeof interactiveObject['y'] !== 'number' ||
        interactiveObject['objectType'] !== 'supply-crate' ||
        (interactiveObject['interactionType'] !== 'inspect' &&
          interactiveObject['interactionType'] !== 'use' &&
          interactiveObject['interactionType'] !== 'talk') ||
        (interactiveObject['state'] !== 'idle' && interactiveObject['state'] !== 'used')
      ) {
        throw new Error(
          `Invalid level data: interactiveObject at index ${i} must have id, displayName, x, y, objectType, interactionType, and state`,
        );
      }

      if (
        interactiveObject['firstUseOutcome'] !== undefined &&
        interactiveObject['firstUseOutcome'] !== 'win' &&
        interactiveObject['firstUseOutcome'] !== 'lose'
      ) {
        throw new Error(
          `Invalid level data: interactiveObject at index ${i} has invalid firstUseOutcome (must be 'win' or 'lose')`,
        );
      }
    }
  }

  return raw as unknown as LevelData;
}

/**
 * Converts a flat LevelData JSON document into a fully-typed WorldState.
 * Pure and deterministic: same input always produces the same output.
 */
export function deserializeLevel(levelData: LevelData): WorldState {
  const worldState: WorldState = {
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
      ...(levelData.player.spriteAssetPath !== undefined
        ? { spriteAssetPath: levelData.player.spriteAssetPath }
        : {}),
    },
    npcs: (levelData.npcs ?? []).map((n) => ({
      id: n.id,
      displayName: n.displayName,
      position: { x: n.x, y: n.y },
      npcType: n.npcType,
      dialogueContextKey: `npc_${n.npcType.toLowerCase()}`,
      ...(n.spriteAssetPath !== undefined ? { spriteAssetPath: n.spriteAssetPath } : {}),
    })),
    guards: levelData.guards.map((g) => ({
      id: g.id,
      displayName: g.displayName,
      position: { x: g.x, y: g.y },
      guardState: g.guardState,
      honestyTrait: g.honestyTrait,
      ...(g.spriteAssetPath !== undefined ? { spriteAssetPath: g.spriteAssetPath } : {}),
    })),
    doors: levelData.doors.map((d) => ({
      id: d.id,
      displayName: d.displayName,
      position: { x: d.x, y: d.y },
      doorState: d.doorState,
      outcome: d.outcome,
    })),
    interactiveObjects: (levelData.interactiveObjects ?? []).map((o) => ({
      id: o.id,
      displayName: o.displayName,
      position: { x: o.x, y: o.y },
      objectType: o.objectType,
      interactionType: o.interactionType,
      state: o.state,
      idleMessage: o.idleMessage,
      usedMessage: o.usedMessage,
      firstUseOutcome: o.firstUseOutcome,
      spriteAssetPath: o.spriteAssetPath,
    })),
    actorConversationHistoryByActorId: {},
    levelOutcome: null,
  };
  validateSpatialLayout(worldState);
  return worldState;
}
