export interface OutcomeOverlay {
  show(outcome: 'win' | 'lose'): void;
  hide(): void;
}

/**
 * Creates a full-screen DOM overlay that shows a win or lose message.
 * Pure DOM component — no game logic.
 */
export const createOutcomeOverlay = (container: HTMLElement): OutcomeOverlay => {
  let overlayEl: HTMLElement | null = null;

  return {
    show(outcome: 'win' | 'lose'): void {
      if (overlayEl) return; // Already shown — idempotent.

      const el = document.createElement('div');
      const bg = outcome === 'win' ? 'rgba(0,120,0,0.93)' : 'rgba(160,0,0,0.93)';
      el.style.cssText =
        `position:fixed;inset:0;display:flex;align-items:center;justify-content:center;` +
        `font-family:Arial,sans-serif;font-size:2.5rem;font-weight:bold;color:#fff;` +
        `z-index:9999;background:${bg};text-align:center;padding:2rem;`;
      el.textContent =
        outcome === 'win'
          ? 'You Won! 🎉 Refresh to play again.'
          : 'You Lost! 💀 Refresh to play again.';
      container.appendChild(el);
      overlayEl = el;
    },

    hide(): void {
      if (overlayEl) {
        container.removeChild(overlayEl);
        overlayEl = null;
      }
    },
  };
};
