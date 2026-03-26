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
    expect(world.getState().tick).toBe(1);
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
          dialogueContextKey: 'npc-blocker',
          position: { x: 3, y: 2 },
        },
      ],
      interactiveObjects: [
        {
          id: 'object-blocker',
          displayName: 'Object blocker',
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
});