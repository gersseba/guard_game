import { deserializeLevel, validateLevelData } from '../world/level';
import type { WorldState } from '../world/types';

export const createLevelStateFromData = (levelData: unknown): WorldState => {
  const validated = validateLevelData(levelData);
  return deserializeLevel(validated);
};