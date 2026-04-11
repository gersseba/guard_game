import { deserializeLevel, validateLevelData } from './level';
import { parseLayoutText } from './layout';
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

  for (let i = 0; i < data.length; i++) {
    const entry = data[i] as Record<string, unknown>;
    if (
      typeof entry !== 'object' ||
      entry === null ||
      typeof entry['id'] !== 'string' ||
      entry['id'] === '' ||
      typeof entry['name'] !== 'string' ||
      entry['name'] === ''
    ) {
      throw new Error(
        `Level manifest entry at index ${i} is invalid: 'id' and 'name' must be non-empty strings`,
      );
    }
  }

  return data as LevelEntry[];
}

/**
 * Fetches a level JSON from the given URL, validates the schema, and
 * deserializes it into a fresh WorldState. Pure async: no side effects.
 */
export async function fetchAndLoadLevel(levelUrl: string): Promise<WorldState> {
  // Guard against path traversal: reject URLs containing '..' path segments.
  if (levelUrl.split('/').some((segment) => segment === '..')) {
    throw new Error(`Invalid level URL: path traversal detected in "${levelUrl}"`);
  }

  const response = await fetch(levelUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch level: ${response.status} ${response.statusText}`);
  }

  const levelJsonText = await response.text();
  const layoutPathMatch = levelJsonText.match(/"layoutPath"\s*:\s*"([^"]+)"/);
  const layoutPath = layoutPathMatch?.[1];

  if (!layoutPath || layoutPath.trim() === '') {
    throw new Error('Invalid level data: layoutPath must be a non-empty string');
  }

  if (layoutPath.startsWith('/')) {
    throw new Error(`Invalid layoutPath "${layoutPath}": expected a relative path`);
  }

  if (layoutPath.split('/').some((segment) => segment === '..')) {
    throw new Error(`Invalid layoutPath "${layoutPath}": path traversal is not allowed`);
  }

  const baseUrl = new URL(levelUrl, 'https://guard-game.local');
  const resolvedLayoutUrl = new URL(layoutPath, baseUrl);
  const layoutFetchUrl = `${resolvedLayoutUrl.pathname}${resolvedLayoutUrl.search}${resolvedLayoutUrl.hash}`;

  const layoutResponse = await fetch(layoutFetchUrl);
  if (!layoutResponse.ok) {
    throw new Error(
      `Failed to fetch layout: ${layoutResponse.status} ${layoutResponse.statusText} (${layoutFetchUrl})`,
    );
  }

  const layoutText = await layoutResponse.text();
  const parsedLayout = parseLayoutText(layoutText);

  const data: unknown = JSON.parse(levelJsonText);

  const levelData = validateLevelData(data, {
    width: parsedLayout.width,
    height: parsedLayout.height,
  });
  return deserializeLevel(levelData, parsedLayout);
}
