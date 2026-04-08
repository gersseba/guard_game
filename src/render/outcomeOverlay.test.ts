// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { createOutcomeOverlay } from './outcomeOverlay';
import { createBodyContainer } from '../test-support/dom';

describe('createOutcomeOverlay', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = createBodyContainer();
  });

  it('shows and hides the overlay lifecycle correctly', () => {
    const overlay = createOutcomeOverlay(container);

    expect(container.children).toHaveLength(0);

    overlay.show('win');
    expect(container.children).toHaveLength(1);

    overlay.hide();
    expect(container.children).toHaveLength(0);
  });

  it('renders win and lose specific messages', () => {
    const overlay = createOutcomeOverlay(container);

    overlay.show('win');
    const winText = container.textContent ?? '';
    expect(winText).toContain('You Won!');
    overlay.hide();

    overlay.show('lose');
    const loseText = container.textContent ?? '';
    expect(loseText).toContain('You Lost!');
  });

  it('is idempotent when show is called repeatedly and cleans up on hide', () => {
    const overlay = createOutcomeOverlay(container);

    overlay.show('win');
    const firstEl = container.firstElementChild;

    overlay.show('lose');
    expect(container.children).toHaveLength(1);
    expect(container.firstElementChild).toBe(firstEl);
    expect(container.textContent ?? '').toContain('You Won!');

    overlay.hide();
    expect(container.children).toHaveLength(0);

    overlay.hide();
    expect(container.children).toHaveLength(0);
  });
});
