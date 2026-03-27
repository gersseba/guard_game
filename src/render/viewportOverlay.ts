export interface ViewportOverlay {
  /** Show the grey overlay and make the viewport inert (blocks focus and pointer events). */
  show(): void;
  /** Hide the overlay and restore the viewport to interactive. */
  hide(): void;
  /** Returns true when the overlay is currently visible. */
  isVisible(): boolean;
}

/**
 * Creates a semi-transparent grey overlay inside the viewport element.
 * When shown, the overlay is rendered on top of the canvas and the viewport
 * receives the `inert` attribute which suppresses all focus and pointer events.
 *
 * Pure DOM manipulation — no game logic.
 */
export function createViewportOverlay(viewportElement: HTMLElement): ViewportOverlay {
  const overlay = document.createElement('div');
  overlay.className = 'viewport-pause-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.hidden = true;
  viewportElement.appendChild(overlay);

  return {
    show(): void {
      overlay.hidden = false;
      viewportElement.setAttribute('inert', '');
    },

    hide(): void {
      overlay.hidden = true;
      viewportElement.removeAttribute('inert');
    },

    isVisible(): boolean {
      return !overlay.hidden;
    },
  };
}
