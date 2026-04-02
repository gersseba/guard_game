// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import riddleJson from '../../public/levels/riddle.json';
import starterJson from '../../public/levels/starter.json';
import { deserializeLevel, validateLevelData } from '../world/level';
import { createLevelBriefingPanel } from './levelBriefing';

describe('createLevelBriefingPanel', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders premise and goal labels with metadata content from world state', () => {
    const panel = createLevelBriefingPanel(container);
    const starterWorldState = deserializeLevel(validateLevelData(starterJson));

    panel.render(starterWorldState.levelMetadata);

    const labels = Array.from(container.querySelectorAll('.guard-game-briefing-label')).map((node) =>
      node.textContent?.trim(),
    );
    const copy = Array.from(container.querySelectorAll('.guard-game-briefing-copy')).map((node) =>
      node.textContent?.trim(),
    );

    expect(labels).toEqual(['Premise', 'Goal']);
    expect(copy).toEqual([
      starterWorldState.levelMetadata.premise,
      starterWorldState.levelMetadata.goal,
    ]);
  });

  it('updates panel content when active level metadata changes', () => {
    const panel = createLevelBriefingPanel(container);
    const starterWorldState = deserializeLevel(validateLevelData(starterJson));
    const riddleWorldState = deserializeLevel(validateLevelData(riddleJson));

    panel.render(starterWorldState.levelMetadata);
    panel.render(riddleWorldState.levelMetadata);

    const copy = Array.from(container.querySelectorAll('.guard-game-briefing-copy')).map((node) =>
      node.textContent?.trim(),
    );

    expect(copy).toEqual([
      riddleWorldState.levelMetadata.premise,
      riddleWorldState.levelMetadata.goal,
    ]);
    expect(container.textContent).not.toContain(starterWorldState.levelMetadata.premise);
    expect(container.textContent).not.toContain(starterWorldState.levelMetadata.goal);
  });
});
