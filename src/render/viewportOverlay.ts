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

  let visible = false;

  const blockFocus = (event: FocusEvent): void => {
    if (!visible) {
      return;
    }

    const target = event.target;
    if (target instanceof HTMLElement) {
      target.blur();
    }

    event.stopImmediatePropagation();
  };

  const blockPointerInteraction = (event: Event): void => {
    if (!visible) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  };

  viewportElement.addEventListener('focusin', blockFocus, true);

  for (const eventName of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click']) {
    viewportElement.addEventListener(eventName, blockPointerInteraction, true);
  }

  return {
    show(): void {
      visible = true;
      overlay.hidden = false;
      viewportElement.setAttribute('inert', '');
    },

    hide(): void {
      visible = false;
      overlay.hidden = true;
      viewportElement.removeAttribute('inert');
    },

    isVisible(): boolean {
      return visible;
    },
  };
}
