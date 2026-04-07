import { describe, expect, it } from 'vitest';
import { handleObjectInteraction } from './objectInteraction';
import type { InteractiveObject, Player, WorldState } from '../world/types';

const player: Player = {
  id: 'player-1',
  displayName: 'Hero',
  position: { x: 3, y: 3 },
  inventory: {
    items: [],
  },
};

const makeContainerObject = (
  id: string,
  state: InteractiveObject['state'],
  overrides: Partial<InteractiveObject> = {},
): InteractiveObject => ({
  id,
  displayName: 'Supply Container',
  position: { x: 4, y: 3 },
  objectType: 'supply-crate',
  interactionType: 'inspect',
  state,
  capabilities: { containsItems: true },
  idleMessage: 'You open the container and find items.',
  usedMessage: 'The container is empty now.',
  ...overrides,
});

const makeActivatableObject = (
  id: string,
  state: InteractiveObject['state'],
  overrides: Partial<InteractiveObject> = {},
): InteractiveObject => ({
  id,
  displayName: 'Activation Device',
  position: { x: 5, y: 3 },
  objectType: 'mechanism',
  interactionType: 'use',
  state,
  capabilities: { isActivatable: true },
  idleMessage: 'The device looks ready to activate.',
  usedMessage: 'The device has been activated.',
  ...overrides,
});

const makeInertObject = (
  id: string,
  overrides: Partial<InteractiveObject> = {},
): InteractiveObject => ({
  id,
  displayName: 'Decorative Object',
  position: { x: 6, y: 3 },
  objectType: 'decoration',
  interactionType: 'inspect',
  state: 'idle',
  // No capabilities - decorative only
  ...overrides,
});

const makeDoorLikeObject = (
  id: string,
  state: InteractiveObject['state'],
  overrides: Partial<InteractiveObject> = {},
): InteractiveObject => ({
  id,
  displayName: 'Service Door',
  position: { x: 2, y: 3 },
  objectType: 'service-door',
  interactionType: 'use',
  state,
  idleMessage: 'You open the service door.',
  usedMessage: 'The service door is already open.',
  ...overrides,
});

const createWorldState = (...interactiveObjects: InteractiveObject[]): WorldState => ({
  tick: 0,
  grid: { width: 10, height: 10, tileSize: 32 },
  levelMetadata: {
    name: 'Test Level',
    premise: 'Fixture for object interaction tests.',
    goal: 'Interact with nearby objects.',
  },
  levelObjective: 'Inspect nearby objects for clues.',
  player,
  npcs: [],
  guards: [],
  doors: [],
  interactiveObjects,
  actorConversationHistoryByActorId: {},
  levelOutcome: null,
});

