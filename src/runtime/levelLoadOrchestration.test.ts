// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createLevelLoadOrchestration } from './levelLoadOrchestration';
import type { LevelUiHandle } from '../render/levelUi';
import type { LevelEntry } from '../world/levelLoader';
import type { WorldState } from '../world/types';

const createWorldState = (levelName: string): WorldState => ({
  tick: 0,
  grid: { width: 10, height: 10, tileSize: 32 },
  levelMetadata: {
    name: levelName,
    premise: `${levelName} premise`,
    goal: `${levelName} goal`,
  },
  levelObjective: `${levelName} objective`,
  player: {
    id: 'player',
    displayName: 'Player',
    position: { x: 1, y: 1 },
    inventory: {
      items: [],
      selectedItem: null,
    },
  },
  guards: [],
  doors: [],
  npcs: [],
  interactiveObjects: [],
  actorConversationHistoryByActorId: {},
  levelOutcome: null,
});

const flushPromises = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('createLevelLoadOrchestration', () => {
  it('loads default level first and orders selector options with default at top', async () => {
    const levels: LevelEntry[] = [
      { id: 'other', name: 'Other Level' },
      { id: 'riddle', name: 'Riddle Level' },
    ];

    const worldState = createWorldState('Riddle Level');
    const resetToState = vi.fn();
    const populateLevels = vi.fn();
    const setSelectedLevel = vi.fn();
    const setLevelObjective = vi.fn();

    const orchestration = createLevelLoadOrchestration({
      levelControlsElement: document.createElement('div'),
      world: { resetToState },
      outcomeOverlay: { hide: vi.fn() },
      onLevelLoaded: vi.fn(),
      levelsBaseUrl: '/levels',
      manifestUrl: '/levels/manifest.json',
      defaultLevelId: 'riddle',
      createLevelUiFn: () => {
        return {
          populateLevels,
          setSelectedLevel,
          setLevelObjective,
        } as LevelUiHandle;
      },
      fetchLevelManifestFn: vi.fn().mockResolvedValue(levels),
      fetchAndLoadLevelFn: vi.fn().mockResolvedValue(worldState),
    });

    orchestration.initialize();
    await flushPromises();

    expect(populateLevels).toHaveBeenCalledWith([
      { id: 'riddle', name: 'Riddle Level' },
      { id: 'other', name: 'Other Level' },
    ]);
    expect(setSelectedLevel).toHaveBeenCalledWith('riddle');
    expect(resetToState).toHaveBeenCalledWith(worldState);
    expect(setLevelObjective).toHaveBeenCalledWith(
      worldState.levelObjective,
      worldState.levelMetadata.goal,
    );
  });

  it('reloads active level on reset and clears outcome overlay', async () => {
    const callbacksRef: {
      current?: { onLevelSelect: (levelId: string) => void; onReset: () => void };
    } = {};

    const resetToState = vi.fn();
    const hide = vi.fn();
    const onLevelLoaded = vi.fn();
    const fetchAndLoadLevelFn = vi
      .fn()
      .mockResolvedValueOnce(createWorldState('Riddle Level'))
      .mockResolvedValueOnce(createWorldState('Riddle Level Reset'))
      .mockResolvedValueOnce(createWorldState('Riddle Level Reset Again'));

    const orchestration = createLevelLoadOrchestration({
      levelControlsElement: document.createElement('div'),
      world: { resetToState },
      outcomeOverlay: { hide },
      onLevelLoaded,
      levelsBaseUrl: '/levels',
      manifestUrl: '/levels/manifest.json',
      defaultLevelId: 'riddle',
      createLevelUiFn: (_container, callbacks) => {
        callbacksRef.current = callbacks;
        return {
          populateLevels: vi.fn(),
          setSelectedLevel: vi.fn(),
          setLevelObjective: vi.fn(),
        } as LevelUiHandle;
      },
      fetchLevelManifestFn: vi.fn().mockResolvedValue([{ id: 'riddle', name: 'Riddle Level' }]),
      fetchAndLoadLevelFn,
    });

    orchestration.initialize();
    await flushPromises();

    if (!callbacksRef.current) {
      throw new Error('Expected level UI callbacks to be captured.');
    }
    const capturedCallbacks = callbacksRef.current;

    capturedCallbacks.onLevelSelect('riddle');
    await flushPromises();

    capturedCallbacks.onReset();
    await flushPromises();

    expect(fetchAndLoadLevelFn).toHaveBeenNthCalledWith(2, '/levels/riddle.json');
    expect(fetchAndLoadLevelFn).toHaveBeenNthCalledWith(3, '/levels/riddle.json');
    expect(hide).toHaveBeenCalledTimes(2);
    expect(onLevelLoaded).toHaveBeenCalledTimes(2);
  });
});
