import { describe, expect, it } from 'vitest';
import { Environment } from './environment/Environment';
import { Item } from './items/Item';
import { mapGuardDtoToRuntime, mapInteractiveObjectDtoToRuntime, mapNpcDtoToRuntime } from './dtoRuntimeSeams';
import { GuardNpc } from './npcs/GuardNpc';
import { Npc } from './npcs/Npc';
import { ContainerObject } from './objects/ContainerObject';
import { DoorObject } from './objects/DoorObject';
import { MechanismObject } from './objects/MechanismObject';

describe('domain class foundation seams', () => {
  it('instantiates foundational classes and maps NPC dto to runtime class without runtime integration', () => {
    const item = new Item({
      itemId: 'item-1',
      displayName: 'Bronze Key',
      sourceObjectId: 'crate-1',
      pickedUpAtTick: 3,
    });
    const environment = new Environment({
      id: 'env-1',
      position: { x: 3, y: 4 },
      displayName: 'Stone Wall',
      isBlocking: true,
    });

    const npc = mapNpcDtoToRuntime({
      id: 'npc-1',
      displayName: 'Archivist',
      position: { x: 5, y: 6 },
      npcType: 'archive_keeper',
      dialogueContextKey: 'archive_keeper_intro',
      patrol: { path: [{ x: 5, y: 6 }, { x: 6, y: 6 }] },
    });

    expect(item.toInventoryItem()).toEqual({
      itemId: 'item-1',
      displayName: 'Bronze Key',
      sourceObjectId: 'crate-1',
      pickedUpAtTick: 3,
    });
    expect(environment.isBlocking).toBe(true);
    expect(npc).toBeInstanceOf(Npc);
    expect(npc.npcType).toBe('archive_keeper');
    expect(JSON.parse(JSON.stringify(npc))).toMatchObject({
      id: 'npc-1',
      displayName: 'Archivist',
      position: { x: 5, y: 6 },
      npcType: 'archive_keeper',
      dialogueContextKey: 'archive_keeper_intro',
    });
  });

  it('maps guard dto to GuardNpc runtime class with serializable guard shape', () => {
    const guard = mapGuardDtoToRuntime({
      id: 'guard-1',
      displayName: 'North Gate Guard',
      position: { x: 3, y: 2 },
      guardState: 'idle',
      itemUseRules: {
        token: {
          allowed: true,
          responseText: 'Pass granted.',
        },
      },
    });

    expect(guard).toBeInstanceOf(GuardNpc);
    expect(guard).toBeInstanceOf(Npc);
    expect(guard.guardState).toBe('idle');
    expect(guard.itemUseRules?.token).toEqual({
      allowed: true,
      responseText: 'Pass granted.',
    });
    expect(JSON.parse(JSON.stringify(guard))).toEqual({
      id: 'guard-1',
      displayName: 'North Gate Guard',
      position: { x: 3, y: 2 },
      guardState: 'idle',
      itemUseRules: {
        token: {
          allowed: true,
          responseText: 'Pass granted.',
        },
      },
    });
  });

  it('maps interactive object dto to the expected polymorphic world object class', () => {
    const containerRuntime = mapInteractiveObjectDtoToRuntime({
      id: 'obj-container',
      displayName: 'Crate',
      position: { x: 1, y: 1 },
      objectType: 'supply-crate',
      interactionType: 'inspect',
      state: 'idle',
      capabilities: {
        containsItems: true,
      },
    });

    const mechanismRuntime = mapInteractiveObjectDtoToRuntime({
      id: 'obj-mechanism',
      displayName: 'Mechanism',
      position: { x: 2, y: 1 },
      objectType: 'mechanism',
      interactionType: 'use',
      state: 'idle',
    });

    const doorRuntime = mapInteractiveObjectDtoToRuntime({
      id: 'obj-door',
      displayName: 'Service Door',
      position: { x: 3, y: 1 },
      objectType: 'service-door',
      interactionType: 'use',
      state: 'idle',
    });

    const inertRuntime = mapInteractiveObjectDtoToRuntime({
      id: 'obj-inert',
      displayName: 'Statue',
      position: { x: 4, y: 1 },
      objectType: 'decoration',
      interactionType: 'inspect',
      state: 'idle',
    });

    expect(containerRuntime).toBeInstanceOf(ContainerObject);
    expect(mechanismRuntime).toBeInstanceOf(MechanismObject);
    expect(doorRuntime).toBeInstanceOf(DoorObject);
    expect(inertRuntime).toBeNull();
  });
});
