import { describe, expect, it, vi } from 'vitest';
import starterJson from '../../public/levels/starter.json';
import { deserializeLevel, validateLevelData } from './level';
import * as spatialRules from './spatialRules';
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
        { id: 'door-1', displayName: 'Main Gate', x: 0, y: 10, doorState: 'locked', outcome: 'safe' },
        { id: 'door-2', displayName: 'Side Door', x: 19, y: 0, doorState: 'open', outcome: 'danger' },
      ],
    };

    const state = deserializeLevel(level);

    expect(state.doors).toEqual([
      { id: 'door-1', displayName: 'Main Gate', position: { x: 0, y: 10 }, doorState: 'locked', outcome: 'safe' },
      { id: 'door-2', displayName: 'Side Door', position: { x: 19, y: 0 }, doorState: 'open', outcome: 'danger' },
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

  it('fails deterministically when an entity is out of bounds', () => {
    const invalid: LevelData = {
      ...minimalLevel,
      guards: [
        {
          id: 'guard-1',
          displayName: 'Out Guard',
          x: 20,
          y: 3,
          guardState: 'idle',
        },
      ],
    };

    expect(() => deserializeLevel(invalid)).toThrowError(
      'Invalid world layout: guard:guard-1 is out of bounds at (20, 3)',
    );
  });

  it('fails deterministically when entities overlap at the same coordinate', () => {
    const invalid: LevelData = {
      ...minimalLevel,
      doors: [
        {
          id: 'door-1',
          displayName: 'Overlap Door',
          x: 2,
          y: 3,
          doorState: 'closed',
          outcome: 'safe',
        },
      ],
    };

    expect(() => deserializeLevel(invalid)).toThrowError(
      'Invalid world layout: overlapping coordinates at (2, 3) between player:player and door:door-1',
    );
  });

  it('uses the shared spatial rules path during level deserialization', () => {
    const validateSpy = vi.spyOn(spatialRules, 'validateSpatialLayout');

    deserializeLevel(minimalLevel);

    expect(validateSpy).toHaveBeenCalledTimes(1);
  });
});

describe('validateLevelData', () => {
  it('returns the input unchanged when all required fields are valid', () => {
    const result = validateLevelData(minimalLevel);
    expect(result).toEqual(minimalLevel);
  });

  it('throws when version is not 1', () => {
    const bad = { ...minimalLevel, version: 2 };
    expect(() => validateLevelData(bad)).toThrowError('version must be 1');
  });

  it('throws when name is an empty string', () => {
    const bad = { ...minimalLevel, name: '' };
    expect(() => validateLevelData(bad)).toThrowError('name must be a non-empty string');
  });

  it('throws when width is zero or negative', () => {
    expect(() => validateLevelData({ ...minimalLevel, width: 0 })).toThrowError('width must be a positive number');
    expect(() => validateLevelData({ ...minimalLevel, width: -5 })).toThrowError('width must be a positive number');
  });

  it('throws when height is zero or negative', () => {
    expect(() => validateLevelData({ ...minimalLevel, height: 0 })).toThrowError('height must be a positive number');
  });

  it('throws when player is missing x or y', () => {
    const bad = { ...minimalLevel, player: { x: 1 } };
    expect(() => validateLevelData(bad)).toThrowError('player must have numeric x and y');
  });

  it('throws when guards is not an array', () => {
    const bad = { ...minimalLevel, guards: null };
    expect(() => validateLevelData(bad)).toThrowError('guards must be an array');
  });

  it('throws when doors is not an array', () => {
    const bad = { ...minimalLevel, doors: 'none' };
    expect(() => validateLevelData(bad)).toThrowError('doors must be an array');
  });

  it('throws when input is not an object', () => {
    expect(() => validateLevelData(null)).toThrowError('expected an object');
    expect(() => validateLevelData('string')).toThrowError('expected an object');
  });
});

