import { createLevelUi, type LevelUiHandle } from '../render/levelUi';
import { fetchAndLoadLevel, fetchLevelManifest, type LevelEntry } from '../world/levelLoader';
import type { WorldState } from '../world/types';

export interface LevelLoadOrchestrationDependencies {
  levelControlsElement: HTMLElement;
  world: Pick<{ resetToState: (worldState: WorldState) => void }, 'resetToState'>;
  outcomeOverlay: Pick<{ hide: () => void }, 'hide'>;
  onLevelLoaded: () => void;
  levelsBaseUrl: string;
  manifestUrl: string;
  defaultLevelId: string;
  createLevelUiFn?: (container: HTMLElement, callbacks: LevelUiCallbacks) => LevelUiHandle;
  fetchLevelManifestFn?: (manifestUrl: string) => Promise<LevelEntry[]>;
  fetchAndLoadLevelFn?: (levelUrl: string) => Promise<WorldState>;
  onLoadError?: (message: string, error: unknown) => void;
}

export interface LevelUiCallbacks {
  onLevelSelect(levelId: string): void;
  onReset(): void;
}

export interface LevelLoadOrchestration {
  initialize(): void;
}

export const createLevelLoadOrchestration = (
  dependencies: LevelLoadOrchestrationDependencies,
): LevelLoadOrchestration => {
  const createLevelUiImpl = dependencies.createLevelUiFn ?? createLevelUi;
  const fetchLevelManifestImpl = dependencies.fetchLevelManifestFn ?? fetchLevelManifest;
  const fetchAndLoadLevelImpl = dependencies.fetchAndLoadLevelFn ?? fetchAndLoadLevel;
  const onLoadError =
    dependencies.onLoadError ??
    ((message: string, error: unknown) => {
      console.error(message, error);
    });

  let activeLevelId: string | null = null;

  const levelUi = createLevelUiImpl(dependencies.levelControlsElement, {
    onLevelSelect(levelId: string): void {
      activeLevelId = levelId;
      const levelUrl = `${dependencies.levelsBaseUrl}/${levelId}.json`;
      fetchAndLoadLevelImpl(levelUrl)
        .then((newState) => {
          dependencies.world.resetToState(newState);
          levelUi.setSelectedLevel(levelId);
          levelUi.setLevelObjective(newState.levelObjective, newState.levelMetadata.goal);
          dependencies.outcomeOverlay.hide();
          dependencies.onLevelLoaded();
        })
        .catch((error: unknown) => {
          onLoadError('Failed to load level:', error);
        });
    },

    onReset(): void {
      if (!activeLevelId) {
        return;
      }

      const levelUrl = `${dependencies.levelsBaseUrl}/${activeLevelId}.json`;
      fetchAndLoadLevelImpl(levelUrl)
        .then((newState) => {
          dependencies.world.resetToState(newState);
          levelUi.setLevelObjective(newState.levelObjective, newState.levelMetadata.goal);
          dependencies.outcomeOverlay.hide();
          dependencies.onLevelLoaded();
        })
        .catch((error: unknown) => {
          onLoadError('Failed to reset level:', error);
        });
    },
  });

  const initialize = (): void => {
    fetchLevelManifestImpl(dependencies.manifestUrl)
      .then((levels) => {
        const defaultLevel = levels.find((level) => level.id === dependencies.defaultLevelId) ?? levels[0];

        if (!defaultLevel) {
          levelUi.populateLevels(levels);
          return;
        }

        const orderedLevels = [
          defaultLevel,
          ...levels.filter((level) => level.id !== defaultLevel.id),
        ];
        levelUi.populateLevels(orderedLevels);
        activeLevelId = defaultLevel.id;
        levelUi.setSelectedLevel(defaultLevel.id);
        return fetchAndLoadLevelImpl(`${dependencies.levelsBaseUrl}/${defaultLevel.id}.json`).then(
          (newState) => {
            dependencies.world.resetToState(newState);
            levelUi.setLevelObjective(newState.levelObjective, newState.levelMetadata.goal);
          },
        );
      })
      .catch((error: unknown) => {
        onLoadError('Failed to load level manifest:', error);
      });
  };

  return {
    initialize,
  };
};
