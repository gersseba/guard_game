import { describe, expect, it } from 'vitest';
import { resolveAdjacentTarget } from './adjacencyResolver';
import type { Door, Guard, InteractiveObject, Npc, WorldState } from '../world/types';

const baseState = (): WorldState => ({
  tick: 0,
  grid: { width: 12, height: 8, tileSize: 48 },
  player: { id: 'player-1', displayName: 'Hero', position: { x: 3, y: 3 } },
  npcs: [],
  guards: [],
  doors: [],
  interactiveObjects: [],
  actorConversationHistoryByActorId: {},
  levelOutcome: null,
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
  outcome: 'safe',
});

const makeNpc = (x: number, y: number): Npc => ({
  id: `npc-${x}-${y}`,
  displayName: 'Npc',
  position: { x, y },
  npcType: 'test',
  dialogueContextKey: 'ctx',
});

const makeInteractiveObject = (x: number, y: number): InteractiveObject => ({
  id: `object-${x}-${y}`,
  displayName: 'Supply Crate',
  position: { x, y },
  objectType: 'supply-crate',
  interactionType: 'inspect',
  state: 'idle',
  idleMessage: 'The crate is sealed with iron clasps.',
  usedMessage: 'The crate is already open and empty.',
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

    it('resolves an orthogonally adjacent interactive object', () => {
      const state = baseState();
      state.interactiveObjects = [makeInteractiveObject(3, 4)];
      const result = resolveAdjacentTarget(state);
      expect(result).toEqual({ kind: 'interactiveObject', target: makeInteractiveObject(3, 4) });
    });
  });

  describe('multi-target deterministic tie-break', () => {
    it('selects deterministically by kind priority and target id', () => {
      const state = baseState();
      state.guards = [makeGuard(4, 3), makeGuard(2, 3)];
      state.doors = [makeDoor(3, 2)];
      state.interactiveObjects = [makeInteractiveObject(3, 4)];

      const result = resolveAdjacentTarget(state);

      expect(result).toEqual({ kind: 'guard', target: makeGuard(2, 3) });
    });

    it('prioritizes npc over interactive object when both are adjacent', () => {
      const state = baseState();
      state.npcs = [makeNpc(2, 3)];
      state.interactiveObjects = [makeInteractiveObject(4, 3)];

      const result = resolveAdjacentTarget(state);

      expect(result).toEqual({ kind: 'npc', target: makeNpc(2, 3) });
    });

    it('returns the same target repeatedly for identical state and input sequence', () => {
      const state = baseState();
      state.guards = [makeGuard(4, 3), makeGuard(2, 3)];

      const results = Array.from({ length: 10 }, () => resolveAdjacentTarget(state));

      expect(results.every((result) => result?.kind === 'guard')).toBe(true);
      expect(results.every((result) => result?.target.id === 'guard-2-3')).toBe(true);
    });

    it('stays deterministic when state is reconstructed for each interaction attempt', () => {
      const evaluate = (): string | null => {
        const reconstructedState = baseState();
        reconstructedState.guards = [makeGuard(4, 3), makeGuard(2, 3)];
        reconstructedState.npcs = [makeNpc(3, 4)];
        return resolveAdjacentTarget(reconstructedState)?.target.id ?? null;
      };

      const first = evaluate();
      const second = evaluate();
      const third = evaluate();

      expect(first).toBe('guard-2-3');
      expect(second).toBe(first);
      expect(third).toBe(first);
    });

    it('resolves correctly when only one of multiple guards is adjacent', () => {
      const state = baseState();
      state.guards = [makeGuard(4, 3), makeGuard(10, 10)]; // only first is adjacent
      const result = resolveAdjacentTarget(state);
      expect(result).toEqual({ kind: 'guard', target: makeGuard(4, 3) });
    });
  });
});
