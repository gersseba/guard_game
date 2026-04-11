import { deserializeLevel, validateLevelData } from '../world/level';
import { parseLayoutText } from '../world/layout';
import type { WorldState } from '../world/types';

export const createLevelStateFromData = (levelData: unknown, layoutText: string): WorldState => {
  const parsedLayout = parseLayoutText(layoutText);
  const validated = validateLevelData(levelData, {
    width: parsedLayout.width,
    height: parsedLayout.height,
  });
  return deserializeLevel(validated, parsedLayout);
};