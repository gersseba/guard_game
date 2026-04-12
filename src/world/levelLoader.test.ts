import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAndLoadLevel, fetchLevelManifest } from './levelLoader';
import { Environment } from './entities/environment/Environment';
import { Item } from './entities/items/Item';
import { Npc } from './entities/npcs/Npc';
import { InertObject } from './entities/objects/InertObject';
import type { LevelData } from './types';

const minimalLevel: LevelData = {
  version: 2,
  layoutPath: 'test.layout.txt',
  name: 'Test Level',
  premise: 'A deterministic test premise.',
  goal: 'Verify level loading behavior.',
  player: { x: 2, y: 3 },
  guards: [],
  doors: [],
};

const openLayout = [
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
].join('\n');

const mockLayoutAndLevelFetch = (layoutText: string, levelData: unknown): void => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(layoutText),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(JSON.stringify(levelData)),
      }),
  );
};

const mockManifestFetch = (body: unknown, status = 200): void => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Not Found',
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(''),
    }),
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchAndLoadLevel', () => {
  it('loads layout first, then JSON, and composes deterministic world state', async () => {
    mockLayoutAndLevelFetch(
      openLayout,
      {
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
      },
    );

    const fetchMock = vi.mocked(fetch);
    const state = await fetchAndLoadLevel('/levels/test.json');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/levels/test.layout.txt');
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/levels/test.json');

    expect(state.player.position).toEqual({ x: 2, y: 3 });
    expect(state.grid.width).toBe(20);
    expect(state.grid.height).toBe(5);
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

  it('returns equivalent state across repeated identical level and layout loads', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: () => Promise.resolve(openLayout),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: () => Promise.resolve(JSON.stringify(minimalLevel)),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: () => Promise.resolve(openLayout),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: () => Promise.resolve(JSON.stringify(minimalLevel)),
        }),
    );

    const first = await fetchAndLoadLevel('/levels/test.json');
    const second = await fetchAndLoadLevel('/levels/test.json');

    expect(first).toEqual(second);
  });

  it('throws when the layout fetch returns a non-ok status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve(''),
      }),
    );

    await expect(fetchAndLoadLevel('/levels/missing.json')).rejects.toThrow('Failed to fetch layout');
  });

  it('throws when the level JSON fetch returns a non-ok status after layout loads', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: () => Promise.resolve(openLayout),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          text: () => Promise.resolve(''),
        }),
    );

    await expect(fetchAndLoadLevel('/levels/missing.json')).rejects.toThrow('Failed to fetch level');
  });

  it('throws when levelUrl contains path traversal before fetching', async () => {
    await expect(fetchAndLoadLevel('/levels/../config.json')).rejects.toThrow(
      'path traversal detected',
    );
  });

  it('throws when levelUrl does not point to a .json file', async () => {
    await expect(fetchAndLoadLevel('/levels/riddle.layout.txt')).rejects.toThrow(
      'expected a .json level path',
    );
  });

  it('throws when the derived layout path cannot be fetched', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          text: () => Promise.resolve(''),
        }),
    );

    await expect(fetchAndLoadLevel('/levels/missing.json')).rejects.toThrow(
      'Failed to fetch layout: 404 Not Found (/levels/missing.layout.txt)',
    );
  });

  it('throws for unknown layout symbols', async () => {
    mockLayoutAndLevelFetch('..x', minimalLevel);

    await expect(fetchAndLoadLevel('/levels/bad-layout-symbol.json')).rejects.toThrow('unknown symbol');
  });

  it('throws for empty layout content', async () => {
    mockLayoutAndLevelFetch('', minimalLevel);

    await expect(fetchAndLoadLevel('/levels/empty-layout.json')).rejects.toThrow(
      'layout must contain at least one row',
    );
  });

  it('throws for ragged layout rows', async () => {
    mockLayoutAndLevelFetch('...\n..', minimalLevel);

    await expect(fetchAndLoadLevel('/levels/ragged-layout.json')).rejects.toThrow('has width 2, expected 3');
  });

  it('fails when layoutPath is missing in level JSON', async () => {
    const levelWithoutLayoutPath = { ...minimalLevel } as Partial<LevelData>;
    delete levelWithoutLayoutPath.layoutPath;

    mockLayoutAndLevelFetch(openLayout, levelWithoutLayoutPath);

    await expect(fetchAndLoadLevel('/levels/test.json')).rejects.toThrow(
      'Invalid level data: layoutPath must be a non-empty string',
    );
  });

  it('fails when layoutPath resolves to a different layout than the runtime-loaded layout', async () => {
    mockLayoutAndLevelFetch(openLayout, {
      ...minimalLevel,
      layoutPath: 'different.layout.txt',
    });

    await expect(fetchAndLoadLevel('/levels/test.json')).rejects.toThrow(
      'layoutPath resolves to "/levels/different.layout.txt" but runtime loaded "/levels/test.layout.txt"',
    );
  });

  it('fails when layoutPath is absolute instead of relative', async () => {
    mockLayoutAndLevelFetch(openLayout, {
      ...minimalLevel,
      layoutPath: '/levels/test.layout.txt',
    });

    await expect(fetchAndLoadLevel('/levels/test.json')).rejects.toThrow(
      'Invalid level data: layoutPath must be a relative path',
    );
  });

  it('fails when layoutPath contains path traversal segments', async () => {
    mockLayoutAndLevelFetch(openLayout, {
      ...minimalLevel,
      layoutPath: '../outside.layout.txt',
    });

    await expect(fetchAndLoadLevel('/levels/test.json')).rejects.toThrow(
      'Invalid level data: layoutPath must not contain path traversal segments',
    );
  });

  it('fails when an entity is out of layout bounds', async () => {
    mockLayoutAndLevelFetch(
      openLayout,
      {
        ...minimalLevel,
        layoutPath: 'out-of-bounds.layout.txt',
        guards: [
          {
            id: 'guard-1',
            displayName: 'Out Guard',
            x: 30,
            y: 2,
            guardState: 'idle',
          },
        ],
      },
    );

    await expect(fetchAndLoadLevel('/levels/out-of-bounds.json')).rejects.toThrow('is out of bounds');
  });

  it('fails when an entity is placed on a blocking layout cell', async () => {
    mockLayoutAndLevelFetch('...\n...\n...\n..#\n...', {
      ...minimalLevel,
      layoutPath: 'blocking-cell.layout.txt',
    });

    await expect(fetchAndLoadLevel('/levels/blocking-cell.json')).rejects.toThrow(
      'player is on blocking layout cell',
    );
  });
});

