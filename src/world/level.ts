import type { LevelData, WorldState } from './types';
import { validateSpatialLayout } from './spatialRules';
import { isBlockingLayoutCell, type ParsedLayout } from './layout';
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
import { validateQuestChains } from './levelValidation/validateQuestChains';
import { mapPlayerDtoToRuntime } from './levelMapping/mapPlayer';
import { mapDoorDtoToRuntime } from './levelMapping/mapDoor';
import { mapNpcWithRiddleClue } from './levelMapping/mapNpcWithRiddleClue';
import { createQuestState } from './questState';

interface LayoutBounds {
  width: number;
  height: number;
}

const isOutOfBounds = (x: number, y: number, bounds: LayoutBounds): boolean =>
  x < 0 || x >= bounds.width || y < 0 || y >= bounds.height;

const validatePlacement = (
  entityLabel: string,
  x: number,
  y: number,
  parsedLayout: ParsedLayout,
): void => {
  if (isOutOfBounds(x, y, parsedLayout)) {
    throw new Error(
      `Invalid level data: ${entityLabel} is out of bounds at (${x}, ${y}) for layout ${parsedLayout.width}x${parsedLayout.height}`,
    );
  }

  if (isBlockingLayoutCell(parsedLayout, { x, y })) {
    throw new Error(`Invalid level data: ${entityLabel} is on blocking layout cell at (${x}, ${y})`);
  }
};

const validateEntityPlacementAgainstLayout = (levelData: LevelData, parsedLayout: ParsedLayout): void => {
  validatePlacement('player:player', levelData.player.x, levelData.player.y, parsedLayout);

  for (let i = 0; i < levelData.guards.length; i++) {
    const guard = levelData.guards[i];
    validatePlacement(`guard:${guard.id}`, guard.x, guard.y, parsedLayout);
  }

  for (let i = 0; i < levelData.doors.length; i++) {
    const door = levelData.doors[i];
    validatePlacement(`door:${door.id}`, door.x, door.y, parsedLayout);
  }

  const npcs = levelData.npcs ?? [];
  for (let i = 0; i < npcs.length; i++) {
    const npc = npcs[i];
    validatePlacement(`npc:${npc.id}`, npc.x, npc.y, parsedLayout);
  }

  const interactiveObjects = levelData.interactiveObjects ?? [];
  for (let i = 0; i < interactiveObjects.length; i++) {
    const interactiveObject = interactiveObjects[i];
    validatePlacement(
      `interactiveObject:${interactiveObject.id}`,
      interactiveObject.x,
      interactiveObject.y,
      parsedLayout,
    );
  }
};

const buildLayoutWallEnvironments = (parsedLayout: ParsedLayout) =>
  parsedLayout.blockingTiles.map((tile) => ({
    id: `layout-wall-${tile.x}-${tile.y}`,
    displayName: 'Wall',
    x: tile.x,
    y: tile.y,
    isBlocking: true,
  }));

/**
 * Validates that an unknown value conforms to the LevelData schema.
 * Throws a descriptive Error if any required field is missing or has an unexpected type/value.
 */
export function validateLevelData(input: unknown, layoutBounds?: LayoutBounds): LevelData {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Invalid level data: expected an object');
  }

  const raw = input as Record<string, unknown>;

  validateLevelHeader(raw);
  validatePlayer(raw);
  validateGuards(raw);
  validateDoors(raw);
  if (layoutBounds) {
    validateNpcs(raw, layoutBounds.width, layoutBounds.height);
  } else {
    validateNpcs(raw, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  }
  validateObjects(raw);
  validateEnvironments(raw);
  validateQuestChains(raw);

  return raw as unknown as LevelData;
}

/**
 * Converts a flat LevelData JSON document into a fully-typed WorldState.
 * Pure and deterministic: same input always produces the same output.
 */
export function deserializeLevel(levelData: LevelData, parsedLayout: ParsedLayout): WorldState {
  validateEntityPlacementAgainstLayout(levelData, parsedLayout);

  const layoutWallEnvironments = buildLayoutWallEnvironments(parsedLayout);

  const worldState: WorldState = {
    tick: 0,
    grid: {
      width: parsedLayout.width,
      height: parsedLayout.height,
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
    environments: [...layoutWallEnvironments, ...(levelData.environments ?? [])].map((environment) =>
      mapEnvironmentDtoToRuntime(environment),
    ),
    questState: createQuestState(levelData.questChains ?? []),
    actorConversationHistoryByActorId: {},
    lastItemUseAttemptEvent: null,
    levelOutcome: null,
  };
  validateSpatialLayout(worldState);
  return worldState;
}
