import type { LevelEntry } from '../world/levelLoader';

export interface LevelUiCallbacks {
  onLevelSelect(levelId: string): void;
  onReset(): void;
}

export interface LevelUiHandle {
  /** Populate the dropdown with the given levels. Call once manifest is loaded. */
  populateLevels(levels: LevelEntry[]): void;
  /** Reflect the currently active level id in the dropdown (without triggering onLevelSelect). */
  setSelectedLevel(levelId: string): void;
}

/**
 * Creates level selection and reset DOM controls inside the given container.
 * Pure DOM manipulation — no game logic. Returns a handle to push data updates.
 */
export function createLevelUi(container: HTMLElement, callbacks: LevelUiCallbacks): LevelUiHandle {
  const wrapper = document.createElement('div');
  wrapper.className = 'level-ui';

  const label = document.createElement('label');
  label.htmlFor = 'level-select';
  label.textContent = 'Level:';

  const select = document.createElement('select');
  select.id = 'level-select';
  select.disabled = true;

  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = 'No levels available';
  select.appendChild(emptyOption);

  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.textContent = 'Reset';
  resetButton.disabled = true;

  select.addEventListener('change', () => {
    const selectedId = select.value;
    if (selectedId) {
      callbacks.onLevelSelect(selectedId);
    }
  });

  resetButton.addEventListener('click', () => {
    callbacks.onReset();
  });

  wrapper.appendChild(label);
  wrapper.appendChild(select);
  wrapper.appendChild(resetButton);
  container.appendChild(wrapper);

  return {
    populateLevels(levels: LevelEntry[]): void {
      // Remove all existing options.
      while (select.firstChild) {
        select.removeChild(select.firstChild);
      }

      if (levels.length === 0) {
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'No levels available';
        select.appendChild(placeholder);
        select.disabled = true;
        resetButton.disabled = true;
        return;
      }

      for (const level of levels) {
        const option = document.createElement('option');
        option.value = level.id;
        option.textContent = level.name;
        select.appendChild(option);
      }

      select.disabled = false;
      resetButton.disabled = false;
    },

    setSelectedLevel(levelId: string): void {
      select.value = levelId;
    },
  };
}
