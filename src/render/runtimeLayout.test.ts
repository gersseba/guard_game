import { describe, expect, it } from 'vitest';
import { getRuntimeLayoutMarkup } from './runtimeLayout';

describe('runtime layout markup', () => {
  it('places viewport and interaction in the primary two-column area', () => {
    const markup = getRuntimeLayoutMarkup();

    expect(markup).toContain('class="guard-game-primary"');
    expect(markup).toContain('id="viewport"');
    expect(markup).toContain('id="interaction-log"');

    const viewportIndex = markup.indexOf('id="viewport"');
    const interactionIndex = markup.indexOf('id="interaction-log"');
    const primaryIndex = markup.indexOf('class="guard-game-primary"');
    const secondaryIndex = markup.indexOf('class="guard-game-secondary"');

    expect(primaryIndex).toBeGreaterThanOrEqual(0);
    expect(secondaryIndex).toBeGreaterThan(primaryIndex);
    expect(viewportIndex).toBeGreaterThan(primaryIndex);
    expect(interactionIndex).toBeGreaterThan(viewportIndex);
    expect(interactionIndex).toBeLessThan(secondaryIndex);
  });

  it('places level controls and world state below the primary area', () => {
    const markup = getRuntimeLayoutMarkup();

    const levelControlsIndex = markup.indexOf('id="level-controls"');
    const worldStateIndex = markup.indexOf('id="world-state"');
    const secondaryIndex = markup.indexOf('class="guard-game-secondary"');

    expect(levelControlsIndex).toBeGreaterThan(secondaryIndex);
    expect(worldStateIndex).toBeGreaterThan(levelControlsIndex);
  });
});
