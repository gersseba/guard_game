import { describe, expect, it } from 'vitest';
import { canMovePlayerTo } from '../spatialRules';
import { createInitialWorldState } from '../state';
import { Item } from './items/Item';
import {
  mapEnvironmentDtoToRuntime,
  mapGuardDtoToRuntime,
  mapInteractiveObjectDtoToRuntime,
  mapInventoryItemDtoToRuntime,
  mapNpcDtoToRuntime,
} from './dtoRuntimeSeams';
import { Environment } from './environment/Environment';
import { GuardNpc } from './npcs/GuardNpc';
import { Npc } from './npcs/Npc';
import { ContainerObject } from './objects/ContainerObject';
import { DoorObject } from './objects/DoorObject';
import { InertObject } from './objects/InertObject';
import { MechanismObject } from './objects/MechanismObject';

describe('class-based world realignment', () => {
  it('maps DTOs to runtime class instances with stable JSON shape', () => {
    const npc = mapNpcDtoToRuntime({
      id: 'npc-1',
      displayName: 'Archivist',
      x: 2,
      y: 3,
      npcType: 'archive_keeper',
    });
    const guard = mapGuardDtoToRuntime({
      id: 'guard-1',
      displayName: 'Gate Guard',
      x: 4,
      y: 3,
      guardState: 'idle',
    });
    const environment = mapEnvironmentDtoToRuntime({
      id: 'env-1',
      displayName: 'Stone Wall',
      x: 5,
      y: 3,
      isBlocking: true,
    });

    expect(npc).toBeInstanceOf(Npc);
    expect(guard).toBeInstanceOf(GuardNpc);
    expect(environment).toBeInstanceOf(Environment);
    expect(JSON.parse(JSON.stringify(npc))).toMatchObject({
      id: 'npc-1',
      position: { x: 2, y: 3 },
      npcType: 'archive_keeper',
      dialogueContextKey: 'npc_archive_keeper',
    });
  });

  it('keeps polymorphic interactive-object mapping deterministic', () => {
    const container = mapInteractiveObjectDtoToRuntime({
      id: 'obj-container',
      displayName: 'Crate',
      position: { x: 1, y: 1 },
      objectType: 'supply-crate',
      interactionType: 'inspect',
      state: 'idle',
      capabilities: { containsItems: true },
    });
    const mechanism = mapInteractiveObjectDtoToRuntime({
      id: 'obj-mechanism',
      displayName: 'Mechanism',
      position: { x: 2, y: 1 },
      objectType: 'mechanism',
      interactionType: 'use',
      state: 'idle',
    });
    const door = mapInteractiveObjectDtoToRuntime({
      id: 'obj-door',
      displayName: 'Service Door',
      position: { x: 3, y: 1 },
      objectType: 'service-door',
      interactionType: 'use',
      state: 'idle',
    });
    const inert = mapInteractiveObjectDtoToRuntime({
      id: 'obj-inert',
      displayName: 'Statue',
      position: { x: 4, y: 1 },
      objectType: 'decoration',
      interactionType: 'inspect',
      state: 'idle',
    });

    expect(container).toBeInstanceOf(ContainerObject);
    expect(mechanism).toBeInstanceOf(MechanismObject);
    expect(door).toBeInstanceOf(DoorObject);
    expect(inert).toBeNull();

    const storedInert = new InertObject({
      id: 'obj-inert',
      displayName: 'Statue',
      position: { x: 4, y: 1 },
      objectType: 'decoration',
      interactionType: 'inspect',
      state: 'idle',
    });
    expect(JSON.parse(JSON.stringify(storedInert))).toEqual({
      id: 'obj-inert',
      displayName: 'Statue',
      position: { x: 4, y: 1 },
      objectType: 'decoration',
      interactionType: 'inspect',
      state: 'idle',
    });
  });

  it('preserves deterministic item lifecycle conversions and transfer ordering', () => {
    const mappedItem = mapInventoryItemDtoToRuntime({
      itemId: 'token',
      displayName: 'Token',
      sourceObjectId: 'crate-1',
      pickedUpAtTick: 7,
    });

    expect(mappedItem).toBeInstanceOf(Item);
    expect(mappedItem.toInventoryItem()).toEqual({
      itemId: 'token',
      displayName: 'Token',
      sourceObjectId: 'crate-1',
      pickedUpAtTick: 7,
    });

    const transfer = Item.takeFirstByItemId(
      [
        { itemId: 'apple', displayName: 'Apple', sourceObjectId: 'crate-a', pickedUpAtTick: 1 },
        { itemId: 'token', displayName: 'Token A', sourceObjectId: 'crate-b', pickedUpAtTick: 2 },
        { itemId: 'token', displayName: 'Token B', sourceObjectId: 'crate-c', pickedUpAtTick: 3 },
      ],
      'token',
    );

    expect(transfer.item?.toInventoryItem()).toEqual({
      itemId: 'token',
      displayName: 'Token A',
      sourceObjectId: 'crate-b',
      pickedUpAtTick: 2,
    });
    expect(transfer.remainingItems).toEqual([
      { itemId: 'apple', displayName: 'Apple', sourceObjectId: 'crate-a', pickedUpAtTick: 1 },
      { itemId: 'token', displayName: 'Token B', sourceObjectId: 'crate-c', pickedUpAtTick: 3 },
    ]);
  });

  it('applies environment blocking flags through shared spatial rules', () => {
    const base = createInitialWorldState();
    const wall = mapEnvironmentDtoToRuntime({
      id: 'wall-1',
      displayName: 'Wall',
      x: 2,
      y: 1,
      isBlocking: true,
    });
    const grass = mapEnvironmentDtoToRuntime({
      id: 'grass-1',
      displayName: 'Grass',
      x: 3,
      y: 1,
      isBlocking: false,
    });

    const withEnvironments = {
      ...base,
      environments: [wall, grass],
    };

    expect(canMovePlayerTo(withEnvironments, { x: 2, y: 1 })).toBe(false);
    expect(canMovePlayerTo(withEnvironments, { x: 3, y: 1 })).toBe(true);
  });
});
