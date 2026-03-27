import { describe, expect, it } from 'vitest';
import { handleInteractiveObjectInteraction } from './objectInteraction';
import type { InteractiveObject, Player, WorldState } from '../world/types';

const player: Player = { id: 'player-1', displayName: 'Hero', position: { x: 3, y: 3 } };

const makeSupplyCrate = (
  id: string,
  state: InteractiveObject['state'],
  overrides: Partial<InteractiveObject> = {},
): InteractiveObject => ({
  id,
  displayName: 'Supply Crate',
  position: { x: 4, y: 3 },
  objectType: 'supply-crate',
  interactionType: 'inspect',
  state,
  idleMessage: 'You open the crate and find bandages.',
  usedMessage: 'The crate is empty now.',
  ...overrides,
});

const createWorldState = (...interactiveObjects: InteractiveObject[]): WorldState => ({
  tick: 0,
  grid: { width: 12, height: 8, tileSize: 48 },
  player,
  npcs: [],
  guards: [],
  doors: [],
  interactiveObjects,
  npcConversationHistoryByNpcId: {},
  levelOutcome: null,
});

describe('handleInteractiveObjectInteraction', () => {
  it('uses shared object-type behavior and instance fields for first supply-crate interaction', () => {
    const crate = makeSupplyCrate('crate-a', 'idle', {
      idleMessage: 'You lift the lid and uncover a brass key.',
      firstUseOutcome: 'win',
    });
    const worldState = createWorldState(crate);

    const result = handleInteractiveObjectInteraction({
      interactiveObject: crate,
      player,
      worldState,
    });

    expect(result.objectId).toBe('crate-a');
    expect(result.responseText).toBe('You lift the lid and uncover a brass key.');
    expect(result.updatedWorldState.levelOutcome).toBe('win');
    expect(result.updatedWorldState.interactiveObjects[0].state).toBe('used');
  });

  it('returns used-state message on repeat interaction and does not re-trigger first-use outcome', () => {
    const crate = makeSupplyCrate('crate-b', 'used', {
      usedMessage: 'Only splinters remain inside the crate.',
      firstUseOutcome: 'lose',
    });
    const worldState = createWorldState(crate);

    const result = handleInteractiveObjectInteraction({
      interactiveObject: crate,
      player,
      worldState,
    });

    expect(result.responseText).toBe('Only splinters remain inside the crate.');
    expect(result.updatedWorldState.levelOutcome).toBeNull();
    expect(result.updatedWorldState.interactiveObjects[0].state).toBe('used');
  });

  it('keeps per-instance outcomes distinct while reusing the same supply-crate handler', () => {
    const winningCrate = makeSupplyCrate('crate-win', 'idle', {
      idleMessage: 'You find the evacuation signal flare.',
      firstUseOutcome: 'win',
    });
    const neutralCrate = makeSupplyCrate('crate-neutral', 'idle', {
      idleMessage: 'You find rope and a water skin.',
    });

    const winningResult = handleInteractiveObjectInteraction({
      interactiveObject: winningCrate,
      player,
      worldState: createWorldState(winningCrate, neutralCrate),
    });
    const neutralResult = handleInteractiveObjectInteraction({
      interactiveObject: neutralCrate,
      player,
      worldState: createWorldState(winningCrate, neutralCrate),
    });

    expect(winningResult.responseText).toBe('You find the evacuation signal flare.');
    expect(winningResult.updatedWorldState.levelOutcome).toBe('win');
    expect(neutralResult.responseText).toBe('You find rope and a water skin.');
    expect(neutralResult.updatedWorldState.levelOutcome).toBeNull();
  });
});
