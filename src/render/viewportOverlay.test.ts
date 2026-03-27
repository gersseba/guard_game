// @vitest-environment jsdom
import { describe, beforeEach, expect, it } from 'vitest';
import { createViewportOverlay } from './viewportOverlay';

const makeViewport = (): HTMLDivElement => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
};

describe('createViewportOverlay', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('starts hidden and viewport is not inert', () => {
    const viewport = makeViewport();
    const overlay = createViewportOverlay(viewport);

    expect(overlay.isVisible()).toBe(false);
    expect(viewport.hasAttribute('inert')).toBe(false);
  });

  it('appends a .viewport-pause-overlay child inside the viewport', () => {
    const viewport = makeViewport();
    createViewportOverlay(viewport);

    expect(viewport.querySelector('.viewport-pause-overlay')).not.toBeNull();
  });

  it('overlay DOM element is hidden before show()', () => {
    const viewport = makeViewport();
    createViewportOverlay(viewport);

    const overlayEl = viewport.querySelector<HTMLElement>('.viewport-pause-overlay');
    expect(overlayEl?.hidden).toBe(true);
  });

  it('show() makes the overlay visible', () => {
    const viewport = makeViewport();
    const handle = createViewportOverlay(viewport);

    handle.show();

    expect(handle.isVisible()).toBe(true);
    const overlayEl = viewport.querySelector<HTMLElement>('.viewport-pause-overlay');
    expect(overlayEl?.hidden).toBe(false);
  });

  it('show() sets the inert attribute on the viewport element', () => {
    const viewport = makeViewport();
    const handle = createViewportOverlay(viewport);

    handle.show();

    expect(viewport.hasAttribute('inert')).toBe(true);
  });

  it('hide() hides the overlay and removes inert from the viewport', () => {
    const viewport = makeViewport();
    const handle = createViewportOverlay(viewport);
    handle.show();

    handle.hide();

    expect(handle.isVisible()).toBe(false);
    expect(viewport.hasAttribute('inert')).toBe(false);
    const overlayEl = viewport.querySelector<HTMLElement>('.viewport-pause-overlay');
    expect(overlayEl?.hidden).toBe(true);
  });
});

