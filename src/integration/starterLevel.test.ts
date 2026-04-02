import { describe, expect, it } from 'vitest';
import starterJson from '../../public/levels/starter.json';
import { resolveAdjacentTarget } from '../interaction/adjacencyResolver';
import { handleDoorInteraction } from '../interaction/doorInteraction';
import { handleGuardInteraction } from '../interaction/guardInteraction';
import { handleInteractiveObjectInteraction } from '../interaction/objectInteraction';
import { buildGuardPromptContext } from '../interaction/guardPromptContext';
import { buildNpcPromptContext } from '../interaction/npcPromptContext';
import { deserializeLevel, validateLevelData } from '../world/level';
import type { WorldState } from '../world/types';

const createStarterState = (): WorldState => {
  const validated = validateLevelData(starterJson);
  return deserializeLevel(validated);
};

describe('starter level integration pipeline', () => {
  it('loads starter level into a valid WorldState with expected entity positions', () => {
    const validated = validateLevelData(starterJson);
    const worldState = deserializeLevel(validated);

    expect(worldState).toBeDefined();
    expect(worldState.levelMetadata).toEqual({
      name: 'Starter',
      premise: 'You are a town guard testing patrol routes around a guarded courtyard.',
      goal: 'Inspect nearby clues and choose the safe exit door.',
    });
    expect(worldState.player.position).toEqual({ x: 10, y: 10 });
    expect(worldState.player.spriteAssetPath).toBe('/assets/medieval_player_town_guard.svg');

    expect(worldState.guards).toHaveLength(2);
    expect(worldState.guards.find((guard) => guard.id === 'guard-1')?.position).toEqual({ x: 5, y: 10 });
    expect(worldState.guards.find((guard) => guard.id === 'guard-2')?.position).toEqual({ x: 10, y: 5 });
    expect(worldState.guards.every((guard) => guard.spriteAssetPath === '/assets/medieval_guard_spear.svg')).toBe(
      true,
    );

    expect(worldState.npcs).toHaveLength(1);
    expect(worldState.npcs[0].id).toBe('npc-villager-1');
    expect(worldState.npcs[0].spriteAssetPath).toBe('/assets/medieval_npc_villager.svg');

    expect(worldState.doors).toHaveLength(2);
    expect(worldState.doors.find((door) => door.id === 'door-1')?.position).toEqual({ x: 4, y: 10 });
    expect(worldState.doors.find((door) => door.id === 'door-2')?.position).toEqual({ x: 10, y: 4 });

    expect(worldState.interactiveObjects).toHaveLength(1);
    expect(worldState.interactiveObjects.find((object) => object.id === 'crate-supplies')?.position).toEqual({
      x: 11,
      y: 10,
    });
  });

  it('resolves adjacent guard and returns patrolling response without mutating world state', () => {
    const worldState = createStarterState();
    worldState.player.position = { x: 6, y: 10 };

    const beforeInteraction = structuredClone(worldState);
    const adjacent = resolveAdjacentTarget(worldState);

    expect(adjacent).not.toBeNull();
    expect(adjacent?.kind).toBe('guard');
    expect(adjacent?.target.id).toBe('guard-1');

    if (adjacent?.kind !== 'guard') {
      throw new Error('Expected guard target');
    }

    const result = handleGuardInteraction({
      guard: adjacent.target,
      player: worldState.player,
    });

    expect(result.responseText).toBe('Guard: Keep moving, nothing to see here.');
    expect(worldState).toEqual(beforeInteraction);
  });

  it('resolves adjacent door and returns the closed-door response', () => {
    const worldState = createStarterState();
    worldState.player.position = { x: 10, y: 3 };
    const beforeInteraction = structuredClone(worldState);

    const adjacent = resolveAdjacentTarget(worldState);

    expect(adjacent).not.toBeNull();
    expect(adjacent?.kind).toBe('door');
    expect(adjacent?.target.id).toBe('door-2');

    if (adjacent?.kind !== 'door') {
      throw new Error('Expected door target');
    }

    const result = handleDoorInteraction({
      door: adjacent.target,
      player: worldState.player,
    });

    expect(result.responseText).toBe('The door is closed.');
    expect(worldState).toEqual(beforeInteraction);
  });

  it('resolves adjacent supply crate and applies shared object-type interaction with instance state updates', () => {
    const worldState = createStarterState();
    const beforeInteraction = structuredClone(worldState);

    const adjacent = resolveAdjacentTarget(worldState);

    expect(adjacent).not.toBeNull();
    expect(adjacent?.kind).toBe('interactiveObject');
    expect(adjacent?.target.id).toBe('crate-supplies');

    if (adjacent?.kind !== 'interactiveObject') {
      throw new Error('Expected interactiveObject target');
    }

    const firstResult = handleInteractiveObjectInteraction({
      interactiveObject: adjacent.target,
      player: worldState.player,
      worldState,
    });

    expect(firstResult.responseText).toBe('You crack open the crate and find emergency supplies.');
    expect(firstResult.updatedWorldState.interactiveObjects[0].state).toBe('used');
    expect(firstResult.updatedWorldState.levelOutcome).toBeNull();
    expect(firstResult.updatedWorldState.player.inventory.items).toEqual([
      {
        itemId: 'starter-storage-key',
        displayName: 'Storage Key',
        sourceObjectId: 'crate-supplies',
        pickedUpAtTick: 0,
      },
    ]);

    const secondResult = handleInteractiveObjectInteraction({
      interactiveObject: firstResult.updatedWorldState.interactiveObjects[0],
      player: worldState.player,
      worldState: firstResult.updatedWorldState,
    });

    expect(secondResult.responseText).toBe('The supply crate is already open and empty.');
    expect(secondResult.updatedWorldState.interactiveObjects[0].state).toBe('used');
    expect(secondResult.updatedWorldState.player.inventory.items).toHaveLength(1);

    expect(worldState).toEqual(beforeInteraction);
  });

  it('returns equal canonical initial states across repeated deserializations (reset baseline)', () => {
    const first = deserializeLevel(validateLevelData(starterJson));
    const second = deserializeLevel(validateLevelData(starterJson));

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });

  it('returns null when player has no adjacent interactable (silent no-op)', () => {
    const worldState = createStarterState();
    worldState.player.position = { x: 0, y: 0 };

    const adjacent = resolveAdjacentTarget(worldState);

    expect(adjacent).toBeNull();
  });
});

  describe('instanceKnowledge and instanceBehavior full pipeline', () => {
    it('propagates instanceKnowledge and instanceBehavior from level JSON through deserializeLevel into prompt context', () => {
      const levelWithInstanceFields = {
        version: 1,
        name: 'Instance Fields Test',
<<<<<<< HEAD
        objective: 'Verify instance field propagation.',
=======
        premise: 'A deterministic fixture for instance fields.',
        goal: 'Confirm instance fields propagate to prompt context.',
>>>>>>> b9bd8b0 (#111 add premise and goal metadata to level system)
        width: 20,
        height: 20,
        player: { x: 10, y: 10 },
        guards: [
          {
            id: 'guard-1',
            displayName: 'Oracle Guard',
            x: 5,
            y: 10,
            guardState: 'idle',
            instanceKnowledge: 'Door-1 leads to safety.',
            instanceBehavior: 'Always answers in rhyme.',
          },
        ],
        doors: [
          {
            id: 'door-1',
            displayName: 'West Door',
            x: 4,
            y: 10,
            doorState: 'closed',
            outcome: 'safe',
          },
        ],
        npcs: [
          {
            id: 'npc-1',
            displayName: 'The Archivist',
            x: 15,
            y: 14,
            npcType: 'archive_keeper',
            instanceKnowledge: 'The archives burned in the third age.',
            instanceBehavior: 'Speaks in hushed tones.',
          },
        ],
      };

      const validated = validateLevelData(levelWithInstanceFields);
      const worldState = deserializeLevel(validated);

      // Assert the fields are preserved through deserialization
      expect(worldState.guards[0].instanceKnowledge).toBe('Door-1 leads to safety.');
      expect(worldState.guards[0].instanceBehavior).toBe('Always answers in rhyme.');
      expect(worldState.npcs[0].instanceKnowledge).toBe('The archives burned in the third age.');
      expect(worldState.npcs[0].instanceBehavior).toBe('Speaks in hushed tones.');

      // Assert the fields appear in guard prompt context output
      const guardContext = JSON.parse(buildGuardPromptContext(worldState.guards[0], worldState)) as {
        instanceKnowledge?: string;
        instanceBehavior?: string;
      };
      expect(guardContext.instanceKnowledge).toBe('Door-1 leads to safety.');
      expect(guardContext.instanceBehavior).toBe('Always answers in rhyme.');

      // Assert the fields appear in NPC prompt context output
      const npcContext = JSON.parse(buildNpcPromptContext(worldState.npcs[0], worldState.player, worldState)) as {
        instanceKnowledge?: string;
        instanceBehavior?: string;
      };
      expect(npcContext.instanceKnowledge).toBe('The archives burned in the third age.');
      expect(npcContext.instanceBehavior).toBe('Speaks in hushed tones.');
    });
  });
