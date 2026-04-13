import { describe, expect, it, vi } from 'vitest';
import riddleJson from '../../public/levels/riddle.json';
import { parseLayoutText } from './layout';
import { deserializeLevel, validateLevelData } from './level';
import { Environment } from './entities/environment/Environment';
import { Item } from './entities/items/Item';
import { GuardNpc } from './entities/npcs/GuardNpc';
import { Npc } from './entities/npcs/Npc';
import { MechanismObject } from './entities/objects/MechanismObject';
import * as spatialRules from './spatialRules';
import type { LevelData } from './types';

const minimalLevel: LevelData = {
  version: 2,
  layoutPath: 'test.layout.txt',
  name: 'Test Level',
  premise: 'A deterministic test premise.',
  goal: 'Reach the safe test door.',
  player: { x: 2, y: 3 },
  guards: [],
  doors: [],
};

const defaultParsedLayout = parseLayoutText(
  [
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
    '....................',
  ].join('\n'),
);

const deserializeLevelWithDefaultLayout = (levelData: LevelData) =>
  deserializeLevel(levelData, defaultParsedLayout);

describe('deserializeLevel', () => {
  it('maps flat player x/y to nested GridPosition with default id and displayName', () => {
    const state = deserializeLevelWithDefaultLayout(minimalLevel);

    expect(state.player).toEqual({
      id: 'player',
      displayName: 'Player',
      position: { x: 2, y: 3 },
      inventory: {
        items: [],
        selectedItem: null,
      },
      facingDirection: 'front',
    });
  });

  it('maps optional player spriteAssetPath when configured', () => {
    const state = deserializeLevelWithDefaultLayout({
      ...minimalLevel,
      player: { x: 2, y: 3, spriteAssetPath: '/assets/medieval_player_town_guard.svg' },
    });

    expect(state.player.spriteAssetPath).toBe('/assets/medieval_player_town_guard.svg');
  });

  it('maps optional player spriteSet when configured', () => {
    const state = deserializeLevelWithDefaultLayout({
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
    const state = deserializeLevelWithDefaultLayout(minimalLevel);

    expect(state.grid.width).toBe(20);
    expect(state.grid.height).toBe(20);
    expect(typeof state.grid.tileSize).toBe('number');
    expect(state.grid.tileSize).toBeGreaterThan(0);
  });

  it('maps level premise and goal into serializable world metadata', () => {
    const state = deserializeLevelWithDefaultLayout(minimalLevel);

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
    const state = deserializeLevelWithDefaultLayout(minimalLevel);

    expect(state.tick).toBe(0);
    expect(state.levelMetadata.goal).toBe('Reach the safe test door.');
    expect(state.npcs).toEqual([]);
    expect(state.interactiveObjects).toEqual([]);
    expect(state.player.inventory.items).toEqual([]);
  });

  it('deserializes environments when provided', () => {
    const state = deserializeLevelWithDefaultLayout({
      ...minimalLevel,
      environments: [
        {
          id: 'wall-1',
          displayName: 'Stone Wall',
          x: 6,
          y: 7,
          isBlocking: true,
        },
      ],
    });

    expect(state.environments).toEqual([
      {
        id: 'wall-1',
        displayName: 'Stone Wall',
        position: { x: 6, y: 7 },
        isBlocking: true,
      },
    ]);
    expect(state.environments?.[0]).toBeInstanceOf(Environment);
  });

  it('keeps player inventory JSON-serializable after deserialization', () => {
    const state = deserializeLevelWithDefaultLayout(minimalLevel);

    const roundTrip = JSON.parse(JSON.stringify(state)) as typeof state;
    expect(roundTrip.player.inventory.items).toEqual([]);
  });

  it('handles empty guard and door arrays', () => {
    const state = deserializeLevelWithDefaultLayout(minimalLevel);

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

    const state = deserializeLevelWithDefaultLayout(level);

    expect(state.guards).toEqual([
      { id: 'guard-1', displayName: 'North Guard', position: { x: 5, y: 7 }, guardState: 'patrolling' },
      { id: 'guard-2', displayName: 'South Guard', position: { x: 10, y: 15 }, guardState: 'idle' },
    ]);
  });

  it('maps optional guard spriteAssetPath when configured', () => {
    const state = deserializeLevelWithDefaultLayout({
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
    const state = deserializeLevelWithDefaultLayout({
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

  it('instantiates guards as GuardNpc runtime classes with existing guard behavior fields', () => {
    const state = deserializeLevelWithDefaultLayout({
      ...minimalLevel,
      guards: [
        {
          id: 'guard-1',
          displayName: 'North Guard',
          x: 5,
          y: 7,
          guardState: 'patrolling',
          traits: { truthMode: 'truth-teller' },
          itemUseRules: {
            token: {
              allowed: true,
              responseText: 'You may pass.',
            },
          },
        },
      ],
    });

    expect(state.guards[0]).toBeInstanceOf(GuardNpc);
    expect(JSON.parse(JSON.stringify(state.guards[0]))).toEqual({
      id: 'guard-1',
      displayName: 'North Guard',
      position: { x: 5, y: 7 },
      guardState: 'patrolling',
      traits: { truthMode: 'truth-teller' },
      itemUseRules: {
        token: {
          allowed: true,
          responseText: 'You may pass.',
        },
      },
    });
  });

  it('maps guard itemUseRules when configured', () => {
    const state = deserializeLevelWithDefaultLayout({
      ...minimalLevel,
      guards: [
        {
          id: 'guard-1',
          displayName: 'North Guard',
          x: 5,
          y: 7,
          guardState: 'patrolling',
          itemUseRules: {
            'gift-token': {
              allowed: true,
              responseText: 'Pass granted.',
            },
          },
        },
      ],
    });

    expect(state.guards[0].itemUseRules).toEqual({
      'gift-token': {
        allowed: true,
        responseText: 'Pass granted.',
      },
    });
  });

  it('maps door flat fields to nested Door with explicit open/locked booleans', () => {
    const level: LevelData = {
      ...minimalLevel,
      doors: [
        { id: 'door-1', displayName: 'Main Gate', x: 0, y: 10, isOpen: false, isLocked: true, isSafe: true },
        { id: 'door-2', displayName: 'Side Door', x: 19, y: 0, isOpen: true, isLocked: false, isSafe: false },
      ],
    };

    const state = deserializeLevelWithDefaultLayout(level);

    expect(state.doors).toEqual([
      { id: 'door-1', displayName: 'Main Gate', position: { x: 0, y: 10 }, isOpen: false, isLocked: true, isSafe: true },
      { id: 'door-2', displayName: 'Side Door', position: { x: 19, y: 0 }, isOpen: true, isLocked: false, isSafe: false },
    ]);
  });

  it('maps optional door spriteSet when configured', () => {
    const state = deserializeLevelWithDefaultLayout({
      ...minimalLevel,
      doors: [
        {
          id: 'door-1',
          displayName: 'Main Gate',
          x: 0,
          y: 10,
          isOpen: false, isLocked: false,
          isSafe: true,
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
    const state = deserializeLevelWithDefaultLayout({
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
          isOpen: false, isLocked: false,
          isSafe: true,
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
    const stateA = deserializeLevelWithDefaultLayout(minimalLevel);
    const stateB = deserializeLevelWithDefaultLayout(minimalLevel);

    expect(stateA).toEqual(stateB);
  });

  it('preserves the schema version field in the input (does not discard it)', () => {
    const level: LevelData = { ...minimalLevel, version: 2 };
    // The function consumes version; ensure it still accepts it without error
    const state = deserializeLevelWithDefaultLayout(level);

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

      expect(() => deserializeLevelWithDefaultLayout(invalid)).toThrowError(
        'Invalid level data: guard:guard-1 is out of bounds at (20, 3) for layout 20x20',
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
          isOpen: false, isLocked: false,
          isSafe: true,
        },
      ],
    };

    expect(() => deserializeLevelWithDefaultLayout(invalid)).toThrowError(
      'Invalid world layout: overlapping coordinates at (2, 3) between player:player and door:door-1',
    );
  });

  it('uses the shared spatial rules path during level deserialization', () => {
    const validateSpy = vi.spyOn(spatialRules, 'validateSpatialLayout');

    deserializeLevelWithDefaultLayout(minimalLevel);

    expect(validateSpy).toHaveBeenCalledTimes(1);
  });
});

describe('validateLevelData', () => {
  it('returns the input unchanged when all required fields are valid', () => {
    const result = validateLevelData(minimalLevel);
    expect(result).toEqual(minimalLevel);
  });

  it('accepts optional environments when each entry has required fields', () => {
    const levelWithEnvironments: LevelData = {
      ...minimalLevel,
      environments: [
        {
          id: 'wall-1',
          displayName: 'Stone Wall',
          x: 3,
          y: 4,
          isBlocking: true,
        },
      ],
    };

    expect(validateLevelData(levelWithEnvironments)).toEqual(levelWithEnvironments);
  });

  it('throws when an environment entry is missing required fields', () => {
    const invalidLevel = {
      ...minimalLevel,
      environments: [
        {
          id: 'wall-1',
          displayName: 'Stone Wall',
          x: 3,
          y: 4,
        },
      ],
    };

    expect(() => validateLevelData(invalidLevel)).toThrowError(
      'Invalid level data: environment at index 0 must have id, displayName, x, y, and isBlocking',
    );
  });

  it('throws when version is missing', () => {
    const bad = { ...minimalLevel } as Record<string, unknown>;
    delete bad.version;
    expect(() => validateLevelData(bad)).toThrowError('Level format version is missing. Expected version 2.');
  });

  it('throws when version is not 2', () => {
    const bad = { ...minimalLevel, version: 1 };
    expect(() => validateLevelData(bad)).toThrowError('Level format version 1 is not supported. Expected version 2.');
  });

  it('throws when name is an empty string', () => {
    const bad = { ...minimalLevel, name: '' };
    expect(() => validateLevelData(bad)).toThrowError('name must be a non-empty string');
  });

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
  });

  it('allows level headers without layout path metadata', () => {
    expect(() => validateLevelData(minimalLevel)).not.toThrow();
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
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
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

  it('throws when guard itemUseRules has invalid rule shape', () => {
    const bad = {
      ...minimalLevel,
      guards: [
        {
          id: 'guard-1',
          displayName: 'Guard',
          x: 5,
          y: 7,
          guardState: 'idle',
          itemUseRules: {
            'gift-token': {
              allowed: 'yes',
              responseText: 'Wrong shape',
            },
          },
        },
      ],
    };

    expect(() => validateLevelData(bad)).toThrowError('itemUseRules.gift-token.allowed must be a boolean');
  });

  it('throws when interactiveObject itemUseRules has invalid rule shape', () => {
    const bad = {
      ...minimalLevel,
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
      interactiveObjects: [
        {
          id: 'crate-1',
          displayName: 'Crate',
          x: 4,
          y: 4,
          objectType: 'supply-crate',
          interactionType: 'inspect',
          state: 'idle',
          itemUseRules: {
            'unlock-rune': {
              allowed: true,
              responseText: 42,
            },
          },
        },
      ],
    };

    expect(() => validateLevelData(bad)).toThrowError(
      'itemUseRules.unlock-rune.responseText must be a string',
    );
  });

  it('accepts mechanism interactive objects and preserves their sprite asset path', () => {
    const level: LevelData = {
      ...minimalLevel,
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
      interactiveObjects: [
        {
          id: 'mechanism-1',
          displayName: 'Mechanism',
          x: 4,
          y: 4,
          objectType: 'mechanism',
          interactionType: 'use',
          state: 'idle',
          spriteAssetPath: '/assets/medieval_mechanism_door.svg',
        },
      ],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevelWithDefaultLayout(validated);

    expect(state.interactiveObjects[0].objectType).toBe('mechanism');
    expect(state.interactiveObjects[0].spriteAssetPath).toBe('/assets/medieval_mechanism_door.svg');
    expect(state.interactiveObjects[0]).toBeInstanceOf(MechanismObject);
  });

  it('validateLevelData keeps JSON ingress DTO-shaped and does not emit runtime class instances', () => {
    const validated = validateLevelData({
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Archivist', x: 4, y: 4, npcType: 'archive_keeper' }],
      environments: [{ id: 'env-1', displayName: 'Stone Wall', x: 6, y: 7, isBlocking: true }],
      interactiveObjects: [
        {
          id: 'mechanism-1',
          displayName: 'Mechanism',
          x: 4,
          y: 4,
          objectType: 'mechanism',
          interactionType: 'use',
          state: 'idle',
        },
      ],
    });

    expect(validated.npcs?.[0]).not.toBeInstanceOf(Npc);
    expect(validated.environments?.[0]).not.toBeInstanceOf(Environment);
    expect(validated.interactiveObjects?.[0]).not.toBeInstanceOf(MechanismObject);
  });

  it('throws when input is not an object', () => {
    expect(() => validateLevelData(null)).toThrowError('expected an object');
    expect(() => validateLevelData('string')).toThrowError('expected an object');
  });
});

describe('riddle level', () => {
  const riddleRaw: unknown = riddleJson;

  it('passes validateLevelData without throwing', () => {
    expect(() => validateLevelData(riddleRaw)).not.toThrow();
  });

  it('deserializes to a WorldState with two guards and two doors', () => {
    const level = validateLevelData(riddleRaw);
    const state = deserializeLevelWithDefaultLayout(level);

    expect(state.guards).toHaveLength(2);
    expect(state.doors).toHaveLength(2);
  });

  it('places the player at (10, 15)', () => {
    const level = validateLevelData(riddleRaw);
    const state = deserializeLevelWithDefaultLayout(level);

    expect(state.player.position).toEqual({ x: 10, y: 15 });
  });

  it('does not project objective text into runtime world state', () => {
    const level = validateLevelData(riddleRaw);
    const state = deserializeLevelWithDefaultLayout(level);

    expect(state.levelObjective).toBeUndefined();
  });

  it('has a 20×20 grid', () => {
    const level = validateLevelData(riddleRaw);
    const state = deserializeLevelWithDefaultLayout(level);

    expect(state.grid.width).toBe(20);
    expect(state.grid.height).toBe(20);
  });

  it('all guards start idle and all doors start closed/unlocked', () => {
    const level = validateLevelData(riddleRaw);
    const state = deserializeLevelWithDefaultLayout(level);

    for (const guard of state.guards) {
      expect(guard.guardState).toBe('idle');
    }
    for (const door of state.doors) {
      expect(door.isOpen).toBe(false);
      expect(door.isLocked).toBe(false);
    }
  });

  it('guard ids and door ids match expected descriptive values', () => {
    const level = validateLevelData(riddleRaw);
    const state = deserializeLevelWithDefaultLayout(level);

    expect(state.guards.map((g) => g.id)).toEqual(['guard-truth', 'guard-liar']);
    expect(state.doors.map((d) => d.id)).toEqual(['door-safe', 'door-danger']);
  });

  it('has no interactive objects by default', () => {
    const level = validateLevelData(riddleRaw);
    const state = deserializeLevelWithDefaultLayout(level);

    expect(state.interactiveObjects).toEqual([]);
  });

  it('preserves guard traits and door safety values from level json', () => {
    const level = validateLevelData(riddleRaw);
    const state = deserializeLevelWithDefaultLayout(level);

    expect(state.guards.map((guard) => guard.traits?.truthMode)).toEqual(['truth-teller', 'liar']);
    expect(state.doors.map((door) => door.isSafe)).toEqual([true, false]);
  });
});

describe('traits field', () => {
  it('accepts guards with traits.truthMode: "truth-teller"', () => {
    const level: LevelData = {
      ...minimalLevel,
      guards: [{ id: 'guard-1', displayName: 'Truthful', x: 5, y: 7, guardState: 'idle', traits: { truthMode: 'truth-teller' } }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevelWithDefaultLayout(validated);

    expect(state.guards[0].traits?.truthMode).toBe('truth-teller');
  });

  it('accepts guards with traits.truthMode: "liar"', () => {
    const level: LevelData = {
      ...minimalLevel,
      guards: [{ id: 'guard-1', displayName: 'Lying', x: 5, y: 7, guardState: 'idle', traits: { truthMode: 'liar' } }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevelWithDefaultLayout(validated);

    expect(state.guards[0].traits?.truthMode).toBe('liar');
  });

  it('accepts guards without traits field', () => {
    const level: LevelData = {
      ...minimalLevel,
      guards: [{ id: 'guard-1', displayName: 'Unknown', x: 5, y: 7, guardState: 'idle' }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevelWithDefaultLayout(validated);

    expect(state.guards[0].traits).toBeUndefined();
  });

  it('rejects guards with non-object traits value', () => {
    const bad = {
      ...minimalLevel,
      guards: [{ id: 'guard-1', displayName: 'Bad', x: 5, y: 7, guardState: 'idle', traits: 'dishonest' as unknown }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 2, y: 3, isOpen: true, isLocked: false, isSafe: true }],
    };

    expect(() => validateLevelData(bad)).toThrowError('invalid traits (must be a plain object when provided)');
  });

  it('rejects guards with non-string trait value', () => {
    const bad = {
      ...minimalLevel,
      guards: [{ id: 'guard-1', displayName: 'Bad', x: 5, y: 7, guardState: 'idle', traits: { truthMode: 42 } as unknown }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 2, y: 3, isOpen: true, isLocked: false, isSafe: true }],
    };

    expect(() => validateLevelData(bad)).toThrowError('traits.truthMode must be a string');
  });

  it('rejects guards with non-string spriteAssetPath', () => {
    const bad = {
      ...minimalLevel,
      guards: [{ id: 'guard-1', displayName: 'Bad', x: 5, y: 7, guardState: 'idle', spriteAssetPath: 42 }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 2, y: 3, isOpen: true, isLocked: false, isSafe: true }],
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
      doors: [{ id: 'door-1', displayName: 'Door', x: 2, y: 3, isOpen: true, isLocked: false, isSafe: true }],
    };

    expect(() => validateLevelData(bad)).toThrowError('spriteSet.front must be a string');
  });
});

describe('isSafe field', () => {
  it('accepts doors with isSafe=true', () => {
    const level: LevelData = {
      ...minimalLevel,
      doors: [{ id: 'door-1', displayName: 'Safe', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevelWithDefaultLayout(validated);

    expect(state.doors[0].isSafe).toBe(true);
  });

  it('accepts doors with isSafe=false', () => {
    const level: LevelData = {
      ...minimalLevel,
      doors: [{ id: 'door-1', displayName: 'Danger', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: false }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevelWithDefaultLayout(validated);

    expect(state.doors[0].isSafe).toBe(false);
  });

  it('accepts doors without isSafe field (optional for locked/key-based doors)', () => {
    const noOutcome = {
      ...minimalLevel,
      doors: [{ id: 'door-1', displayName: 'No outcome', x: 0, y: 10, isOpen: false, isLocked: true }],
    };

    expect(() => validateLevelData(noOutcome)).not.toThrow();
  });

  it('rejects doors with non-boolean isSafe', () => {
    const bad = {
      ...minimalLevel,
      doors: [{ id: 'door-1', displayName: 'Bad', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: 'unclear' }],
    };

    expect(() => validateLevelData(bad)).toThrowError('invalid isSafe');
  });

  it('rejects doors with non-string spriteSet default', () => {
    const bad = {
      ...minimalLevel,
      doors: [{ id: 'door-1', displayName: 'Bad', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true, spriteSet: { default: 7 } }],
    };

    expect(() => validateLevelData(bad)).toThrowError('spriteSet.default must be a string');
  });
});

describe('door requiredItemIds field', () => {
  it('accepts requiredItemIds when it is a non-empty unique string array', () => {
    const level: LevelData = {
      ...minimalLevel,
      doors: [
        {
          id: 'seal-door',
          displayName: 'Seal Door',
          x: 0,
          y: 10,
          isOpen: false,
          isLocked: true,
          requiredItemIds: ['seal-a', 'seal-b', 'seal-c'],
        },
      ],
    };

    const state = deserializeLevelWithDefaultLayout(validateLevelData(level));

    expect(state.doors[0].requiredItemIds).toEqual(['seal-a', 'seal-b', 'seal-c']);
  });

  it('keeps requiredItemId backward-compatible when requiredItemIds is absent', () => {
    const level: LevelData = {
      ...minimalLevel,
      doors: [
        {
          id: 'legacy-door',
          displayName: 'Legacy Door',
          x: 0,
          y: 10,
          isOpen: false,
          isLocked: true,
          requiredItemId: 'golden-key',
        },
      ],
    };

    const state = deserializeLevelWithDefaultLayout(validateLevelData(level));

    expect(state.doors[0].requiredItemId).toBe('golden-key');
    expect(state.doors[0].requiredItemIds).toBeUndefined();
  });

  it('rejects door configs that include both requiredItemId and requiredItemIds', () => {
    const bad = {
      ...minimalLevel,
      doors: [
        {
          id: 'bad-door',
          displayName: 'Bad Door',
          x: 0,
          y: 10,
          isOpen: false,
          isLocked: true,
          requiredItemId: 'key-a',
          requiredItemIds: ['key-a', 'key-b'],
        },
      ],
    };

    expect(() => validateLevelData(bad)).toThrowError('cannot define both requiredItemId and requiredItemIds');
  });

  it('rejects non-array requiredItemIds', () => {
    const bad = {
      ...minimalLevel,
      doors: [
        {
          id: 'bad-door',
          displayName: 'Bad Door',
          x: 0,
          y: 10,
          isOpen: false,
          isLocked: true,
          requiredItemIds: 'key-a',
        },
      ],
    };

    expect(() => validateLevelData(bad)).toThrowError('invalid requiredItemIds (must be an array when provided)');
  });

  it('rejects empty requiredItemIds arrays', () => {
    const bad = {
      ...minimalLevel,
      doors: [
        {
          id: 'bad-door',
          displayName: 'Bad Door',
          x: 0,
          y: 10,
          isOpen: false,
          isLocked: true,
          requiredItemIds: [],
        },
      ],
    };

    expect(() => validateLevelData(bad)).toThrowError('invalid requiredItemIds (must be a non-empty array)');
  });

  it('rejects requiredItemIds entries that are not non-empty strings', () => {
    const bad = {
      ...minimalLevel,
      doors: [
        {
          id: 'bad-door',
          displayName: 'Bad Door',
          x: 0,
          y: 10,
          isOpen: false,
          isLocked: true,
          requiredItemIds: ['key-a', ''],
        },
      ],
    };

    expect(() => validateLevelData(bad)).toThrowError(
      'invalid requiredItemIds (all entries must be non-empty strings)',
    );
  });

  it('rejects duplicate requiredItemIds entries', () => {
    const bad = {
      ...minimalLevel,
      doors: [
        {
          id: 'bad-door',
          displayName: 'Bad Door',
          x: 0,
          y: 10,
          isOpen: false,
          isLocked: true,
          requiredItemIds: ['key-a', 'key-a'],
        },
      ],
    };

    expect(() => validateLevelData(bad)).toThrowError('invalid requiredItemIds (duplicate entries are not allowed)');
  });
});

describe('levelOutcome field', () => {
  it('initializes to null when level is deserialized', () => {
    const level: LevelData = {
      ...minimalLevel,
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    const state = deserializeLevelWithDefaultLayout(validateLevelData(level));

    expect(state.levelOutcome).toBeNull();
  });
});

describe('questState field', () => {
  it('initializes to an empty quest state when questChains is omitted', () => {
    const state = deserializeLevelWithDefaultLayout(validateLevelData(minimalLevel));

    expect(state.questState).toEqual({
      version: 1,
      chains: [],
      progressByChainId: {},
    });
  });

  it('deserializes deterministic quest chain progress defaults when questChains are provided', () => {
    const level: LevelData = {
      ...minimalLevel,
      questChains: [
        {
          chainId: 'seal-1',
          displayName: 'First Seal',
          stages: [
            {
              stageId: 'bribe-guard',
              completeWhen: {
                eventType: 'item_use_resolved',
                result: 'success',
                targetKind: 'guard',
                targetId: 'guard-1',
              },
            },
          ],
        },
      ],
    };

    const state = deserializeLevelWithDefaultLayout(validateLevelData(level));

    expect(state.questState?.chains).toHaveLength(1);
    expect(state.questState?.progressByChainId['seal-1']).toEqual({
      chainId: 'seal-1',
      status: 'not_started',
      currentStageIndex: 0,
      completedStageIds: [],
    });
  });

  it('rejects quest chains with unsupported completeWhen event types', () => {
    const badLevel = {
      ...minimalLevel,
      questChains: [
        {
          chainId: 'seal-1',
          displayName: 'First Seal',
          stages: [
            {
              stageId: 'stage-1',
              completeWhen: {
                eventType: 'dialogue_generated',
              },
            },
          ],
        },
      ],
    };

    expect(() => validateLevelData(badLevel)).toThrowError('completeWhen.eventType must be "item_use_resolved"');
  });
});

describe('npcs field', () => {
  it('accepts level data without npcs field (backward compatibility)', () => {
    const level: LevelData = {
      ...minimalLevel,
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevelWithDefaultLayout(validated);

    expect(state.npcs).toEqual([]);
  });

  it('accepts level data with empty npcs array', () => {
    const level: LevelData = {
      ...minimalLevel,
      npcs: [],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevelWithDefaultLayout(validated);

    expect(state.npcs).toEqual([]);
  });

  it('maps NPC flat fields to nested Npc with correct position and npcType', () => {
    const level: LevelData = {
      ...minimalLevel,
      npcs: [
        { id: 'npc-1', displayName: 'Archivist', x: 8, y: 3, npcType: 'archive_keeper' },
        { id: 'npc-2', displayName: 'Scholar', x: 12, y: 5, npcType: 'scholar' },
      ],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevelWithDefaultLayout(validated);

    expect(state.npcs).toHaveLength(2);
    expect(state.npcs[0]).toBeInstanceOf(Npc);
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
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevelWithDefaultLayout(validated);

    expect(state.npcs[0].dialogueContextKey).toBe('npc_guard_captain');
  });

  it('maps optional npc trade rules into serializable runtime state', () => {
    const level: LevelData = {
      ...minimalLevel,
      npcs: [
        {
          id: 'npc-1',
          displayName: 'Archivist',
          x: 5,
          y: 5,
          npcType: 'archive_keeper',
          tradeRules: [
            {
              ruleId: 'swap-pass-for-key',
              requiredItemIds: ['gate-pass'],
              rewardItems: [{ itemId: 'archive-key', displayName: 'Archive Key' }],
            },
          ],
        },
      ],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevelWithDefaultLayout(validated);

    expect(state.npcs[0].tradeRules).toEqual([
      {
        ruleId: 'swap-pass-for-key',
        requiredItemIds: ['gate-pass'],
        rewardItems: [{ itemId: 'archive-key', displayName: 'Archive Key' }],
      },
    ]);
    expect(JSON.parse(JSON.stringify(state.npcs[0]))).toMatchObject({
      id: 'npc-1',
      tradeRules: [
        {
          ruleId: 'swap-pass-for-key',
          requiredItemIds: ['gate-pass'],
          rewardItems: [{ itemId: 'archive-key', displayName: 'Archive Key' }],
        },
      ],
    });
  });

  it('throws when npcs is not an array', () => {
    const bad = {
      ...minimalLevel,
      npcs: { id: 'npc-1' },
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    expect(() => validateLevelData(bad)).toThrowError('npcs must be an array');
  });

  it('throws when NPC is missing required field id', () => {
    const bad = {
      ...minimalLevel,
      npcs: [{ displayName: 'Npc', x: 5, y: 5, npcType: 'archivist' }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    expect(() => validateLevelData(bad)).toThrowError(
      'npc at index 0 must have id, displayName, x, y, and npcType',
    );
  });

  it('throws when NPC is missing required field displayName', () => {
    const bad = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', x: 5, y: 5, npcType: 'archivist' }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    expect(() => validateLevelData(bad)).toThrowError(
      'npc at index 0 must have id, displayName, x, y, and npcType',
    );
  });

  it('throws when NPC is missing required field x', () => {
    const bad = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Npc', y: 5, npcType: 'archivist' }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    expect(() => validateLevelData(bad)).toThrowError(
      'npc at index 0 must have id, displayName, x, y, and npcType',
    );
  });

  it('throws when NPC is missing required field y', () => {
    const bad = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Npc', x: 5, npcType: 'archivist' }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    expect(() => validateLevelData(bad)).toThrowError(
      'npc at index 0 must have id, displayName, x, y, and npcType',
    );
  });

  it('throws when NPC is missing required field npcType', () => {
    const bad = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Npc', x: 5, y: 5 }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    expect(() => validateLevelData(bad)).toThrowError(
      'npc at index 0 must have id, displayName, x, y, and npcType',
    );
  });

  it('throws when NPC has non-string npcType', () => {
    const bad = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Npc', x: 5, y: 5, npcType: 123 }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    expect(() => validateLevelData(bad)).toThrowError(
      'npc at index 0 must have id, displayName, x, y, and npcType',
    );
  });

  it('rejects NPC with non-numeric x coordinate', () => {
    const bad = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Npc', x: 'five', y: 5, npcType: 'archivist' }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    expect(() => validateLevelData(bad)).toThrowError(
      'npc at index 0 must have id, displayName, x, y, and npcType',
    );
  });

  it('rejects NPC with non-numeric y coordinate', () => {
    const bad = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Npc', x: 5, y: 'five', npcType: 'archivist' }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    expect(() => validateLevelData(bad)).toThrowError(
      'npc at index 0 must have id, displayName, x, y, and npcType',
    );
  });

  it('preserves npcType during validation and deserialization', () => {
    const level: LevelData = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Guardian', x: 5, y: 5, npcType: 'gate_guardian' }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevelWithDefaultLayout(validated);

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
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevelWithDefaultLayout(validated);

    expect(state.npcs[0].spriteAssetPath).toBe('/assets/medieval_npc_villager.svg');
  });

  it('rejects NPC with non-string spriteAssetPath', () => {
    const bad = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Npc', x: 5, y: 5, npcType: 'archivist', spriteAssetPath: 123 }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
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
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevelWithDefaultLayout(validated);

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
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    const validated = validateLevelData(level);
    const state = deserializeLevelWithDefaultLayout(validated);

    expect(state.npcs[0].instanceKnowledge).toBe('Knows the archive holds records of the last five kings.');
    expect(state.npcs[0].instanceBehavior).toBe('Speaks formally at all times.');
  });

  it('omits instanceKnowledge and instanceBehavior keys when not provided in guard', () => {
    const level: LevelData = {
      ...minimalLevel,
      guards: [{ id: 'guard-1', displayName: 'Guard', x: 5, y: 7, guardState: 'idle' }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    const state = deserializeLevelWithDefaultLayout(validateLevelData(level));

    expect(Object.prototype.hasOwnProperty.call(state.guards[0], 'instanceKnowledge')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(state.guards[0], 'instanceBehavior')).toBe(false);
  });

  it('omits instanceKnowledge and instanceBehavior keys when not provided in NPC', () => {
    const level: LevelData = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Npc', x: 5, y: 5, npcType: 'archive_keeper' }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    const state = deserializeLevelWithDefaultLayout(validateLevelData(level));

    expect(Object.prototype.hasOwnProperty.call(state.npcs[0], 'instanceKnowledge')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(state.npcs[0], 'instanceBehavior')).toBe(false);
  });

  it('rejects guard with non-string instanceKnowledge', () => {
    const bad = {
      ...minimalLevel,
      guards: [{ id: 'guard-1', displayName: 'Guard', x: 5, y: 7, guardState: 'idle', instanceKnowledge: 42 }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    expect(() => validateLevelData(bad)).toThrowError('invalid instanceKnowledge');
  });

  it('rejects guard with non-string instanceBehavior', () => {
    const bad = {
      ...minimalLevel,
      guards: [{ id: 'guard-1', displayName: 'Guard', x: 5, y: 7, guardState: 'idle', instanceBehavior: true }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    expect(() => validateLevelData(bad)).toThrowError('invalid instanceBehavior');
  });

  it('rejects NPC with non-string instanceKnowledge', () => {
    const bad = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Npc', x: 5, y: 5, npcType: 'archivist', instanceKnowledge: [] }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    expect(() => validateLevelData(bad)).toThrowError('invalid instanceKnowledge');
  });

  it('rejects NPC with non-string instanceBehavior', () => {
    const bad = {
      ...minimalLevel,
      npcs: [{ id: 'npc-1', displayName: 'Npc', x: 5, y: 5, npcType: 'archivist', instanceBehavior: 0 }],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
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
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    const state = deserializeLevelWithDefaultLayout(validateLevelData(level));

    expect(state.guards[0].instanceKnowledge).toBe('Door-1 leads to safety.');
    expect(state.guards[0].instanceBehavior).toBe('Always answers in rhyme.');
    expect(state.npcs[0].instanceKnowledge).toBe('The archives burned in the third age.');
    expect(state.npcs[0].instanceBehavior).toBe('Refuses to discuss recent events.');
  });
});

describe('NPC capability fields', () => {
  it('maps optional npc patrol, triggers, and inventory fields during deserialization', () => {
    const level: LevelData = {
      ...minimalLevel,
      npcs: [
        {
          id: 'npc-1',
          displayName: 'Courier',
          x: 5,
          y: 5,
          npcType: 'villager',
          patrol: {
            path: [
              { x: 5, y: 5 },
              { x: 6, y: 5 },
            ],
          },
          triggers: {
            onTalk: {
              setFact: 'alerted',
              value: true,
            },
          },
          inventory: [
            {
              itemId: 'key-token',
              displayName: 'Key Token',
              sourceObjectId: 'npc-1',
              pickedUpAtTick: 0,
            },
          ],
        },
      ],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    const state = deserializeLevelWithDefaultLayout(validateLevelData(level));

    expect(state.npcs[0].patrol).toEqual({
      path: [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
      ],
    });
    expect(state.npcs[0].triggers).toEqual({
      onTalk: {
        setFact: 'alerted',
        value: true,
      },
    });
    expect(state.npcs[0].inventory).toEqual([
      {
        itemId: 'key-token',
        displayName: 'Key Token',
        sourceObjectId: 'npc-1',
        pickedUpAtTick: 0,
      },
    ]);
    expect(state.npcs[0].inventory?.[0]).toBeInstanceOf(Item);
  });

  it('rejects npc patrol paths with out-of-bounds coordinates', () => {
    const bad = {
      ...minimalLevel,
      npcs: [
        {
          id: 'npc-1',
          displayName: 'Courier',
          x: 5,
          y: 5,
          npcType: 'villager',
          patrol: {
            path: [{ x: 99, y: 5 }],
          },
        },
      ],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    expect(
      () =>
        validateLevelData(bad, {
          width: defaultParsedLayout.width,
          height: defaultParsedLayout.height,
        }),
    ).toThrowError('patrol.path[0] is out of bounds');
  });

  it('rejects npc triggers with invalid shape', () => {
    const bad = {
      ...minimalLevel,
      npcs: [
        {
          id: 'npc-1',
          displayName: 'Courier',
          x: 5,
          y: 5,
          npcType: 'villager',
          triggers: {
            onTalk: {
              setFact: 42,
              value: true,
            },
          },
        },
      ],
      doors: [{ id: 'door-1', displayName: 'Door', x: 0, y: 10, isOpen: true, isLocked: false, isSafe: true }],
    };

    expect(() => validateLevelData(bad)).toThrowError('triggers.onTalk.setFact must be a non-empty string');
  });
});

