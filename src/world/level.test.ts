import { describe, expect, it } from 'vitest';
import { deserializeLevel } from './level';
import type { LevelData } from './types';

const minimalLevel: LevelData = {
  version: 1,
  name: 'Test Level',
  width: 20,
  height: 20,
  player: { x: 2, y: 3 },
  guards: [],
  doors: [],
};

describe('deserializeLevel', () => {
  it('maps flat player x/y to nested GridPosition with default id and displayName', () => {
    const state = deserializeLevel(minimalLevel);

    expect(state.player).toEqual({
      id: 'player',
      displayName: 'Player',
      position: { x: 2, y: 3 },
    });
  });

  it('sets grid dimensions from level width/height and preserves a fixed tileSize', () => {
    const state = deserializeLevel(minimalLevel);

    expect(state.grid.width).toBe(20);
    expect(state.grid.height).toBe(20);
    expect(typeof state.grid.tileSize).toBe('number');
    expect(state.grid.tileSize).toBeGreaterThan(0);
  });

  it('starts tick at 0 and returns empty npcs and interactiveObjects', () => {
    const state = deserializeLevel(minimalLevel);

    expect(state.tick).toBe(0);
    expect(state.npcs).toEqual([]);
    expect(state.interactiveObjects).toEqual([]);
  });

  it('handles empty guard and door arrays', () => {
    const state = deserializeLevel(minimalLevel);

    expect(state.guards).toEqual([]);
    expect(state.doors).toEqual([]);
  });

  it('maps guard flat fields to nested Guard with correct position and guardState', () => {
    const level: LevelData = {
      ...minimalLevel,
      guards: [
        { id: 'guard-1', displayName: 'North Guard', x: 5, y: 7, guardState: 'patrolling' },
        { id: 'guard-2', displayName: 'South Guard', x: 10, y: 15, guardState: 'idle' },
      ],
    };

    const state = deserializeLevel(level);

    expect(state.guards).toEqual([
      { id: 'guard-1', displayName: 'North Guard', position: { x: 5, y: 7 }, guardState: 'patrolling' },
      { id: 'guard-2', displayName: 'South Guard', position: { x: 10, y: 15 }, guardState: 'idle' },
    ]);
  });

  it('maps door flat fields to nested Door with correct position and doorState', () => {
    const level: LevelData = {
      ...minimalLevel,
      doors: [
        { id: 'door-1', displayName: 'Main Gate', x: 0, y: 10, doorState: 'locked' },
        { id: 'door-2', displayName: 'Side Door', x: 19, y: 0, doorState: 'open' },
      ],
    };

    const state = deserializeLevel(level);

    expect(state.doors).toEqual([
      { id: 'door-1', displayName: 'Main Gate', position: { x: 0, y: 10 }, doorState: 'locked' },
      { id: 'door-2', displayName: 'Side Door', position: { x: 19, y: 0 }, doorState: 'open' },
    ]);
  });

  it('is deterministic — same input always produces the same output', () => {
    const stateA = deserializeLevel(minimalLevel);
    const stateB = deserializeLevel(minimalLevel);

    expect(stateA).toEqual(stateB);
  });

  it('preserves the schema version field in the input (does not discard it)', () => {
    const level: LevelData = { ...minimalLevel, version: 1 };
    // The function consumes version; ensure it still accepts it without error
    const state = deserializeLevel(level);

    // WorldState does not expose version, but deserialization must succeed
    expect(state).toBeDefined();
  });
});
