import type { WorldState } from './world-state.js';

export type WorldCommand =
  | {
      type: 'move';
      dx: number;
      dy: number;
    }
  | {
      type: 'interact';
    }
  | {
      type: 'selectInventorySlot';
      slotIndex: number;
    }
  | {
      type: 'useSelectedItem';
    };

export type IntentType = 'move' | 'wait' | 'interact';

/**
 * Represents an action requested by any actor (player, NPC, scripted).
 * Intent is decoupled from input source (keyboard, LLM, etc.).
 * Deterministically resolved by resolveIntent() function.
 */
export interface Intent {
  actorId: string;
  type: IntentType;
  payload?: {
    direction?: 'up' | 'down' | 'left' | 'right';
    targetId?: string;
    // Support arbitrary delta movement for backward compatibility during transition.
    // Preferred path uses direction; delta is fallback for legacy movement vectors.
    delta?: { dx: number; dy: number };
  };
}

export interface World {
  getState(): WorldState;
  applyCommands(commands: WorldCommand[]): void;
  resetToState(state: WorldState): void;
}
