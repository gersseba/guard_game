import { describe, expect, it, vi } from 'vitest';
import * as spatialRules from './spatialRules';
import { createWorld } from './world';

describe('createWorld', () => {
  it('applies movement commands deterministically in order', () => {
    const world = createWorld();

    world.applyCommands([
      { type: 'move', dx: 1, dy: 0 },
      { type: 'move', dx: 0, dy: 1 },
      { type: 'move', dx: -1, dy: 0 },
    ]);

    expect(world.getState().player.position).toEqual({ x: 1, y: 2 });
    expect(world.getState().player.facingDirection).toBe('left');
    expect(world.getState().tick).toBe(1);
  });

  it('maps directional movement input to facing direction deterministically', () => {
    const world = createWorld();

    world.applyCommands([{ type: 'move', dx: -1, dy: 0 }]);
    expect(world.getState().player.facingDirection).toBe('left');

    world.applyCommands([{ type: 'move', dx: 1, dy: 0 }]);
    expect(world.getState().player.facingDirection).toBe('right');

    world.applyCommands([{ type: 'move', dx: 0, dy: -1 }]);
    expect(world.getState().player.facingDirection).toBe('away');

    world.applyCommands([{ type: 'move', dx: 0, dy: 1 }]);
    expect(world.getState().player.facingDirection).toBe('front');
  });

  it('updates facing direction from movement intent even when movement is blocked', () => {
    const world = createWorld();

    world.resetToState({
      ...world.getState(),
      player: {
        ...world.getState().player,
        position: { x: 2, y: 2 },
      },
      npcs: [
        {
          id: 'npc-blocker',
          displayName: 'Npc blocker',
          npcType: 'blocker',
          dialogueContextKey: 'npc-blocker',
          position: { x: 2, y: 1 },
        },
      ],
    });

    world.applyCommands([{ type: 'move', dx: 0, dy: -1 }]);

    expect(world.getState().player.position).toEqual({ x: 2, y: 2 });
    expect(world.getState().player.facingDirection).toBe('away');
  });

  it('keeps player position unchanged when movement goes out of bounds', () => {
    const world = createWorld();

    world.applyCommands([{ type: 'move', dx: -10, dy: -10 }]);
    expect(world.getState().player.position).toEqual({ x: 1, y: 1 });

    world.applyCommands([
      { type: 'move', dx: 10, dy: 6 },
      { type: 'move', dx: 1, dy: 0 },
    ]);
    expect(world.getState().player.position).toEqual({ x: 11, y: 7 });
  });

  it('blocks movement into occupied npc, interactive object, guard, and door tiles', () => {
    const world = createWorld();
    const baseState = world.getState();

    world.resetToState({
      ...baseState,
      player: {
        ...baseState.player,
        position: { x: 2, y: 2 },
      },
      npcs: [
        {
          id: 'npc-blocker',
          displayName: 'Npc blocker',
          npcType: 'blocker',
          dialogueContextKey: 'npc-blocker',
          position: { x: 3, y: 2 },
        },
      ],
      interactiveObjects: [
        {
          id: 'object-blocker',
          displayName: 'Object blocker',
          objectType: 'supply-crate',
          interactionType: 'inspect',
          state: 'idle',
          position: { x: 2, y: 3 },
        },
      ],
      guards: [
        {
          id: 'guard-blocker',
          displayName: 'Guard blocker',
          guardState: 'idle',
          position: { x: 1, y: 2 },
        },
      ],
      doors: [
        {
          id: 'door-blocker',
          displayName: 'Door blocker',
          doorState: 'closed',
          position: { x: 2, y: 1 },
        },
      ],
    });

    world.applyCommands([{ type: 'move', dx: 1, dy: 0 }]);
    expect(world.getState().player.position).toEqual({ x: 2, y: 2 });

    world.applyCommands([{ type: 'move', dx: 0, dy: 1 }]);
    expect(world.getState().player.position).toEqual({ x: 2, y: 2 });

    world.applyCommands([{ type: 'move', dx: -1, dy: 0 }]);
    expect(world.getState().player.position).toEqual({ x: 2, y: 2 });

    world.applyCommands([{ type: 'move', dx: 0, dy: -1 }]);
    expect(world.getState().player.position).toEqual({ x: 2, y: 2 });
  });

  it('uses the shared spatial rule path for runtime movement checks', () => {
    const world = createWorld();
    const canMoveSpy = vi.spyOn(spatialRules, 'canMovePlayerTo');

    world.applyCommands([{ type: 'move', dx: 1, dy: 0 }]);

    expect(canMoveSpy).toHaveBeenCalledTimes(1);
    expect(canMoveSpy).toHaveBeenCalledWith(expect.any(Object), { x: 2, y: 1 });
  });

  it('selects a valid inventory slot deterministically', () => {
    const world = createWorld();
    const baseState = world.getState();

    world.resetToState({
      ...baseState,
      player: {
        ...baseState.player,
        inventory: {
          ...baseState.player.inventory,
          items: [
            {
              itemId: 'key-bronze',
              displayName: 'Bronze Key',
              sourceObjectId: 'crate-1',
              pickedUpAtTick: 0,
            },
            {
              itemId: 'gem-blue',
              displayName: 'Blue Gem',
              sourceObjectId: 'crate-2',
              pickedUpAtTick: 0,
            },
          ],
          selectedItem: null,
        },
      },
    });

    world.applyCommands([{ type: 'selectInventorySlot', slotIndex: 1 }]);

    expect(world.getState().player.inventory.selectedItem).toEqual({
      slotIndex: 1,
      itemId: 'gem-blue',
    });
  });

  it('clears selected inventory item when selecting an invalid slot index', () => {
    const world = createWorld();
    const baseState = world.getState();

    world.resetToState({
      ...baseState,
      player: {
        ...baseState.player,
        inventory: {
          ...baseState.player.inventory,
          items: [
            {
              itemId: 'key-bronze',
              displayName: 'Bronze Key',
              sourceObjectId: 'crate-1',
              pickedUpAtTick: 0,
            },
          ],
          selectedItem: {
            slotIndex: 0,
            itemId: 'key-bronze',
          },
        },
      },
    });

    world.applyCommands([{ type: 'selectInventorySlot', slotIndex: 9 }]);

    expect(world.getState().player.inventory.selectedItem).toBeNull();
  });
});