describe('fetchLevelManifest', () => {
  it('returns an array of LevelEntry objects', async () => {
    const manifest = [
      { id: 'level-01', name: 'Level 01' },
      { id: 'level-02', name: 'Level 02' },
    ];
    mockManifestFetch(manifest);

    const result = await fetchLevelManifest('/levels/manifest.json');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 'level-01', name: 'Level 01' });
  });

  it('returns an empty array when the manifest is 404', async () => {
    mockManifestFetch(null, 404);

    const result = await fetchLevelManifest('/levels/manifest.json');

    expect(result).toEqual([]);
  });

  it('throws when an entry is missing a required field', async () => {
    mockManifestFetch([{ id: 'level-01' }]);

    await expect(fetchLevelManifest('/levels/manifest.json')).rejects.toThrow(
      'Level manifest entry at index 0 is invalid',
    );
  });

  it('throws when the response is not an array', async () => {
    mockManifestFetch({ not: 'an array' });

    await expect(fetchLevelManifest('/levels/manifest.json')).rejects.toThrow(
      'Level manifest must be a JSON array',
    );
  });

  it('throws when the server returns a non-ok, non-404 status', async () => {
    mockManifestFetch(null, 500);

    await expect(fetchLevelManifest('/levels/manifest.json')).rejects.toThrow(
      'Failed to fetch level manifest',
    );
  });
});
