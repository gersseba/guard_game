import type { LevelMetadata } from '../world/types';

export interface LevelBriefingHandle {
  render(levelMetadata: LevelMetadata): void;
}

/**
 * Creates a right-side panel that shows active level premise and goal.
 * Presentation-only component with idempotent updates.
 */
export const createLevelBriefingPanel = (container: HTMLElement): LevelBriefingHandle => {
  const wrapper = document.createElement('div');
  wrapper.className = 'guard-game-briefing';

  const premiseHeading = document.createElement('h3');
  premiseHeading.className = 'guard-game-briefing-label';
  premiseHeading.textContent = 'Premise';

  const premiseContent = document.createElement('p');
  premiseContent.className = 'guard-game-briefing-copy';

  const goalHeading = document.createElement('h3');
  goalHeading.className = 'guard-game-briefing-label';
  goalHeading.textContent = 'Goal';

  const goalContent = document.createElement('p');
  goalContent.className = 'guard-game-briefing-copy';

  wrapper.appendChild(premiseHeading);
  wrapper.appendChild(premiseContent);
  wrapper.appendChild(goalHeading);
  wrapper.appendChild(goalContent);
  container.appendChild(wrapper);

  return {
    render(levelMetadata: LevelMetadata): void {
      premiseContent.textContent = levelMetadata.premise;
      goalContent.textContent = levelMetadata.goal;
    },
  };
};