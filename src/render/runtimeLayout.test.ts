import { describe, expect, it } from 'vitest';
import { getRuntimeLayoutMarkup } from './runtimeLayout';

describe('runtime layout markup', () => {
  it('places viewport in the primary area', () => {
    const markup = getRuntimeLayoutMarkup();

    expect(markup).toContain('class="guard-game-primary"');
    expect(markup).toContain('id="viewport"');

    const viewportIndex = markup.indexOf('id="viewport"');
    const primaryIndex = markup.indexOf('class="guard-game-primary"');
    const secondaryIndex = markup.indexOf('class="guard-game-secondary"');

    expect(primaryIndex).toBeGreaterThanOrEqual(0);
    expect(secondaryIndex).toBeGreaterThan(primaryIndex);
    expect(viewportIndex).toBeGreaterThan(primaryIndex);
    expect(viewportIndex).toBeLessThan(secondaryIndex);
  });

  it('places level controls and world state below the primary area', () => {
    const markup = getRuntimeLayoutMarkup();

    const levelControlsIndex = markup.indexOf('id="level-controls"');
    const worldStateIndex = markup.indexOf('id="world-state"');
    const secondaryIndex = markup.indexOf('class="guard-game-secondary"');

    expect(levelControlsIndex).toBeGreaterThan(secondaryIndex);
    expect(worldStateIndex).toBeGreaterThan(levelControlsIndex);
  });

  it('includes a right-side level briefing target in the primary area', () => {
    const markup = getRuntimeLayoutMarkup();

    expect(markup).toContain('id="level-briefing"');
    expect(markup).toContain('id="inventory-panel"');

    const primaryIndex = markup.indexOf('class="guard-game-primary"');
    const briefingIndex = markup.indexOf('id="level-briefing"');
    const inventoryIndex = markup.indexOf('id="inventory-panel"');
    const secondaryIndex = markup.indexOf('class="guard-game-secondary"');

    expect(primaryIndex).toBeGreaterThanOrEqual(0);
    expect(briefingIndex).toBeGreaterThan(primaryIndex);
    expect(inventoryIndex).toBeGreaterThan(briefingIndex);
    expect(briefingIndex).toBeLessThan(secondaryIndex);
    expect(inventoryIndex).toBeLessThan(secondaryIndex);
  });

  it('renders world state inside a collapsed details container by default', () => {
    const markup = getRuntimeLayoutMarkup();

    expect(markup).toContain('class="guard-game-world-state-details"');
    expect(markup).toContain('class="guard-game-world-state-summary"');
    expect(markup).not.toContain('class="guard-game-world-state-details" open');
  });

  it('includes a chat modal host element', () => {
    const markup = getRuntimeLayoutMarkup();

    expect(markup).toContain('id="chat-modal-host"');
  });

  it('includes action and inventory overlay hosts', () => {
    const markup = getRuntimeLayoutMarkup();

    expect(markup).toContain('id="action-modal-host"');
    expect(markup).toContain('id="inventory-overlay-host"');
  });
});