// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import riddleJson from '../../public/levels/riddle.json';
import { deserializeLevel, validateLevelData } from '../world/level';
import { createLevelBriefingPanel } from './levelBriefing';
import { createBodyContainer } from '../test-support/dom';

describe('createLevelBriefingPanel', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createBodyContainer();
  });

  it('renders premise and goal labels with metadata content from world state', () => {
    const panel = createLevelBriefingPanel(container);
    const riddleWorldState = deserializeLevel(validateLevelData(riddleJson));

    panel.render(riddleWorldState.levelMetadata);

    const labels = Array.from(container.querySelectorAll('.guard-game-briefing-label')).map((node) =>
      node.textContent?.trim(),
    );
    const copy = Array.from(container.querySelectorAll('.guard-game-briefing-copy')).map((node) =>
      node.textContent?.trim(),
    );

    expect(labels).toEqual(['Premise', 'Goal']);
    expect(copy).toEqual([
      riddleWorldState.levelMetadata.premise,
      riddleWorldState.levelMetadata.goal,
    ]);
  });

  it('updates panel content when active level metadata changes', () => {
    const panel = createLevelBriefingPanel(container);
    const updatedWorldState = deserializeLevel(
      validateLevelData({
        ...riddleJson,
        name: 'Two Guards Redux',
        premise: 'A refreshed premise.',
        goal: 'A refreshed goal.',
      }),
    );
    const riddleWorldState = deserializeLevel(validateLevelData(riddleJson));

    panel.render(riddleWorldState.levelMetadata);
    panel.render(updatedWorldState.levelMetadata);

    const copy = Array.from(container.querySelectorAll('.guard-game-briefing-copy')).map((node) =>
      node.textContent?.trim(),
    );

    expect(copy).toEqual([
      updatedWorldState.levelMetadata.premise,
      updatedWorldState.levelMetadata.goal,
    ]);
    expect(container.textContent).not.toContain(riddleWorldState.levelMetadata.premise);
    expect(container.textContent).not.toContain(riddleWorldState.levelMetadata.goal);
  });
});
