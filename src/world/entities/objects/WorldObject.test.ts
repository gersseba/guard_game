import { describe, expect, it } from 'vitest';
import type { InteractiveObject, Player, WorldState } from '../../types';
import { ContainerObject } from './ContainerObject';
import { DoorObject } from './DoorObject';
import { MechanismObject } from './MechanismObject';

const player: Player = {
  id: 'player-1',
  displayName: 'Hero',
  position: { x: 1, y: 1 },
  inventory: { items: [] },
};

const createWorldState = (interactiveObject: InteractiveObject): WorldState => ({
  tick: 5,
  grid: { width: 10, height: 10, tileSize: 32 },
  levelMetadata: {
    name: 'Object Test',
    premise: 'Polymorphic object interaction tests.',
    goal: 'Validate deterministic object interactions.',
  },
  levelObjective: 'Validate interactions',
  player,
  npcs: [],
  guards: [],
  doors: [],
  interactiveObjects: [interactiveObject],
  actorConversationHistoryByActorId: {},
  levelOutcome: null,
});

describe('WorldObject subclasses', () => {
  it('ContainerObject interact reveals pickup and updates object state', () => {
    const interactiveObject: InteractiveObject = {
      id: 'container-1',
      displayName: 'Supply Crate',
      position: { x: 2, y: 2 },
      objectType: 'supply-crate',
      interactionType: 'inspect',
      state: 'idle',
      pickupItem: {
        itemId: 'key-1',
        displayName: 'Utility Key',
      },
      idleMessage: 'You open the crate.',
      capabilities: {
        containsItems: true,
      },
    };

    const result = new ContainerObject(interactiveObject).interact({
      interactiveObject,
      player,
      worldState: createWorldState(interactiveObject),
    });

    expect(result.responseText).toBe('You open the crate.');
    expect(result.updatedWorldState.player.inventory.items).toEqual([
      {
        itemId: 'key-1',
        displayName: 'Utility Key',
        sourceObjectId: 'container-1',
        pickedUpAtTick: 5,
      },
    ]);
    expect(result.updatedWorldState.interactiveObjects[0].state).toBe('used');
  });

  it('MechanismObject interact marks object used and applies firstUseOutcome once', () => {
    const interactiveObject: InteractiveObject = {
      id: 'mechanism-1',
      displayName: 'Ancient Lever',
      position: { x: 3, y: 2 },
      objectType: 'mechanism',
      interactionType: 'use',
      state: 'idle',
      usedMessage: 'You pull the lever.',
      firstUseOutcome: 'win',
      capabilities: {
        isActivatable: true,
      },
    };

    const result = new MechanismObject(interactiveObject).interact({
      interactiveObject,
      player,
      worldState: createWorldState(interactiveObject),
    });

    expect(result.responseText).toBe('You pull the lever.');
    expect(result.updatedWorldState.interactiveObjects[0].state).toBe('used');
    expect(result.updatedWorldState.levelOutcome).toBe('win');
  });

  it('DoorObject interact derives outcome from door-like facts when explicit outcome is absent', () => {
    const interactiveObject: InteractiveObject = {
      id: 'door-object-1',
      displayName: 'Hidden Door',
      position: { x: 4, y: 2 },
      objectType: 'hidden-door',
      interactionType: 'use',
      state: 'idle',
      facts: {
        outcome: 'danger',
      },
    };

    const result = new DoorObject(interactiveObject).interact({
      interactiveObject,
      player,
      worldState: createWorldState(interactiveObject),
    });

    expect(result.responseText).toBe('You open Hidden Door.');
    expect(result.updatedWorldState.interactiveObjects[0].state).toBe('used');
    expect(result.updatedWorldState.levelOutcome).toBe('lose');
  });
});
