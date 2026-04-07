import type { LevelData, WorldState } from './types';
import { validateSpatialLayout } from './spatialRules';
import {
  mapEnvironmentDtoToRuntime,
  mapGuardDtoToRuntime,
  mapLevelInteractiveObjectDtoToRuntime,
} from './entities/dtoRuntimeSeams';
import { validateLevelHeader } from './levelValidation/validateHeader';
import { validatePlayer } from './levelValidation/validatePlayer';
import { validateGuards } from './levelValidation/validateGuards';
import { validateDoors } from './levelValidation/validateDoors';
import { validateNpcs } from './levelValidation/validateNpcs';
import { validateObjects } from './levelValidation/validateObjects';
import { validateEnvironments } from './levelValidation/validateEnvironments';
import { mapPlayerDtoToRuntime } from './levelMapping/mapPlayer';
import { mapDoorDtoToRuntime } from './levelMapping/mapDoor';
import { mapNpcWithRiddleClue } from './levelMapping/mapNpcWithRiddleClue';

/**
 * Validates that an unknown value conforms to the LevelData schema.
 * Throws a descriptive Error if any required field is missing or has an unexpected type/value.
 */
export function validateLevelData(input: unknown): LevelData {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Invalid level data: expected an object');
  }

  const raw = input as Record<string, unknown>;

  const { levelWidth, levelHeight } = validateLevelHeader(raw);
  validatePlayer(raw);
  validateGuards(raw);
  validateDoors(raw);
  validateNpcs(raw, levelWidth, levelHeight);
  validateObjects(raw);
  validateEnvironments(raw);

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
      tileSize: 48,
    },
    levelMetadata: {
      name: levelData.name,
      premise: levelData.premise,
      goal: levelData.goal,
    },
    player: mapPlayerDtoToRuntime(levelData.player),
    npcs: (levelData.npcs ?? []).map((n) => mapNpcWithRiddleClue(n, levelData.doors)),
    guards: levelData.guards.map((g) => mapGuardDtoToRuntime(g)),
    doors: levelData.doors.map((d) => mapDoorDtoToRuntime(d)),
    interactiveObjects: (levelData.interactiveObjects ?? []).map((o) =>
      mapLevelInteractiveObjectDtoToRuntime(o),
    ),
    environments: (levelData.environments ?? []).map((environment) =>
      mapEnvironmentDtoToRuntime(environment),
    ),
    actorConversationHistoryByActorId: {},
    lastItemUseAttemptEvent: null,
    levelOutcome: null,
  };
  validateSpatialLayout(worldState);
  return worldState;
}
