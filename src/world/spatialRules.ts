import type { GridPosition, WorldGrid, WorldState } from './types';

interface SpatialEntity {
  label: string;
  position: GridPosition;
}

const samePosition = (a: GridPosition, b: GridPosition): boolean => a.x === b.x && a.y === b.y;

export const isInBounds = (position: GridPosition, grid: WorldGrid): boolean =>
  position.x >= 0 && position.x < grid.width && position.y >= 0 && position.y < grid.height;

export const getBlockingOccupants = (worldState: WorldState, position: GridPosition): SpatialEntity[] => {
  const blockers: SpatialEntity[] = [];

  for (const npc of worldState.npcs) {
    if (samePosition(npc.position, position)) {
      blockers.push({ label: `npc:${npc.id}`, position: npc.position });
    }
  }

  for (const interactiveObject of worldState.interactiveObjects) {
    if (samePosition(interactiveObject.position, position)) {
      blockers.push({ label: `interactiveObject:${interactiveObject.id}`, position: interactiveObject.position });
    }
  }

  for (const guard of worldState.guards) {
    if (samePosition(guard.position, position)) {
      blockers.push({ label: `guard:${guard.id}`, position: guard.position });
    }
  }

  for (const door of worldState.doors) {
    if (samePosition(door.position, position)) {
      // Only block traversal if door has not been unlocked via item-use.
      if (!door.isUnlocked) {
        blockers.push({ label: `door:${door.id}`, position: door.position });
      }
    }
  }

  return blockers;
};

export const canMovePlayerTo = (worldState: WorldState, target: GridPosition): boolean =>
  isInBounds(target, worldState.grid) && getBlockingOccupants(worldState, target).length === 0;

const collectSpatialEntities = (worldState: WorldState): SpatialEntity[] => [
  { label: `player:${worldState.player.id}`, position: worldState.player.position },
  ...worldState.npcs.map((npc) => ({ label: `npc:${npc.id}`, position: npc.position })),
  ...worldState.interactiveObjects.map((interactiveObject) => ({
    label: `interactiveObject:${interactiveObject.id}`,
    position: interactiveObject.position,
  })),
  ...worldState.guards.map((guard) => ({ label: `guard:${guard.id}`, position: guard.position })),
  ...worldState.doors.map((door) => ({ label: `door:${door.id}`, position: door.position })),
];

export const validateSpatialLayout = (worldState: WorldState): void => {
  const entities = collectSpatialEntities(worldState);
  const occupiedByCoordinate = new Map<string, string>();

  for (const entity of entities) {
    if (!isInBounds(entity.position, worldState.grid)) {
      throw new Error(
        `Invalid world layout: ${entity.label} is out of bounds at (${entity.position.x}, ${entity.position.y})`,
      );
    }

    const coordinateKey = `${entity.position.x},${entity.position.y}`;
    const existingEntityLabel = occupiedByCoordinate.get(coordinateKey);
    if (existingEntityLabel) {
      throw new Error(
        `Invalid world layout: overlapping coordinates at (${entity.position.x}, ${entity.position.y}) between ${existingEntityLabel} and ${entity.label}`,
      );
    }

    occupiedByCoordinate.set(coordinateKey, entity.label);
  }
};