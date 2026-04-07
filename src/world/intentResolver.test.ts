import { describe, expect, it } from 'vitest';
import { createWorld } from './world';
import { resolveIntent, resolveMoveIntent } from './intentResolver';
import type { Intent, WorldState } from './types';

describe('intentResolver', () => {
  describe('resolveMoveIntent', () => {
    it('moves player to empty adjacent cell successfully', () => {
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

    it('updates facing direction and blocks move when target is out of bounds', () => {
      const world = createWorld();
      const state = { ...world.getState(), tick: 0 };

      const moveIntent: Intent = {
        actorId: state.player.id,
        type: 'move',
        payload: { direction: 'up' },
      };

      const nextState = resolveMoveIntent(state, moveIntent);

      expect(nextState.player.position).toEqual({ x: 1, y: 1 }); // blocked at boundary
      expect(nextState.player.facingDirection).toBe('away'); // facing updated even though blocked
    });

    it('blocks move and updates facing when NPC occupies target cell', () => {
      const world = createWorld();
      const baseState = world.getState();

      const stateWithNpc = {
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
      };

      const moveIntent: Intent = {
        actorId: stateWithNpc.player.id,
        type: 'move',
        payload: { direction: 'up' },
      };

      const nextState = resolveMoveIntent(stateWithNpc, moveIntent);

      expect(nextState.player.position).toEqual({ x: 1, y: 1 }); // position unchanged
      expect(nextState.player.facingDirection).toBe('away'); // facing toward NPC
      expect(nextState.npcs[0].position).toEqual({ x: 1, y: 0 }); // NPC unchanged
    });

    it('blocks move and updates facing when guard occupies target cell', () => {
      const world = createWorld();
      const baseState = world.getState();

      const stateWithGuard = {
        ...baseState,
        guards: [
          {
            id: 'guard-1',
            displayName: 'Test Guard',
            guardState: 'idle',
            position: { x: 2, y: 1 }, // directly east of player
          },
        ],
      };

      const moveIntent: Intent = {
        actorId: stateWithGuard.player.id,
        type: 'move',
        payload: { direction: 'right' },
      };

      const nextState = resolveMoveIntent(stateWithGuard, moveIntent);

      expect(nextState.player.position).toEqual({ x: 1, y: 1 }); // position unchanged
      expect(nextState.player.facingDirection).toBe('right'); // facing toward guard
    });

    it('blocks move and updates facing when interactive object occupies target cell', () => {
      const world = createWorld();
      const baseState = world.getState();

      const stateWithObject = {
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
      };

      const moveIntent: Intent = {
        actorId: stateWithObject.player.id,
        type: 'move',
        payload: { direction: 'down' },
      };

      const nextState = resolveMoveIntent(stateWithObject, moveIntent);

      expect(nextState.player.position).toEqual({ x: 1, y: 1 }); // position unchanged
      expect(nextState.player.facingDirection).toBe('front'); // facing down
    });

    it('blocks move when locked door occupies target cell', () => {
      const world = createWorld();
      const baseState = world.getState();

      const stateWithLockedDoor = {
        ...baseState,
        doors: [
          {
            id: 'door-1',
            displayName: 'Locked Door',
            doorState: 'closed',
            position: { x: 0, y: 1 }, // directly west of player
            isUnlocked: false,
          },
        ],
      };

      const moveIntent: Intent = {
        actorId: stateWithLockedDoor.player.id,
        type: 'move',
        payload: { direction: 'left' },
      };

      const nextState = resolveMoveIntent(stateWithLockedDoor, moveIntent);

      expect(nextState.player.position).toEqual({ x: 1, y: 1 }); // position unchanged
      expect(nextState.player.facingDirection).toBe('left'); // facing toward door
    });

    it('allows move through unlocked door', () => {
      const world = createWorld();
      const baseState = world.getState();

      const stateWithUnlockedDoor = {
        ...baseState,
        doors: [
          {
            id: 'door-1',
            displayName: 'Unlocked Door',
            doorState: 'closed',
            position: { x: 0, y: 1 }, // directly west of player
            isUnlocked: true,
          },
        ],
      };

      const moveIntent: Intent = {
        actorId: stateWithUnlockedDoor.player.id,
        type: 'move',
        payload: { direction: 'left' },
      };

      const nextState = resolveMoveIntent(stateWithUnlockedDoor, moveIntent);

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

      const directions: Array<{ direction: 'up' | 'down' | 'left' | 'right'; dx: number; dy: number }> = [
        { direction: 'up', dx: 0, dy: -1 },
        { direction: 'down', dx: 0, dy: 1 },
        { direction: 'left', dx: -1, dy: 0 },
        { direction: 'right', dx: 1, dy: 0 },
      ];

      for (const { direction, dx, dy } of directions) {
        const stateForTest = {
          ...baseState,
          player: {
            ...baseState.player,
            position: { x: 5, y: 5 }, // center of large grid
          },
        };

        const moveIntent: Intent = {
          actorId: stateForTest.player.id,
          type: 'move',
          payload: { direction },
        };

        const nextState = resolveMoveIntent(stateForTest, moveIntent);

        expect(nextState.player.position).toEqual({
          x: 5 + dx,
          y: 5 + dy,
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
