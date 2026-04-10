import { describe, expect, it } from 'vitest';
import { handleDoorInteraction } from './doorInteraction';
import type { Door, Player } from '../world/types';

const player: Player = {
  id: 'player-1',
  displayName: 'Hero',
  position: { x: 1, y: 1 },
  inventory: {
    items: [],
  },
};

const makeDoor = (
  state: { isOpen: boolean; isLocked: boolean },
  options?: { isSafe?: Door['isSafe'] },
): Door => ({
  id: 'door-1',
  displayName: 'Main Door',
  position: { x: 3, y: 1 },
  isOpen: state.isOpen,
  isLocked: state.isLocked,
  ...(options?.isSafe !== undefined ? { isSafe: options.isSafe } : {}),
});

describe('handleDoorInteraction', () => {
  it('returns open text when door is open', () => {
    const result = handleDoorInteraction({ door: makeDoor({ isOpen: true, isLocked: false }), player });
    expect(result.doorId).toBe('door-1');
    expect(result.responseText).toBe('The door is open.');
  });

  it('returns closed text when door is closed', () => {
    const result = handleDoorInteraction({ door: makeDoor({ isOpen: false, isLocked: false }), player });
    expect(result.doorId).toBe('door-1');
    expect(result.responseText).toBe('The door is closed.');
  });

  it('returns locked text when door is locked', () => {
    const result = handleDoorInteraction({ door: makeDoor({ isOpen: false, isLocked: true }), player });
    expect(result.doorId).toBe('door-1');
    expect(result.responseText).toBe('The door is locked.');
  });

  it('returns deterministic output for same input', () => {
    const door = makeDoor({ isOpen: false, isLocked: false });
    const first = handleDoorInteraction({ door, player });
    const second = handleDoorInteraction({ door, player });
    expect(first).toEqual(second);
  });

  it('returns "win" outcome when door has isSafe=true', () => {
    const door = makeDoor({ isOpen: true, isLocked: false }, { isSafe: true });
    const result = handleDoorInteraction({ door, player });

    expect(result.doorId).toBe('door-1');
    expect(result.levelOutcome).toBe('win');
  });

  it('returns "lose" outcome when door has isSafe=false', () => {
    const door = makeDoor({ isOpen: true, isLocked: false }, { isSafe: false });
    const result = handleDoorInteraction({ door, player });

    expect(result.doorId).toBe('door-1');
    expect(result.levelOutcome).toBe('lose');
  });

  it('does not include levelOutcome when door lacks isSafe field', () => {
    const door = makeDoor({ isOpen: true, isLocked: false });
    const result = handleDoorInteraction({ door, player });

    expect(result.doorId).toBe('door-1');
    expect(result.levelOutcome).toBeUndefined();
  });
});
