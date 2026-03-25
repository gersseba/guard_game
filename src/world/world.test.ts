import { describe, expect, it } from 'vitest';
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

  it('clamps player movement to the grid bounds', () => {
    const world = createWorld();

    world.applyCommands([{ type: 'move', dx: -10, dy: -10 }]);
    expect(world.getState().player.position).toEqual({ x: 0, y: 0 });

    world.applyCommands([{ type: 'move', dx: 99, dy: 99 }]);
    expect(world.getState().player.position).toEqual({ x: 11, y: 7 });
  });
});