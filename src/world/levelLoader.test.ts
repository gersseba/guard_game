import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAndLoadLevel, fetchLevelManifest } from './levelLoader';
import { Environment } from './entities/environment/Environment';
import { Item } from './entities/items/Item';
import { Npc } from './entities/npcs/Npc';
import { InertObject } from './entities/objects/InertObject';
import type { LevelData } from './types';

const minimalLevel: LevelData = {
  version: 2,
  name: 'Test Level',
  premise: 'A deterministic test premise.',
  goal: 'Verify level loading behavior.',
  width: 20,
  height: 20,
  player: { x: 2, y: 3 },
  guards: [],
  doors: [],
};

const mockFetch = (body: unknown, status = 200): void => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Not Found',
      json: () => Promise.resolve(body),
    }),
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchAndLoadLevel', () => {
  it('fetches a URL, validates, and returns a WorldState', async () => {
    mockFetch({
      ...minimalLevel,
      npcs: [
        {
          id: 'npc-1',
          displayName: 'Archivist',
          x: 2,
          y: 4,
          npcType: 'archive_keeper',
          inventory: [
            {
              itemId: 'token',
              displayName: 'Token',
              sourceObjectId: 'npc-1',
              pickedUpAtTick: 0,
            },
          ],
        },
      ],
      interactiveObjects: [
        {
          id: 'statue-1',
          displayName: 'Statue',
          x: 3,
          y: 3,
          objectType: 'decoration',
          interactionType: 'inspect',
          state: 'idle',
        },
      ],
      environments: [
        {
          id: 'wall-1',
          displayName: 'Stone Wall',
          x: 1,
          y: 1,
          isBlocking: true,
        },
      ],
    });

    const state = await fetchAndLoadLevel('/levels/test.json');

    expect(state.player.position).toEqual({ x: 2, y: 3 });
    expect(state.grid.width).toBe(20);
    expect(state.grid.height).toBe(20);
    expect(state.tick).toBe(0);
    expect(state.levelMetadata).toEqual({
      name: 'Test Level',
      premise: 'A deterministic test premise.',
      goal: 'Verify level loading behavior.',
    });
    expect(state.npcs[0]).toBeInstanceOf(Npc);
    expect(state.npcs[0].inventory?.[0]).toBeInstanceOf(Item);
    expect(state.interactiveObjects[0]).toBeInstanceOf(InertObject);
    expect(state.environments?.[0]).toBeInstanceOf(Environment);
  });

  it('returns equivalent deterministic runtime state across repeated identical DTO loads', async () => {
    const sameLevel: LevelData = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Archivist', x: 2, y: 4, npcType: 'archive_keeper' }],
    };

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve(sameLevel),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve(sameLevel),
        }),
    );

    const first = await fetchAndLoadLevel('/levels/test.json');
    const second = await fetchAndLoadLevel('/levels/test.json');

    expect(first).toEqual(second);
  });

  it('throws when the server returns a non-ok status', async () => {
    mockFetch(null, 404);

    await expect(fetchAndLoadLevel('/levels/missing.json')).rejects.toThrow('Failed to fetch level');
  });

  it('throws when levelUrl contains path traversal before fetching', async () => {
    await expect(fetchAndLoadLevel('/levels/../config.json')).rejects.toThrow(
      'path traversal detected',
    );
  });

  it('throws when the JSON does not pass validateLevelData', async () => {
    mockFetch({ version: 2, name: 'Bad' });

    await expect(fetchAndLoadLevel('/levels/bad.json')).rejects.toThrow();
  });

  it('fails deterministically when loaded coordinates are out of bounds', async () => {
    mockFetch({
      ...minimalLevel,
      guards: [
        {
          id: 'guard-1',
          displayName: 'Out Guard',
          x: 20,
          y: 2,
          guardState: 'idle',
        },
      ],
    });

    await expect(fetchAndLoadLevel('/levels/out-of-bounds.json')).rejects.toThrow(
      'Invalid world layout: guard:guard-1 is out of bounds at (20, 2)',
    );
  });

  it('fails deterministically when loaded entities overlap', async () => {
    mockFetch({
      ...minimalLevel,
      doors: [
        {
          id: 'door-1',
          displayName: 'Overlap Door',
          x: 2,
          y: 3,
          isOpen: false, isLocked: false,
          isSafe: true,
        },
      ],
    });

    await expect(fetchAndLoadLevel('/levels/overlap.json')).rejects.toThrow(
      'Invalid world layout: overlapping coordinates at (2, 3) between player:player and door:door-1',
    );
  });
});

describe('fetchLevelManifest', () => {
  it('returns an array of LevelEntry objects', async () => {
    const manifest = [
      { id: 'level-01', name: 'Level 01' },
      { id: 'level-02', name: 'Level 02' },
    ];
    mockFetch(manifest);

    const result = await fetchLevelManifest('/levels/manifest.json');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 'level-01', name: 'Level 01' });
  });

  it('returns an empty array when the manifest is 404', async () => {
    mockFetch(null, 404);

    const result = await fetchLevelManifest('/levels/manifest.json');

    expect(result).toEqual([]);
  });

  it('throws when an entry is missing a required field', async () => {
    mockFetch([{ id: 'level-01' }]);

    await expect(fetchLevelManifest('/levels/manifest.json')).rejects.toThrow(
      'Level manifest entry at index 0 is invalid',
    );
  });

  it('throws when the response is not an array', async () => {
    mockFetch({ not: 'an array' });

    await expect(fetchLevelManifest('/levels/manifest.json')).rejects.toThrow(
      'Level manifest must be a JSON array',
    );
  });

  it('throws when the server returns a non-ok, non-404 status', async () => {
    mockFetch(null, 500);

    await expect(fetchLevelManifest('/levels/manifest.json')).rejects.toThrow(
      'Failed to fetch level manifest',
    );
  });
});
