import { describe, expect, it } from 'vitest';
import { canMovePlayerTo, getBlockingOccupants, isInBounds, validateSpatialLayout } from './spatialRules';
import { createInitialWorldState } from './state';

describe('spatialRules', () => {
  it('detects in-bounds and out-of-bounds coordinates', () => {
    const worldState = createInitialWorldState();

    expect(isInBounds({ x: 0, y: 0 }, worldState.grid)).toBe(true);
    expect(isInBounds({ x: worldState.grid.width, y: 0 }, worldState.grid)).toBe(false);
    expect(isInBounds({ x: 0, y: -1 }, worldState.grid)).toBe(false);
  });

  it('returns blocking occupants for npc and interactive object tiles', () => {
    const worldState = createInitialWorldState();

    const npcBlockers = getBlockingOccupants(worldState, { x: 8, y: 3 });
    expect(npcBlockers.map((blocker) => blocker.label)).toEqual(['npc:npc-1']);

    const objectBlockers = getBlockingOccupants(worldState, { x: 4, y: 5 });
    expect(objectBlockers.map((blocker) => blocker.label)).toEqual(['interactiveObject:crate-1']);
  });

  it('allows movement only into in-bounds unoccupied tiles', () => {
    const worldState = createInitialWorldState();

    expect(canMovePlayerTo(worldState, { x: 2, y: 1 })).toBe(true);
    expect(canMovePlayerTo(worldState, { x: -1, y: 1 })).toBe(false);
    expect(canMovePlayerTo(worldState, { x: 8, y: 3 })).toBe(false);
  });

  it('validates a non-overlapping in-bounds layout', () => {
    const worldState = createInitialWorldState();

    expect(() => validateSpatialLayout(worldState)).not.toThrow();
  });

  it('throws deterministic errors for out-of-bounds and overlapping coordinates', () => {
    const worldState = createInitialWorldState();

    const outOfBounds = {
      ...worldState,
      player: {
        ...worldState.player,
        position: { x: worldState.grid.width, y: 0 },
      },
    };

    expect(() => validateSpatialLayout(outOfBounds)).toThrowError(
      `Invalid world layout: player:${worldState.player.id} is out of bounds at (${worldState.grid.width}, 0)`,
    );

    const overlapping = {
      ...worldState,
      npcs: [
        {
          ...worldState.npcs[0],
          position: { ...worldState.player.position },
        },
      ],
    };

    expect(() => validateSpatialLayout(overlapping)).toThrowError(
      `Invalid world layout: overlapping coordinates at (${worldState.player.position.x}, ${worldState.player.position.y}) between player:${worldState.player.id} and npc:${worldState.npcs[0].id}`,
    );
  });
});
