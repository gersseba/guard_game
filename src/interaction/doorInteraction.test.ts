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

const makeDoor = (doorState: Door['doorState'], outcome?: Door['outcome']): Door => ({
  id: 'door-1',
  displayName: 'Main Door',
  position: { x: 3, y: 1 },
  doorState,
  outcome,
});

describe('handleDoorInteraction', () => {
  it('returns open text when door is open', () => {
    const result = handleDoorInteraction({ door: makeDoor('open'), player });
    expect(result.doorId).toBe('door-1');
    expect(result.responseText).toBe('The door is open.');
  });

  it('returns closed text when door is closed', () => {
    const result = handleDoorInteraction({ door: makeDoor('closed'), player });
    expect(result.doorId).toBe('door-1');
    expect(result.responseText).toBe('The door is closed.');
  });

  it('returns locked text when door is locked', () => {
    const result = handleDoorInteraction({ door: makeDoor('locked'), player });
    expect(result.doorId).toBe('door-1');
    expect(result.responseText).toBe('The door is locked.');
  });

  it('returns deterministic output for same input', () => {
    const door = makeDoor('closed');
    const first = handleDoorInteraction({ door, player });
    const second = handleDoorInteraction({ door, player });
    expect(first).toEqual(second);
  });

  it('returns "win" outcome when door has outcome: "safe"', () => {
    const door = makeDoor('open', 'safe');
    const result = handleDoorInteraction({ door, player });

    expect(result.doorId).toBe('door-1');
    expect(result.levelOutcome).toBe('win');
  });

  it('returns "lose" outcome when door has outcome: "danger"', () => {
    const door = makeDoor('open', 'danger');
    const result = handleDoorInteraction({ door, player });

    expect(result.doorId).toBe('door-1');
    expect(result.levelOutcome).toBe('lose');
  });

  it('does not include levelOutcome when door lacks outcome field', () => {
    const door = makeDoor('open', undefined);
    const result = handleDoorInteraction({ door, player });

    expect(result.doorId).toBe('door-1');
    expect(result.levelOutcome).toBeUndefined();
  });
});
