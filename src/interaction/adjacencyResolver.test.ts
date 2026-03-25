import { describe, expect, it } from 'vitest';
import { resolveAdjacentTarget } from './adjacencyResolver';
import type { Door, Guard, Npc, WorldState } from '../world/types';

const baseState = (): WorldState => ({
  tick: 0,
  grid: { width: 12, height: 8, tileSize: 48 },
  player: { id: 'player-1', displayName: 'Hero', position: { x: 3, y: 3 } },
  npcs: [],
  guards: [],
  doors: [],
  interactiveObjects: [],
});

const makeGuard = (x: number, y: number): Guard => ({
  id: `guard-${x}-${y}`,
  displayName: 'Guard',
  position: { x, y },
  guardState: 'idle',
});

const makeDoor = (x: number, y: number): Door => ({
  id: `door-${x}-${y}`,
  displayName: 'Door',
  position: { x, y },
  doorState: 'closed',
});

const makeNpc = (x: number, y: number): Npc => ({
  id: `npc-${x}-${y}`,
  displayName: 'Npc',
  position: { x, y },
  dialogueContextKey: 'ctx',
});

describe('resolveAdjacentTarget', () => {
  describe('no-target cases (silent no-op)', () => {
    it('returns null when there are no interactables', () => {
      expect(resolveAdjacentTarget(baseState())).toBeNull();
    });

    it('returns null when all interactables are on the same tile as the player', () => {
      const state = baseState();
      state.guards = [makeGuard(3, 3)];
      state.doors = [makeDoor(3, 3)];
      expect(resolveAdjacentTarget(state)).toBeNull();
    });

    it('returns null for diagonal targets (distance 1 but not orthogonal)', () => {
      const state = baseState();
      state.guards = [makeGuard(4, 4), makeGuard(2, 4), makeGuard(4, 2), makeGuard(2, 2)];
      expect(resolveAdjacentTarget(state)).toBeNull();
    });

    it('returns null when closest target is at Manhattan distance 2', () => {
      const state = baseState();
      state.guards = [makeGuard(5, 3)]; // distance 2 right
      state.doors = [makeDoor(3, 5)]; // distance 2 down
      expect(resolveAdjacentTarget(state)).toBeNull();
    });
  });

  describe('single-target resolution', () => {
    it('resolves an orthogonally adjacent guard directly to the right', () => {
      const state = baseState();
      state.guards = [makeGuard(4, 3)];
      const result = resolveAdjacentTarget(state);
      expect(result).toEqual({ kind: 'guard', target: makeGuard(4, 3) });
    });

    it('resolves an orthogonally adjacent guard directly to the left', () => {
      const state = baseState();
      state.guards = [makeGuard(2, 3)];
      const result = resolveAdjacentTarget(state);
      expect(result).toEqual({ kind: 'guard', target: makeGuard(2, 3) });
    });

    it('resolves an orthogonally adjacent guard directly above', () => {
      const state = baseState();
      state.guards = [makeGuard(3, 2)];
      const result = resolveAdjacentTarget(state);
      expect(result).toEqual({ kind: 'guard', target: makeGuard(3, 2) });
    });

    it('resolves an orthogonally adjacent guard directly below', () => {
      const state = baseState();
      state.guards = [makeGuard(3, 4)];
      const result = resolveAdjacentTarget(state);
      expect(result).toEqual({ kind: 'guard', target: makeGuard(3, 4) });
    });

    it('resolves an orthogonally adjacent door', () => {
      const state = baseState();
      state.doors = [makeDoor(4, 3)];
      const result = resolveAdjacentTarget(state);
      expect(result).toEqual({ kind: 'door', target: makeDoor(4, 3) });
    });

    it('resolves an orthogonally adjacent npc', () => {
      const state = baseState();
      state.npcs = [makeNpc(3, 4)];
      const result = resolveAdjacentTarget(state);
      expect(result).toEqual({ kind: 'npc', target: makeNpc(3, 4) });
    });
  });

  describe('multi-target random tie-break', () => {
    it('selects the first candidate when randomFn returns 0', () => {
      const state = baseState();
      state.guards = [makeGuard(4, 3), makeGuard(2, 3)];
      const result = resolveAdjacentTarget(state, () => 0);
      expect(result).toEqual({ kind: 'guard', target: makeGuard(4, 3) });
    });

    it('selects the last candidate when randomFn returns just below 1', () => {
      const state = baseState();
      state.guards = [makeGuard(4, 3), makeGuard(2, 3)];
      const result = resolveAdjacentTarget(state, () => 0.999);
      expect(result).toEqual({ kind: 'guard', target: makeGuard(2, 3) });
    });

    it('both candidates are reachable via the random tie-break', () => {
      const state = baseState();
      const guardA = makeGuard(4, 3);
      const guardB = makeGuard(2, 3);
      state.guards = [guardA, guardB];

      const firstResult = resolveAdjacentTarget(state, () => 0);
      const secondResult = resolveAdjacentTarget(state, () => 0.999);

      expect(firstResult?.target.id).toBe(guardA.id);
      expect(secondResult?.target.id).toBe(guardB.id);
    });

    it('resolves correctly when only one of multiple guards is adjacent', () => {
      const state = baseState();
      state.guards = [makeGuard(4, 3), makeGuard(10, 10)]; // only first is adjacent
      const result = resolveAdjacentTarget(state);
      expect(result).toEqual({ kind: 'guard', target: makeGuard(4, 3) });
    });
  });
});
