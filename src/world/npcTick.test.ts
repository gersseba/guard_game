import { describe, expect, it } from 'vitest';
import { createInitialWorldState } from './state';
import { tickNpcPatrols } from './npcTick';

describe('tickNpcPatrols', () => {
  it('advances an NPC with a patrol path by one step per tick', () => {
    const worldState = createInitialWorldState();
    const npc = {
      ...worldState.npcs[0],
      position: { x: 4, y: 4 },
      patrol: {
        path: [
          { x: 4, y: 4 },
          { x: 5, y: 4 },
          { x: 6, y: 4 },
        ],
      },
    };

    const nextState = tickNpcPatrols({
      ...worldState,
      npcs: [npc],
    });

    expect(nextState.npcs[0].position).toEqual({ x: 5, y: 4 });
  });

  it('pauses NPC patrol when player occupies the next patrol position', () => {
    const worldState = createInitialWorldState();
    const npc = {
      ...worldState.npcs[0],
      position: { x: 4, y: 4 },
      patrol: {
        path: [
          { x: 4, y: 4 },
          { x: 5, y: 4 },
        ],
      },
    };

    const nextState = tickNpcPatrols({
      ...worldState,
      player: {
        ...worldState.player,
        position: { x: 5, y: 4 },
      },
      npcs: [npc],
    });

    expect(nextState.npcs[0].position).toEqual({ x: 4, y: 4 });
  });

  it('loops patrol paths when NPC reaches the final step', () => {
    const worldState = createInitialWorldState();
    const npc = {
      ...worldState.npcs[0],
      position: { x: 6, y: 4 },
      patrol: {
        path: [
          { x: 4, y: 4 },
          { x: 5, y: 4 },
          { x: 6, y: 4 },
        ],
      },
    };

    const nextState = tickNpcPatrols({
      ...worldState,
      npcs: [npc],
    });

    expect(nextState.npcs[0].position).toEqual({ x: 4, y: 4 });
  });
});
