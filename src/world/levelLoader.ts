import { deserializeLevel, validateLevelData } from './level';
import { parseLayoutText } from './layout';
import type { WorldState } from './types';

export interface LevelEntry {
  id: string;
  name: string;
}

const BASE_ORIGIN = 'https://guard-game.local';

const resolveLayoutUrlFromLevelUrl = (levelUrl: string): string => {
  const parsed = new URL(levelUrl, BASE_ORIGIN);

  if (!parsed.pathname.endsWith('.json')) {
    throw new Error(`Invalid level URL: expected a .json level path in "${levelUrl}"`);
  }

  const layoutPathname = parsed.pathname.replace(/\.json$/, '.layout.txt');
  return `${layoutPathname}${parsed.search}${parsed.hash}`;
};

const hasPathTraversal = (path: string): boolean => path.split('/').some((segment) => segment === '..');

const resolveLayoutUrlFromLayoutPath = (levelUrl: string, layoutPath: string): string => {
  if (layoutPath.startsWith('/')) {
    throw new Error('Invalid level data: layoutPath must be a relative path');
  }

  if (/^https?:\/\//.test(layoutPath)) {
    throw new Error('Invalid level data: layoutPath must be a relative path');
  }

  if (hasPathTraversal(layoutPath)) {
    throw new Error(`Invalid level data: layoutPath must not contain path traversal segments: "${layoutPath}"`);
  }

  const parsedLevelUrl = new URL(levelUrl, BASE_ORIGIN);
  const resolvedLayoutUrl = new URL(layoutPath, parsedLevelUrl);

  return `${resolvedLayoutUrl.pathname}${resolvedLayoutUrl.search}${resolvedLayoutUrl.hash}`;
};

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
  if (hasPathTraversal(levelUrl)) {
    throw new Error(`Invalid level URL: path traversal detected in "${levelUrl}"`);
  }

  const layoutUrl = resolveLayoutUrlFromLevelUrl(levelUrl);

  const layoutResponse = await fetch(layoutUrl);
  if (!layoutResponse.ok) {
    throw new Error(`Failed to fetch layout: ${layoutResponse.status} ${layoutResponse.statusText} (${layoutUrl})`);
  }

  const layoutText = await layoutResponse.text();
  const parsedLayout = parseLayoutText(layoutText);

  const response = await fetch(levelUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch level: ${response.status} ${response.statusText}`);
  }

  const data: unknown = JSON.parse(await response.text());

  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid level data: expected an object');
  }

  const rawLevel = data as Record<string, unknown>;
  if (typeof rawLevel['layoutPath'] !== 'string' || rawLevel['layoutPath'].trim() === '') {
    throw new Error('Invalid level data: layoutPath must be a non-empty string');
  }

  const resolvedLayoutUrlFromLevelData = resolveLayoutUrlFromLayoutPath(levelUrl, rawLevel['layoutPath']);
  if (resolvedLayoutUrlFromLevelData !== layoutUrl) {
    throw new Error(
      `Invalid level data: layoutPath resolves to "${resolvedLayoutUrlFromLevelData}" but runtime loaded "${layoutUrl}"`,
    );
  }

  const levelData = validateLevelData(data, {
    width: parsedLayout.width,
    height: parsedLayout.height,
  });
  return deserializeLevel(levelData, parsedLayout);
}
