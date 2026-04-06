// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLevelUi } from './levelUi';

describe('createLevelUi', () => {
  let container: HTMLDivElement;
  const onLevelSelect = vi.fn();
  const onReset = vi.fn();

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    onLevelSelect.mockReset();
    onReset.mockReset();
  });

  it('starts disabled with an empty placeholder option', () => {
    createLevelUi(container, { onLevelSelect, onReset });

    const select = container.querySelector<HTMLSelectElement>('#level-select');
    const resetButton = container.querySelector<HTMLButtonElement>('button');

    expect(select).not.toBeNull();
    expect(select?.disabled).toBe(true);
    expect(select?.options).toHaveLength(1);
    expect(select?.options[0]?.value).toBe('');
    expect(select?.options[0]?.textContent).toBe('No levels available');

    expect(resetButton).not.toBeNull();
    expect(resetButton?.disabled).toBe(true);

    const objectiveSection = container.querySelector<HTMLElement>('.level-ui-objective-title')?.parentElement;
    expect(objectiveSection?.hidden).toBe(true);
  });

  it('keeps controls disabled when populated with an empty level list', () => {
    const handle = createLevelUi(container, { onLevelSelect, onReset });

    handle.populateLevels([]);

    const select = container.querySelector<HTMLSelectElement>('#level-select');
    const resetButton = container.querySelector<HTMLButtonElement>('button');

    expect(select?.disabled).toBe(true);
    expect(resetButton?.disabled).toBe(true);
    expect(select?.options).toHaveLength(1);
    expect(select?.options[0]?.value).toBe('');
    expect(select?.options[0]?.textContent).toBe('No levels available');
  });

  it('populates levels and enables controls for non-empty lists', () => {
    const handle = createLevelUi(container, { onLevelSelect, onReset });

    handle.populateLevels([
      { id: 'starter', name: 'Starter' },
      { id: 'riddle', name: 'Riddle' },
    ]);

    const select = container.querySelector<HTMLSelectElement>('#level-select');
    const resetButton = container.querySelector<HTMLButtonElement>('button');

    expect(select?.disabled).toBe(false);
    expect(resetButton?.disabled).toBe(false);
    expect(select?.options).toHaveLength(2);
    expect(select?.options[0]?.value).toBe('starter');
    expect(select?.options[0]?.textContent).toBe('Starter');
    expect(select?.options[1]?.value).toBe('riddle');
    expect(select?.options[1]?.textContent).toBe('Riddle');
  });

  it('fires callbacks for level selection and reset', () => {
    const handle = createLevelUi(container, { onLevelSelect, onReset });
    handle.populateLevels([{ id: 'starter', name: 'Starter' }]);

    const select = container.querySelector<HTMLSelectElement>('#level-select');
    const resetButton = container.querySelector<HTMLButtonElement>('button');

    if (!select || !resetButton) {
      throw new Error('Expected level UI controls to exist');
    }

    select.value = 'starter';
    select.dispatchEvent(new Event('change'));
    resetButton.click();

    expect(onLevelSelect).toHaveBeenCalledWith('starter');
    expect(onLevelSelect).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('updates selected level without triggering onLevelSelect', () => {
    const handle = createLevelUi(container, { onLevelSelect, onReset });
    handle.populateLevels([
      { id: 'starter', name: 'Starter' },
      { id: 'riddle', name: 'Riddle' },
    ]);

    handle.setSelectedLevel('riddle');

    const select = container.querySelector<HTMLSelectElement>('#level-select');
    expect(select?.value).toBe('riddle');
    expect(onLevelSelect).not.toHaveBeenCalled();
  });

  it('shows objective text when it differs from the level goal', () => {
    const handle = createLevelUi(container, { onLevelSelect, onReset });

    handle.setLevelObjective('Talk to both guards and pick the safe door.', 'Choose the correct door.');
    const objectiveText = container.querySelector<HTMLElement>('.level-ui-objective-text');
    const objectiveSection = container.querySelector<HTMLElement>('.level-ui-objective-title')?.parentElement;

    expect(objectiveSection?.hidden).toBe(false);
    expect(objectiveText?.textContent).toBe('Talk to both guards and pick the safe door.');
  });

  it('hides objective text when it duplicates the level goal', () => {
    const handle = createLevelUi(container, { onLevelSelect, onReset });

    handle.setLevelObjective('Reach the west door.', 'Reach the west door.');
    const objectiveText = container.querySelector<HTMLElement>('.level-ui-objective-text');
    const objectiveSection = container.querySelector<HTMLElement>('.level-ui-objective-title')?.parentElement;

    expect(objectiveSection?.hidden).toBe(true);
    expect(objectiveText?.textContent).toBe('');
  });
});
