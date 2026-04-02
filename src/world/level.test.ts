import { describe, expect, it, vi } from 'vitest';
import starterJson from '../../public/levels/starter.json';
import { deserializeLevel, validateLevelData } from './level';
import * as spatialRules from './spatialRules';
import type { LevelData } from './types';

const minimalLevel: LevelData = {
  version: 1,
  name: 'Test Level',
  premise: 'A deterministic test premise.',
  goal: 'Reach the safe test door.',
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
      inventory: {
        items: [],
      },
      facingDirection: 'front',
    });
  });

  it('maps optional player spriteAssetPath when configured', () => {
    const state = deserializeLevel({
      ...minimalLevel,
      player: { x: 2, y: 3, spriteAssetPath: '/assets/medieval_player_town_guard.svg' },
    });

    expect(state.player.spriteAssetPath).toBe('/assets/medieval_player_town_guard.svg');
  });

  it('maps optional player spriteSet when configured', () => {
    const state = deserializeLevel({
      ...minimalLevel,
      player: {
        x: 2,
        y: 3,
        spriteSet: {
          default: '/assets/medieval_player_farmer_front.svg',
          front: '/assets/medieval_player_farmer_front.svg',
          away: '/assets/medieval_player_farmer_away.svg',
        },
      },
    });

    expect(state.player.spriteSet).toEqual({
      default: '/assets/medieval_player_farmer_front.svg',
      front: '/assets/medieval_player_farmer_front.svg',
      away: '/assets/medieval_player_farmer_away.svg',
    });
  });

  it('sets grid dimensions from level width/height and preserves a fixed tileSize', () => {
    const state = deserializeLevel(minimalLevel);

    expect(state.grid.width).toBe(20);
    expect(state.grid.height).toBe(20);
    expect(typeof state.grid.tileSize).toBe('number');
    expect(state.grid.tileSize).toBeGreaterThan(0);
  });

  it('maps level premise and goal into serializable world metadata', () => {
    const state = deserializeLevel(minimalLevel);

    expect(state.levelMetadata).toEqual({
      name: 'Test Level',
      premise: 'A deterministic test premise.',
      goal: 'Reach the safe test door.',
    });

    const roundTrip = JSON.parse(JSON.stringify(state)) as typeof state;
    expect(roundTrip.levelMetadata.premise).toBe('A deterministic test premise.');
    expect(roundTrip.levelMetadata.goal).toBe('Reach the safe test door.');
  });

  it('starts tick at 0 and returns empty npcs and interactiveObjects', () => {
    const state = deserializeLevel(minimalLevel);

    expect(state.tick).toBe(0);
    expect(state.levelObjective).toBe('Reach the exit.');
    expect(state.npcs).toEqual([]);
    expect(state.interactiveObjects).toEqual([]);
    expect(state.player.inventory.items).toEqual([]);
  });

  it('keeps player inventory JSON-serializable after deserialization', () => {
    const state = deserializeLevel(minimalLevel);

    const roundTrip = JSON.parse(JSON.stringify(state)) as typeof state;
    expect(roundTrip.player.inventory.items).toEqual([]);
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

  it('maps optional guard spriteAssetPath when configured', () => {
    const state = deserializeLevel({
      ...minimalLevel,
      guards: [
        {
          id: 'guard-1',
          displayName: 'North Guard',
          x: 5,
          y: 7,
          guardState: 'patrolling',
          spriteAssetPath: '/assets/medieval_guard_spear.svg',
        },
      ],
    });

    expect(state.guards[0].spriteAssetPath).toBe('/assets/medieval_guard_spear.svg');
  });

  it('maps optional guard spriteSet when configured', () => {
    const state = deserializeLevel({
      ...minimalLevel,
      guards: [
        {
          id: 'guard-1',
          displayName: 'North Guard',
          x: 5,
          y: 7,
          guardState: 'patrolling',
          spriteSet: {
            default: '/assets/medieval_guard_shield_spear_front.svg',
            front: '/assets/medieval_guard_shield_spear_front.svg',
            away: '/assets/medieval_guard_shield_spear_away.svg',
          },
        },
      ],
    });

    expect(state.guards[0].spriteSet).toEqual({
      default: '/assets/medieval_guard_shield_spear_front.svg',
      front: '/assets/medieval_guard_shield_spear_front.svg',
      away: '/assets/medieval_guard_shield_spear_away.svg',
    });
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

  it('maps optional door spriteSet when configured', () => {
    const state = deserializeLevel({
      ...minimalLevel,
      doors: [
        {
          id: 'door-1',
          displayName: 'Main Gate',
          x: 0,
          y: 10,
          doorState: 'closed',
          outcome: 'safe',
          spriteSet: {
            default: '/assets/medieval_door_wooden_closed.svg',
          },
        },
      ],
    });

    expect(state.doors[0].spriteSet).toEqual({
      default: '/assets/medieval_door_wooden_closed.svg',
    });
  });

  it('keeps spriteSet data JSON-serializable in deserialized world state', () => {
    const state = deserializeLevel({
      ...minimalLevel,
      player: {
        x: 2,
        y: 3,
        spriteSet: {
          default: '/assets/medieval_player_farmer_front.svg',
          front: '/assets/medieval_player_farmer_front.svg',
        },
      },
      doors: [
        {
          id: 'door-1',
          displayName: 'Main Gate',
          x: 0,
          y: 10,
          doorState: 'closed',
          outcome: 'safe',
          spriteSet: {
            default: '/assets/medieval_door_wooden_closed.svg',
          },
        },
      ],
    });

    const roundTrip = JSON.parse(JSON.stringify(state)) as typeof state;
    expect(roundTrip.player.spriteSet?.default).toBe('/assets/medieval_player_farmer_front.svg');
    expect(roundTrip.doors[0].spriteSet?.default).toBe('/assets/medieval_door_wooden_closed.svg');
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

<<<<<<< HEAD
  it('throws when objective is missing or empty', () => {
    const missingObjective = { ...minimalLevel } as Record<string, unknown>;
    delete missingObjective['objective'];
    expect(() => validateLevelData(missingObjective)).toThrowError('objective must be a non-empty string');

    const emptyObjective = { ...minimalLevel, objective: '   ' };
    expect(() => validateLevelData(emptyObjective)).toThrowError('objective must be a non-empty string');
=======
  it('throws when premise is missing or empty', () => {
    const missingPremise = { ...minimalLevel } as Omit<LevelData, 'premise'>;
    delete (missingPremise as Record<string, unknown>).premise;

    expect(() => validateLevelData(missingPremise)).toThrowError('premise must be a non-empty string');
    expect(() => validateLevelData({ ...minimalLevel, premise: '   ' })).toThrowError(
      'premise must be a non-empty string',
    );
  });

  it('throws when goal is missing or empty', () => {
    const missingGoal = { ...minimalLevel } as Omit<LevelData, 'goal'>;
    delete (missingGoal as Record<string, unknown>).goal;

    expect(() => validateLevelData(missingGoal)).toThrowError('goal must be a non-empty string');
    expect(() => validateLevelData({ ...minimalLevel, goal: '' })).toThrowError('goal must be a non-empty string');
>>>>>>> b9bd8b0 (#111 add premise and goal metadata to level system)
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

  it('throws when player spriteAssetPath is not a string', () => {
    const bad = { ...minimalLevel, player: { x: 2, y: 3, spriteAssetPath: 42 } };
    expect(() => validateLevelData(bad)).toThrowError('player spriteAssetPath must be a string');
  });

  it('throws when player spriteSet is not an object', () => {
    const bad = { ...minimalLevel, player: { x: 2, y: 3, spriteSet: 'bad-shape' } };
    expect(() => validateLevelData(bad)).toThrowError('player spriteSet must be an object');
  });

  it('throws when spriteSet is present but has no configured sprite path', () => {
    const bad = { ...minimalLevel, player: { x: 2, y: 3, spriteSet: {} } };
    expect(() => validateLevelData(bad)).toThrowError('player spriteSet must provide at least one sprite path');
  });

  it('throws when guards is not an array', () => {
    const bad = { ...minimalLevel, guards: null };
    expect(() => validateLevelData(bad)).toThrowError('guards must be an array');
  });

  it('throws when doors is not an array', () => {
    const bad = { ...minimalLevel, doors: 'none' };
    expect(() => validateLevelData(bad)).toThrowError('doors must be an array');
  });

  it('throws when interactiveObject pickupItem is invalid', () => {
    const bad = {
      ...minimalLevel,
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
      interactiveObjects: [
        {
          id: 'crate-1',
          displayName: 'Crate',
          x: 4,
          y: 4,
          objectType: 'supply-crate',
          interactionType: 'inspect',
          state: 'idle',
          pickupItem: {
            itemId: '',
            displayName: 'Key',
          },
        },
      ],
    };

    expect(() => validateLevelData(bad)).toThrowError('invalid pickupItem');
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

  it('includes objective text in runtime world state', () => {
    const level = validateLevelData(starterRaw);
    const state = deserializeLevel(level);

    expect(state.levelObjective).toBe(level.objective);
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

  it('maps starter pickup item metadata into interactive object state', () => {
    const level = validateLevelData(starterRaw);
    const state = deserializeLevel(level);

    expect(state.interactiveObjects[0].pickupItem).toEqual({
      itemId: 'starter-storage-key',
      displayName: 'Storage Key',
    });
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

  it('rejects guards with non-string spriteAssetPath', () => {
    const bad = {
      ...minimalLevel,
      guards: [{ id: 'guard-1', displayName: 'Bad', x: 5, y: 7, guardState: 'idle', spriteAssetPath: 42 }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 2, y: 3, doorState: 'open', outcome: 'safe' }],
    };

    expect(() => validateLevelData(bad)).toThrowError('invalid spriteAssetPath');
  });

  it('rejects guards with non-string spriteSet directional value', () => {
    const bad = {
      ...minimalLevel,
      guards: [
        {
          id: 'guard-1',
          displayName: 'Bad',
          x: 5,
          y: 7,
          guardState: 'idle',
          spriteSet: { front: 42 },
        },
      ],
      doors: [{ id: 'door-1', displayName: 'Door', x: 2, y: 3, doorState: 'open', outcome: 'safe' }],
    };

    expect(() => validateLevelData(bad)).toThrowError('spriteSet.front must be a string');
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

  it('rejects doors with non-string spriteSet default', () => {
    const bad = {
      ...minimalLevel,
      doors: [{ id: 'door-1', displayName: 'Bad', x: 0, y: 10, doorState: 'open', outcome: 'safe', spriteSet: { default: 7 } }],
    };

    expect(() => validateLevelData(bad)).toThrowError('spriteSet.default must be a string');
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

describe('npcs field', () => {
  it('accepts level data without npcs field (backward compatibility)', () => {
    const level: LevelData = {
      ...minimalLevel,
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevel(validated);

    expect(state.npcs).toEqual([]);
  });

  it('accepts level data with empty npcs array', () => {
    const level: LevelData = {
      ...minimalLevel,
      npcs: [],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevel(validated);

    expect(state.npcs).toEqual([]);
  });

  it('maps NPC flat fields to nested Npc with correct position and npcType', () => {
    const level: LevelData = {
      ...minimalLevel,
      npcs: [
        { id: 'npc-1', displayName: 'Archivist', x: 8, y: 3, npcType: 'archive_keeper' },
        { id: 'npc-2', displayName: 'Scholar', x: 12, y: 5, npcType: 'scholar' },
      ],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevel(validated);

    expect(state.npcs).toHaveLength(2);
    expect(state.npcs[0]).toEqual({
      id: 'npc-1',
      displayName: 'Archivist',
      position: { x: 8, y: 3 },
      npcType: 'archive_keeper',
      dialogueContextKey: 'npc_archive_keeper',
    });
    expect(state.npcs[1]).toEqual({
      id: 'npc-2',
      displayName: 'Scholar',
      position: { x: 12, y: 5 },
      npcType: 'scholar',
      dialogueContextKey: 'npc_scholar',
    });
  });

  it('assigns dialogueContextKey based on npcType in lowercase', () => {
    const level: LevelData = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Guard', x: 5, y: 5, npcType: 'GUARD_CAPTAIN' }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevel(validated);

    expect(state.npcs[0].dialogueContextKey).toBe('npc_guard_captain');
  });

  it('throws when npcs is not an array', () => {
    const bad = {
      ...minimalLevel,
      npcs: { id: 'npc-1' },
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    expect(() => validateLevelData(bad)).toThrowError('npcs must be an array');
  });

  it('throws when NPC is missing required field id', () => {
    const bad = {
      ...minimalLevel,
      npcs: [{ displayName: 'Npc', x: 5, y: 5, npcType: 'archivist' }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    expect(() => validateLevelData(bad)).toThrowError(
      'npc at index 0 must have id, displayName, x, y, and npcType',
    );
  });

  it('throws when NPC is missing required field displayName', () => {
    const bad = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', x: 5, y: 5, npcType: 'archivist' }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    expect(() => validateLevelData(bad)).toThrowError(
      'npc at index 0 must have id, displayName, x, y, and npcType',
    );
  });

  it('throws when NPC is missing required field x', () => {
    const bad = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Npc', y: 5, npcType: 'archivist' }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    expect(() => validateLevelData(bad)).toThrowError(
      'npc at index 0 must have id, displayName, x, y, and npcType',
    );
  });

  it('throws when NPC is missing required field y', () => {
    const bad = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Npc', x: 5, npcType: 'archivist' }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    expect(() => validateLevelData(bad)).toThrowError(
      'npc at index 0 must have id, displayName, x, y, and npcType',
    );
  });

  it('throws when NPC is missing required field npcType', () => {
    const bad = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Npc', x: 5, y: 5 }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    expect(() => validateLevelData(bad)).toThrowError(
      'npc at index 0 must have id, displayName, x, y, and npcType',
    );
  });

  it('throws when NPC has non-string npcType', () => {
    const bad = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Npc', x: 5, y: 5, npcType: 123 }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    expect(() => validateLevelData(bad)).toThrowError(
      'npc at index 0 must have id, displayName, x, y, and npcType',
    );
  });

  it('rejects NPC with non-numeric x coordinate', () => {
    const bad = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Npc', x: 'five', y: 5, npcType: 'archivist' }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    expect(() => validateLevelData(bad)).toThrowError(
      'npc at index 0 must have id, displayName, x, y, and npcType',
    );
  });

  it('rejects NPC with non-numeric y coordinate', () => {
    const bad = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Npc', x: 5, y: 'five', npcType: 'archivist' }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    expect(() => validateLevelData(bad)).toThrowError(
      'npc at index 0 must have id, displayName, x, y, and npcType',
    );
  });

  it('preserves npcType during validation and deserialization', () => {
    const level: LevelData = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Guardian', x: 5, y: 5, npcType: 'gate_guardian' }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevel(validated);

    expect(state.npcs[0].npcType).toBe('gate_guardian');
  });

  it('maps optional npc spriteAssetPath when configured', () => {
    const level: LevelData = {
      ...minimalLevel,
      npcs: [
        {
          id: 'npc-1',
          displayName: 'Villager',
          x: 5,
          y: 5,
          npcType: 'villager',
          spriteAssetPath: '/assets/medieval_npc_villager.svg',
        },
      ],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevel(validated);

    expect(state.npcs[0].spriteAssetPath).toBe('/assets/medieval_npc_villager.svg');
  });

  it('rejects NPC with non-string spriteAssetPath', () => {
    const bad = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Npc', x: 5, y: 5, npcType: 'archivist', spriteAssetPath: 123 }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    expect(() => validateLevelData(bad)).toThrowError('invalid spriteAssetPath');
  });
});

describe('instanceKnowledge and instanceBehavior fields', () => {
  it('passes through guard instanceKnowledge and instanceBehavior during deserialization', () => {
    const level: LevelData = {
      ...minimalLevel,
      guards: [
        {
          id: 'guard-1',
          displayName: 'Oracle Guard',
          x: 5,
          y: 7,
          guardState: 'idle',
          instanceKnowledge: 'This guard knows door-1 is safe.',
          instanceBehavior: 'Speaks in riddles.',
        },
      ],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevel(validated);

    expect(state.guards[0].instanceKnowledge).toBe('This guard knows door-1 is safe.');
    expect(state.guards[0].instanceBehavior).toBe('Speaks in riddles.');
  });

  it('passes through NPC instanceKnowledge and instanceBehavior during deserialization', () => {
    const level: LevelData = {
      ...minimalLevel,
      npcs: [
        {
          id: 'npc-1',
          displayName: 'Wise Archivist',
          x: 8,
          y: 3,
          npcType: 'archive_keeper',
          instanceKnowledge: 'Knows the archive holds records of the last five kings.',
          instanceBehavior: 'Speaks formally at all times.',
        },
      ],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevel(validated);

    expect(state.npcs[0].instanceKnowledge).toBe('Knows the archive holds records of the last five kings.');
    expect(state.npcs[0].instanceBehavior).toBe('Speaks formally at all times.');
  });

  it('omits instanceKnowledge and instanceBehavior keys when not provided in guard', () => {
    const level: LevelData = {
      ...minimalLevel,
      guards: [{ id: 'guard-1', displayName: 'Guard', x: 5, y: 7, guardState: 'idle' }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    const state = deserializeLevel(validateLevelData(level));

    expect(Object.prototype.hasOwnProperty.call(state.guards[0], 'instanceKnowledge')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(state.guards[0], 'instanceBehavior')).toBe(false);
  });

  it('omits instanceKnowledge and instanceBehavior keys when not provided in NPC', () => {
    const level: LevelData = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Npc', x: 5, y: 5, npcType: 'archive_keeper' }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    const state = deserializeLevel(validateLevelData(level));

    expect(Object.prototype.hasOwnProperty.call(state.npcs[0], 'instanceKnowledge')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(state.npcs[0], 'instanceBehavior')).toBe(false);
  });

  it('rejects guard with non-string instanceKnowledge', () => {
    const bad = {
      ...minimalLevel,
      guards: [{ id: 'guard-1', displayName: 'Guard', x: 5, y: 7, guardState: 'idle', instanceKnowledge: 42 }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    expect(() => validateLevelData(bad)).toThrowError('invalid instanceKnowledge');
  });

  it('rejects guard with non-string instanceBehavior', () => {
    const bad = {
      ...minimalLevel,
      guards: [{ id: 'guard-1', displayName: 'Guard', x: 5, y: 7, guardState: 'idle', instanceBehavior: true }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    expect(() => validateLevelData(bad)).toThrowError('invalid instanceBehavior');
  });

  it('rejects NPC with non-string instanceKnowledge', () => {
    const bad = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Npc', x: 5, y: 5, npcType: 'archivist', instanceKnowledge: [] }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    expect(() => validateLevelData(bad)).toThrowError('invalid instanceKnowledge');
  });

  it('rejects NPC with non-string instanceBehavior', () => {
    const bad = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Npc', x: 5, y: 5, npcType: 'archivist', instanceBehavior: 0 }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    expect(() => validateLevelData(bad)).toThrowError('invalid instanceBehavior');
  });

  it('deserializes a level with both guard and NPC instance fields correctly end-to-end', () => {
    const level: LevelData = {
      ...minimalLevel,
      guards: [
        {
          id: 'guard-1',
          displayName: 'Riddle Guard',
          x: 5,
          y: 7,
          guardState: 'idle',
          instanceKnowledge: 'Door-1 leads to safety.',
          instanceBehavior: 'Always answers in rhyme.',
        },
      ],
      npcs: [
        {
          id: 'npc-1',
          displayName: 'Keeper',
          x: 8,
          y: 3,
          npcType: 'archive_keeper',
          instanceKnowledge: 'The archives burned in the third age.',
          instanceBehavior: 'Refuses to discuss recent events.',
        },
      ],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, doorState: 'open', outcome: 'safe' }],
    };

    const state = deserializeLevel(validateLevelData(level));

    expect(state.guards[0].instanceKnowledge).toBe('Door-1 leads to safety.');
    expect(state.guards[0].instanceBehavior).toBe('Always answers in rhyme.');
    expect(state.npcs[0].instanceKnowledge).toBe('The archives burned in the third age.');
    expect(state.npcs[0].instanceBehavior).toBe('Refuses to discuss recent events.');
  });
});

