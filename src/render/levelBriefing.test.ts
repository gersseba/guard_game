// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import riddleJson from '../../public/levels/riddle.json';
import { parseLayoutText } from '../world/layout';
import { deserializeLevel, validateLevelData } from '../world/level';
import { createLevelBriefingPanel } from './levelBriefing';
import { createBodyContainer } from '../test-support/dom';

const riddleLayoutText = readFileSync('public/levels/riddle.layout.txt', 'utf8');
const riddleLayout = parseLayoutText(riddleLayoutText);

const createWorldStateFromLevelData = (levelData: unknown) =>
  deserializeLevel(
    validateLevelData(levelData, {
      width: riddleLayout.width,
      height: riddleLayout.height,
    }),
    riddleLayout,
  );

describe('createLevelBriefingPanel', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createBodyContainer();
  });

  it('renders premise and goal labels with metadata content from world state', () => {
    const panel = createLevelBriefingPanel(container);
    const riddleWorldState = createWorldStateFromLevelData(riddleJson);

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
    const updatedWorldState = createWorldStateFromLevelData({
      ...riddleJson,
      name: 'Two Guards Redux',
      premise: 'A refreshed premise.',
      goal: 'A refreshed goal.',
    });
    const riddleWorldState = createWorldStateFromLevelData(riddleJson);

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