describe('starter level', () => {
  const starterRaw: unknown = starterJson;

  it('passes validateLevelData without throwing', () => {
    expect(() => validateLevelData(starterRaw)).not.toThrow();
  });

  it('deserializes to a WorldState with two guards and two doors', () => {
    const level = validateLevelData(starterRaw);
    const state = deserializeLevel(level);

    expect(state.guards).toHaveLength(2);
    expect(state.doors).toHaveLength(2);
  });

  it('places the player at (10, 10)', () => {
    const level = validateLevelData(starterRaw);
    const state = deserializeLevel(level);

    expect(state.player.position).toEqual({ x: 10, y: 10 });
  });

  it('has a 20×20 grid', () => {
    const level = validateLevelData(starterRaw);
    const state = deserializeLevel(level);

    expect(state.grid.width).toBe(20);
    expect(state.grid.height).toBe(20);
  });

  it('all guards start in patrolling state and all doors start closed', () => {
    const level = validateLevelData(starterRaw);
    const state = deserializeLevel(level);

    for (const guard of state.guards) {
      expect(guard.guardState).toBe('patrolling');
    }
    for (const door of state.doors) {
      expect(door.doorState).toBe('closed');
    }
  });

  it('guard ids and door ids match expected descriptive values', () => {
    const level = validateLevelData(starterRaw);
    const state = deserializeLevel(level);

    expect(state.guards.map((g) => g.id)).toEqual(['guard-1', 'guard-2']);
    expect(state.doors.map((d) => d.id)).toEqual(['door-1', 'door-2']);
  });
});

describe('honestyTrait field', () => {
  it('accepts guards with honestyTrait: "truth-teller"', () => {
    const level: LevelData = {
      ...minimalLevel,
      guards: [{ id: 'guard-1', displayName: 'Truthful', x: 5, y: 7, guardState: 'idle', honestyTrait: 'truth-teller' }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevel(validated);

    expect(state.guards[0].honestyTrait).toBe('truth-teller');
  });

  it('accepts guards with honestyTrait: "liar"', () => {
    const level: LevelData = {
      ...minimalLevel,
      guards: [{ id: 'guard-1', displayName: 'Lying', x: 5, y: 7, guardState: 'idle', honestyTrait: 'liar' }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevel(validated);

    expect(state.guards[0].honestyTrait).toBe('liar');
  });

  it('accepts guards without honestyTrait field', () => {
    const level: LevelData = {
      ...minimalLevel,
      guards: [{ id: 'guard-1', displayName: 'Unknown', x: 5, y: 7, guardState: 'idle' }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevel(validated);

    expect(state.guards[0].honestyTrait).toBeUndefined();
  });

  it('rejects guards with invalid honestyTrait value', () => {
    const bad = {
      ...minimalLevel,
      guards: [{ id: 'guard-1', displayName: 'Bad', x: 5, y: 7, guardState: 'idle', honestyTrait: 'dishonest' as unknown }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 2, y: 3, doorState: 'open', outcome: 'safe' }],
    };

    expect(() => validateLevelData(bad)).toThrowError('invalid honestyTrait');
  });
});

describe('outcome field', () => {
  it('accepts doors with outcome: "safe"', () => {
    const level: LevelData = {
      ...minimalLevel,
      doors: [{ id: 'door-1', displayName: 'Safe', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevel(validated);

    expect(state.doors[0].outcome).toBe('safe');
  });

  it('accepts doors with outcome: "danger"', () => {
    const level: LevelData = {
      ...minimalLevel,
      doors: [{ id: 'door-1', displayName: 'Danger', x: 0, y: 10, doorState: 'open', outcome: 'danger' }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevel(validated);

    expect(state.doors[0].outcome).toBe('danger');
  });

  it('rejects doors without outcome field', () => {
    const bad = {
      ...minimalLevel,
      doors: [{ id: 'door-1', displayName: 'No outcome', x: 0, y: 10, doorState: 'open' }],
    };

    expect(() => validateLevelData(bad)).toThrowError('must have id, displayName, x, y, doorState, and outcome');
  });

  it('rejects doors with invalid outcome value', () => {
    const bad = {
      ...minimalLevel,
      doors: [{ id: 'door-1', displayName: 'Bad', x: 0, y: 10, doorState: 'open', outcome: 'unclear' }],
    };

    expect(() => validateLevelData(bad)).toThrowError('invalid outcome');
  });
});

describe('levelOutcome field', () => {
  it('initializes to null when level is deserialized', () => {
    const level: LevelData = {
      ...minimalLevel,
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    const state = deserializeLevel(validateLevelData(level));

    expect(state.levelOutcome).toBeNull();
  });
});