describe('handleObjectInteraction', () => {
  describe('container objects (containsItems capability)', () => {
    it('reveals items from a container on first interaction', () => {
      const container = makeContainerObject('container-a', 'idle', {
        idleMessage: 'You lift the lid and uncover a brass key.',
        pickupItem: {
          itemId: 'brass-key',
          displayName: 'Brass Key',
        },
        firstUseOutcome: 'win',
      });
      const worldState = createWorldState(container);

      const result = handleObjectInteraction({
        interactiveObject: container,
        player,
        worldState,
      });

      expect(result.objectId).toBe('container-a');
      expect(result.responseText).toBe('You lift the lid and uncover a brass key.');
      expect(result.updatedWorldState.levelOutcome).toBe('win');
      expect(result.updatedWorldState.interactiveObjects[0].state).toBe('used');
      expect(result.updatedWorldState.player.inventory.items).toEqual([
        {
          itemId: 'brass-key',
          displayName: 'Brass Key',
          sourceObjectId: 'container-a',
          pickedUpAtTick: 0,
        },
      ]);
    });

    it('returns used-state message on repeat interaction and does not re-trigger first-use outcome', () => {
      const container = makeContainerObject('container-b', 'used', {
        usedMessage: 'Only splinters remain inside the container.',
        firstUseOutcome: 'lose',
      });
      const worldState = createWorldState(container);

      const result = handleObjectInteraction({
        interactiveObject: container,
        player,
        worldState,
      });

      expect(result.responseText).toBe('Only splinters remain inside the container.');
      expect(result.updatedWorldState.levelOutcome).toBeNull();
      expect(result.updatedWorldState.interactiveObjects[0].state).toBe('used');
      expect(result.updatedWorldState.player.inventory.items).toEqual([]);
    });

    it('does not duplicate pickup from the same object instance across repeated interactions', () => {
      const container = makeContainerObject('container-repeat', 'idle', {
        pickupItem: {
          itemId: 'field-rations',
          displayName: 'Field Rations',
        },
      });

      const firstResult = handleObjectInteraction({
        interactiveObject: container,
        player,
        worldState: createWorldState(container),
      });

      const secondResult = handleObjectInteraction({
        interactiveObject: firstResult.updatedWorldState.interactiveObjects[0],
        player,
        worldState: firstResult.updatedWorldState,
      });

      expect(firstResult.updatedWorldState.player.inventory.items).toHaveLength(1);
      expect(secondResult.updatedWorldState.player.inventory.items).toHaveLength(1);
      expect(secondResult.updatedWorldState.player.inventory.items[0]).toEqual({
        itemId: 'field-rations',
        displayName: 'Field Rations',
        sourceObjectId: 'container-repeat',
        pickedUpAtTick: 0,
      });
    });

    it('preserves selected inventory slot while adding a picked item', () => {
      const container = makeContainerObject('container-selected-slot', 'idle', {
        pickupItem: {
          itemId: 'new-token',
          displayName: 'New Token',
        },
      });
      const worldState = {
        ...createWorldState(container),
        player: {
          ...player,
          inventory: {
            items: [
              {
                itemId: 'existing-token',
                displayName: 'Existing Token',
                sourceObjectId: 'stash-1',
                pickedUpAtTick: 0,
              },
            ],
            selectedItem: {
              slotIndex: 0,
              itemId: 'existing-token',
            },
          },
        },
      };

      const result = handleObjectInteraction({
        interactiveObject: container,
        player: worldState.player,
        worldState,
      });

      expect(result.updatedWorldState.player.inventory.selectedItem).toEqual({
        slotIndex: 0,
        itemId: 'existing-token',
      });
      expect(result.updatedWorldState.player.inventory.items).toEqual([
        {
          itemId: 'existing-token',
          displayName: 'Existing Token',
          sourceObjectId: 'stash-1',
          pickedUpAtTick: 0,
        },
        {
          itemId: 'new-token',
          displayName: 'New Token',
          sourceObjectId: 'container-selected-slot',
          pickedUpAtTick: 0,
        },
      ]);
    });

    it('keeps per-instance outcomes distinct between different containers', () => {
      const winningContainer = makeContainerObject('container-win', 'idle', {
        idleMessage: 'You find the evacuation signal flare.',
        firstUseOutcome: 'win',
      });
      const neutralContainer = makeContainerObject('container-neutral', 'idle', {
        idleMessage: 'You find rope and a water skin.',
      });

      const winningResult = handleObjectInteraction({
        interactiveObject: winningContainer,
        player,
        worldState: createWorldState(winningContainer, neutralContainer),
      });
      const neutralResult = handleObjectInteraction({
        interactiveObject: neutralContainer,
        player,
        worldState: createWorldState(winningContainer, neutralContainer),
      });

      expect(winningResult.responseText).toBe('You find the evacuation signal flare.');
      expect(winningResult.updatedWorldState.levelOutcome).toBe('win');
      expect(neutralResult.responseText).toBe('You find rope and a water skin.');
      expect(neutralResult.updatedWorldState.levelOutcome).toBeNull();
    });
  });

  describe('activatable objects (isActivatable capability)', () => {
    it('activates an object and triggers firstUseOutcome on first interaction', () => {
      const mechanism = makeActivatableObject('mechanism-a', 'idle', {
        idleMessage: 'A complex mechanical lock. It looks ready to activate.',
        usedMessage: 'The mechanism has been activated.',
        firstUseOutcome: 'win',
      });
      const worldState = createWorldState(mechanism);

      const result = handleObjectInteraction({
        interactiveObject: mechanism,
        player,
        worldState,
      });

      expect(result.objectId).toBe('mechanism-a');
      expect(result.responseText).toBe('The mechanism has been activated.');
      expect(result.updatedWorldState.levelOutcome).toBe('win');
      expect(result.updatedWorldState.interactiveObjects[0].state).toBe('used');
      expect(result.updatedWorldState.player.inventory.items).toEqual([]);
    });

    it('uses default message if usedMessage is not provided after activation', () => {
      const mechanism = makeActivatableObject('mechanism-b', 'idle', {
        usedMessage: undefined,
      });
      const worldState = createWorldState(mechanism);

      const result = handleObjectInteraction({
        interactiveObject: mechanism,
        player,
        worldState,
      });

      expect(result.responseText).toBe('You activate the Activation Device.');
      expect(result.updatedWorldState.interactiveObjects[0].state).toBe('used');
    });

    it('does not re-trigger firstUseOutcome on repeat activation', () => {
      const mechanism = makeActivatableObject('mechanism-c', 'used', {
        usedMessage: 'The mechanism is already activated.',
        firstUseOutcome: 'win',
      });
      const worldState = createWorldState(mechanism);

      const result = handleObjectInteraction({
        interactiveObject: mechanism,
        player,
        worldState,
      });

      expect(result.responseText).toBe('The mechanism is already activated.');
      expect(result.updatedWorldState.levelOutcome).toBeNull();
    });

    it('uses polymorphic mechanism dispatch for mechanism objectType even without capabilities flags', () => {
      const mechanism = makeActivatableObject('mechanism-polymorphic', 'idle', {
        capabilities: undefined,
      });
      const worldState = createWorldState(mechanism);

      const result = handleObjectInteraction({
        interactiveObject: mechanism,
        player,
        worldState,
      });

      expect(result.responseText).toBe('The device has been activated.');
      expect(result.updatedWorldState.interactiveObjects[0].state).toBe('used');
    });
  });

  describe('door-like interactive objects', () => {
    it('uses door-object polymorphism and maps safe/danger facts to level outcome when explicit firstUseOutcome is absent', () => {
      const safeDoorObject = makeDoorLikeObject('door-object-safe', 'idle', {
        facts: {
          outcome: 'safe',
        },
      });

      const safeResult = handleObjectInteraction({
        interactiveObject: safeDoorObject,
        player,
        worldState: createWorldState(safeDoorObject),
      });

      expect(safeResult.responseText).toBe('You open the service door.');
      expect(safeResult.updatedWorldState.levelOutcome).toBe('win');
      expect(safeResult.updatedWorldState.interactiveObjects[0].state).toBe('used');

      const dangerDoorObject = makeDoorLikeObject('door-object-danger', 'idle', {
        facts: {
          outcome: 'danger',
        },
      });

      const dangerResult = handleObjectInteraction({
        interactiveObject: dangerDoorObject,
        player,
        worldState: createWorldState(dangerDoorObject),
      });

      expect(dangerResult.updatedWorldState.levelOutcome).toBe('lose');
    });

    it('prioritizes explicit firstUseOutcome over door-like facts outcome', () => {
      const doorObject = makeDoorLikeObject('door-object-explicit', 'idle', {
        firstUseOutcome: 'lose',
        facts: {
          outcome: 'safe',
        },
      });

      const result = handleObjectInteraction({
        interactiveObject: doorObject,
        player,
        worldState: createWorldState(doorObject),
      });

      expect(result.updatedWorldState.levelOutcome).toBe('lose');
    });

    it('does not retrigger door-like fact outcome after first interaction', () => {
      const doorObject = makeDoorLikeObject('door-object-repeat', 'used', {
        facts: {
          outcome: 'safe',
        },
      });

      const result = handleObjectInteraction({
        interactiveObject: doorObject,
        player,
        worldState: createWorldState(doorObject),
      });

      expect(result.responseText).toBe('The service door is already open.');
      expect(result.updatedWorldState.levelOutcome).toBeNull();
    });
  });

  describe('inert objects (no capabilities)', () => {
    it('returns no-action response for object without capabilities', () => {
      const inert = makeInertObject('inert-a');
      const worldState = createWorldState(inert);

      const result = handleObjectInteraction({
        interactiveObject: inert,
        player,
        worldState,
      });

      expect(result.objectId).toBe('inert-a');
      expect(result.responseText).toBe('Decorative Object cannot be interacted with.');
      expect(result.updatedWorldState).toEqual(worldState);
      expect(result.updatedWorldState.interactiveObjects[0].state).toBe('idle');
    });

    it('returns no-action response for object with empty capabilities', () => {
      const inert = makeInertObject('inert-b', {
        capabilities: {},
      });
      const worldState = createWorldState(inert);

      const result = handleObjectInteraction({
        interactiveObject: inert,
        player,
        worldState,
      });

      expect(result.responseText).toBe('Decorative Object cannot be interacted with.');
      expect(result.updatedWorldState).toEqual(worldState);
    });
  });

  describe('capability priority', () => {
    it('prioritizes containsItems over isActivatable when both are present', () => {
      const hybrid = makeContainerObject('hybrid-a', 'idle', {
        capabilities: { containsItems: true, isActivatable: true },
        pickupItem: {
          itemId: 'hybrid-item',
          displayName: 'Hybrid Item',
        },
      });
      const worldState = createWorldState(hybrid);

      const result = handleObjectInteraction({
        interactiveObject: hybrid,
        player,
        worldState,
      });

      // Should treat as container (containsItems takes priority)
      expect(result.updatedWorldState.player.inventory.items).toEqual([
        {
          itemId: 'hybrid-item',
          displayName: 'Hybrid Item',
          sourceObjectId: 'hybrid-a',
          pickedUpAtTick: 0,
        },
      ]);
    });
  });

  describe('backward compatibility', () => {
    it('works with objects that have no explicit capabilities field', () => {
      const objectWithoutCapabilities: InteractiveObject = {
        id: 'legacy-obj',
        displayName: 'Legacy Object',
        position: { x: 7, y: 3 },
        objectType: 'legacy-type',
        interactionType: 'inspect',
        state: 'idle',
        // No capabilities field defined - uses undefined as default
      };
      const worldState = createWorldState(objectWithoutCapabilities);

      const result = handleObjectInteraction({
        interactiveObject: objectWithoutCapabilities,
        player,
        worldState,
      });

      expect(result.responseText).toBe('Legacy Object cannot be interacted with.');
      expect(result.updatedWorldState).toEqual(worldState);
    });
  });
});
