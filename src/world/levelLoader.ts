import { deserializeLevel, validateLevelData } from './level';
import type { WorldState } from './types';

export interface LevelEntry {
  id: string;
  name: string;
}

/**
 * Fetches the level manifest (an array of LevelEntry) from the given URL.
 * Returns an empty array when the manifest is not found (404) so callers
 * can render an empty UI without crashing.
 */
export async function fetchLevelManifest(manifestUrl: string): Promise<LevelEntry[]> {
  const response = await fetch(manifestUrl);

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch level manifest: ${response.status} ${response.statusText}`);
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error('Level manifest must be a JSON array');
  }

  return data as LevelEntry[];
}

/**
 * Fetches a level JSON from the given URL, validates the schema, and
 * deserializes it into a fresh WorldState. Pure async: no side effects.
 */
export async function fetchAndLoadLevel(levelUrl: string): Promise<WorldState> {
  const response = await fetch(levelUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch level: ${response.status} ${response.statusText}`);
  }

  const data: unknown = await response.json();
  const levelData = validateLevelData(data);
  return deserializeLevel(levelData);
}
