import { describe, expect, it } from 'vitest';
import { createWorld } from './world';
import { resolveIntent, resolveMoveIntent } from './intentResolver';
import type { Intent } from './types';

describe('intentResolver', () => {
  describe('resolveMoveIntent', () => {
    it('moves player to empty adjacent cell using cardinal direction', () => {
      const world = createWorld();
      const state = world.getState();

      const moveIntent: Intent = {
        actorId: state.player.id,
        type: 'move',
        payload: { direction: 'right' },
      };

      const nextState = resolveMoveIntent(state, moveIntent);

      expect(nextState.player.position).toEqual({ x: 2, y: 1 });
      expect(nextState.player.facingDirection).toBe('right');
    });

    it('moves player using arbitrary delta movement vector', () => {
      const world = createWorld();
      const state = world.getState();

      const moveIntent: Intent = {
        actorId: state.player.id,
        type: 'move',
        payload: { delta: { dx: 5, dy: 3 } },
      };

      const nextState = resolveMoveIntent(state, moveIntent);

      expect(nextState.player.position).toEqual({ x: 6, y: 4 });
    });

    it('updates facing direction and blocks move when target is out of bounds', () => {
      const world = createWorld();
      const baseState = world.getState();

      // Move player to top-left corner, then try to move further out
      world.resetToState({
        ...baseState,
        player: {
          ...baseState.player,
          position: { x: 0, y: 0 },
        },
      });

      const state = world.getState();
      const moveIntent: Intent = {
        actorId: state.player.id,
        type: 'move',
        payload: { direction: 'up' },
      };

      const nextState = resolveMoveIntent(state, moveIntent);

      expect(nextState.player.position).toEqual({ x: 0, y: 0 }); // blocked at boundary
      expect(nextState.player.facingDirection).toBe('away'); // facing updated even though blocked
    });

    it('blocks move and updates facing when NPC occupies target cell', () => {
      const world = createWorld();
      const baseState = world.getState();

      world.resetToState({
        ...baseState,
        npcs: [
          {
            id: 'npc-1',
            displayName: 'Test NPC',
            npcType: 'blocker',
            dialogueContextKey: 'test-npc',
            position: { x: 1, y: 0 }, // directly north of player starting position
          },
        ],
      });

      const state = world.getState();
      const moveIntent: Intent = {
        actorId: state.player.id,
        type: 'move',
        payload: { direction: 'up' },
      };

      const nextState = resolveMoveIntent(state, moveIntent);

      expect(nextState.player.position).toEqual({ x: 1, y: 1 }); // position unchanged
      expect(nextState.player.facingDirection).toBe('away'); // facing toward NPC
      expect(nextState.npcs[0].position).toEqual({ x: 1, y: 0 }); // NPC unchanged
    });

    it('blocks move and updates facing when guard occupies target cell', () => {
      const world = createWorld();
      const baseState = world.getState();

      world.resetToState({
        ...baseState,
        guards: [
          {
            id: 'guard-1',
            displayName: 'Test Guard',
            guardState: 'idle',
            position: { x: 2, y: 1 }, // directly east of player
          },
        ],
      });

      const state = world.getState();
      const moveIntent: Intent = {
        actorId: state.player.id,
        type: 'move',
        payload: { direction: 'right' },
      };

      const nextState = resolveMoveIntent(state, moveIntent);

      expect(nextState.player.position).toEqual({ x: 1, y: 1 }); // position unchanged
      expect(nextState.player.facingDirection).toBe('right'); // facing toward guard
    });

    it('blocks move and updates facing when interactive object occupies target cell', () => {
      const world = createWorld();
      const baseState = world.getState();

      world.resetToState({
        ...baseState,
        interactiveObjects: [
          {
            id: 'object-1',
            displayName: 'Test Object',
            objectType: 'supply-crate',
            interactionType: 'inspect',
            state: 'idle',
            position: { x: 1, y: 2 }, // directly south of player
          },
        ],
      });

      const state = world.getState();
      const moveIntent: Intent = {
        actorId: state.player.id,
        type: 'move',
        payload: { direction: 'down' },
      };

      const nextState = resolveMoveIntent(state, moveIntent);

      expect(nextState.player.position).toEqual({ x: 1, y: 1 }); // position unchanged
      expect(nextState.player.facingDirection).toBe('front'); // facing down
    });

    it('blocks move when locked door occupies target cell', () => {
      const world = createWorld();
      const baseState = world.getState();

      world.resetToState({
        ...baseState,
        doors: [
          {
            id: 'door-1',
            displayName: 'Locked Door',
            isOpen: false,
            isLocked: true,
            position: { x: 0, y: 1 }, // directly west of player
          },
        ],
      });

      const state = world.getState();
      const moveIntent: Intent = {
        actorId: state.player.id,
        type: 'move',
        payload: { direction: 'left' },
      };

      const nextState = resolveMoveIntent(state, moveIntent);

      expect(nextState.player.position).toEqual({ x: 1, y: 1 }); // position unchanged
      expect(nextState.player.facingDirection).toBe('left'); // facing toward door
    });

    it('allows move through unlocked door', () => {
      const world = createWorld();
      const baseState = world.getState();

      world.resetToState({
        ...baseState,
        doors: [
          {
            id: 'door-1',
            displayName: 'Unlocked Door',
            isOpen: true,
            isLocked: false,
            position: { x: 0, y: 1 }, // directly west of player
          },
        ],
      });

      const state = world.getState();
      const moveIntent: Intent = {
        actorId: state.player.id,
        type: 'move',
        payload: { direction: 'left' },
      };

      const nextState = resolveMoveIntent(state, moveIntent);

      expect(nextState.player.position).toEqual({ x: 0, y: 1 }); // position changed through door
      expect(nextState.player.facingDirection).toBe('left');
    });

    it('ignores move intent when actorId does not match player', () => {
      const world = createWorld();
      const state = world.getState();

      const moveIntent: Intent = {
        actorId: 'unknown-actor',
        type: 'move',
        payload: { direction: 'right' },
      };

      const nextState = resolveMoveIntent(state, moveIntent);

      expect(nextState).toBe(state); // should return same state unmodified
    });

    it('handles all cardinal directions correctly', () => {
      const world = createWorld();
      const baseState = world.getState();

      const testCases: Array<{ direction: 'up' | 'down' | 'left' | 'right'; expectedDelta: { dx: number; dy: number } }> = [
        { direction: 'up', expectedDelta: { dx: 0, dy: -1 } },
        { direction: 'down', expectedDelta: { dx: 0, dy: 1 } },
        { direction: 'left', expectedDelta: { dx: -1, dy: 0 } },
        { direction: 'right', expectedDelta: { dx: 1, dy: 0 } },
      ];

      for (const { direction, expectedDelta } of testCases) {
        const initialX = 5;
        const initialY = 5;

        world.resetToState({
          ...baseState,
          npcs: [], // Clear any NPCs from baseState
          guards: [], // Clear any guards
          interactiveObjects: [], // Clear any objects
          doors: [], // Clear any doors
          player: {
            ...baseState.player,
            position: { x: initialX, y: initialY },
          },
        });

        const state = world.getState();
        const moveIntent: Intent = {
          actorId: state.player.id,
          type: 'move',
          payload: { direction },
        };

        const nextState = resolveMoveIntent(state, moveIntent);

        const expectedX = initialX + expectedDelta.dx;
        const expectedY = initialY + expectedDelta.dy;

        expect(nextState.player.position).toEqual({
          x: expectedX,
          y: expectedY,
        });
      }
    });
  });

  describe('resolveIntent', () => {
    it('routes move intent to resolveMoveIntent handler', () => {
      const world = createWorld();
      const state = world.getState();

      const moveIntent: Intent = {
        actorId: state.player.id,
        type: 'move',
        payload: { direction: 'right' },
      };

      const nextState = resolveIntent(state, moveIntent);

      expect(nextState.player.position).toEqual({ x: 2, y: 1 });
    });

    it('handles wait intent as a no-op', () => {
      const world = createWorld();
      const state = world.getState();

      const waitIntent: Intent = {
        actorId: state.player.id,
        type: 'wait',
      };

      const nextState = resolveIntent(state, waitIntent);

      expect(nextState).toEqual(state); // state unchanged by wait
    });

    it('handles interact intent as a no-op', () => {
      const world = createWorld();
      const state = world.getState();

      const interactIntent: Intent = {
        actorId: state.player.id,
        type: 'interact',
      };

      const nextState = resolveIntent(state, interactIntent);

      expect(nextState).toEqual(state); // interaction handled separately
    });

    it('integrates intent pipeline through world.applyCommands for move commands', () => {
      const world = createWorld();

      // Apply move commands (which are converted to intents internally)
      world.applyCommands([{ type: 'move', dx: 1, dy: 0 }]);

      expect(world.getState().player.position).toEqual({ x: 2, y: 1 });
      expect(world.getState().player.facingDirection).toBe('right');
      expect(world.getState().tick).toBe(1);
    });

    it('preserves immutability when resolving intents', () => {
      const world = createWorld();
      const originalState = world.getState();

      const moveIntent: Intent = {
        actorId: originalState.player.id,
        type: 'move',
        payload: { direction: 'right' },
      };

      const nextState = resolveIntent(originalState, moveIntent);

      // Original state should be unchanged
      expect(originalState.player.position).toEqual({ x: 1, y: 1 });
      // New state should have moved player
      expect(nextState.player.position).toEqual({ x: 2, y: 1 });
      // States should be different objects
      expect(nextState).not.toBe(originalState);
    });
  });
});
