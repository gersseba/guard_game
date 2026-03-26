import { Graphics, Text } from 'pixi.js';
import type { WorldState } from '../world/types';

/**
 * Updates or creates the outcome overlay graphic.
 * Shows a semi-transparent panel with win/lose message when levelOutcome is set.
 * Returns the overlay Graphics object (may be hidden if no outcome).
 */
export const updateOutcomeOverlay = (
  worldState: WorldState,
  canvasWidth: number,
  canvasHeight: number,
): { graphics: Graphics; text: Text } => {
  const overlay = new Graphics();

  if (!worldState.levelOutcome) {
    // No outcome yet, return empty overlay
    return { graphics: overlay, text: new Text() };
  }

  // Draw semi-transparent background panel
  overlay.rect(0, 0, canvasWidth, canvasHeight).fill({ color: 0x000000, alpha: 0.5 });

  // Create outcome message
  const message = worldState.levelOutcome === 'win' ? 'You escaped!' : 'You were captured.';
  const messageColor = worldState.levelOutcome === 'win' ? 0x7ad17a : 0xf26b6b;

  const text = new Text({
    text: message,
    style: {
      fontSize: 48,
      fill: messageColor,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      align: 'center',
    },
  });

  // Center text on canvas
  text.anchor.set(0.5, 0.5);
  text.x = canvasWidth / 2;
  text.y = canvasHeight / 2;

  overlay.addChild(text);

  return { graphics: overlay, text };
};
