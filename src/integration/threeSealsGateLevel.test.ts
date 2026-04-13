import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import threeSealsGateJson from '../../public/levels/three-seals-gate.json';
import { handleDoorInteraction } from '../interaction/doorInteraction';
import { createDefaultItemUseResolver } from '../interaction/itemUse';
import { applyNpcDialogueConsequences } from '../interaction/npcDialogueConsequenceHook';
import { handleObjectInteraction } from '../interaction/objectInteraction';
import { parseLayoutText } from '../world/layout';
import { deserializeLevel, validateLevelData } from '../world/level';
import type { ItemUseAttemptResultEvent, WorldState } from '../world/types';

const threeSealsGateLayoutText = readFileSync(
  new URL('../../public/levels/three-seals-gate.layout.txt', import.meta.url),
  'utf8',
);
const threeSealsGateLayout = parseLayoutText(threeSealsGateLayoutText);

const createThreeSealsGateState = (): WorldState => {
  const validated = validateLevelData(threeSealsGateJson, {
    width: threeSealsGateLayout.width,
    height: threeSealsGateLayout.height,
  });
  return deserializeLevel(validated, threeSealsGateLayout);
};

const applyItemUseResult = (
  worldState: WorldState,
  event: ItemUseAttemptResultEvent,
): WorldState => {
  let updated = {
    ...worldState,
    lastItemUseAttemptEvent: event,
  };

  if (event.doorUnlockedId) {
    updated = {
      ...updated,
      doors: updated.doors.map((door) =>
        door.id === event.doorUnlockedId ? { ...door, isLocked: false, isOpen: true } : door,
      ),
    };
  }

  return updated;
};

const collectObjectItem = (worldState: WorldState, objectId: string): WorldState => {
  const interactiveObject = worldState.interactiveObjects.find((candidate) => candidate.id === objectId);
  if (!interactiveObject) {
    throw new Error(`Missing interactive object: ${objectId}`);
  }

  const result = handleObjectInteraction({
    interactiveObject,
    player: worldState.player,
    worldState,
  });

  return result.updatedWorldState;
};

const applyNpcOutcome = (worldState: WorldState, npcId: string, outcome: unknown): WorldState => {
  const result = applyNpcDialogueConsequences({
    worldState,
    npcId,
    outcome,
  });

  expect(result.trace.outcomeStatus).toBe('accepted');
  return result.updatedWorldState;
};

const selectInventoryItemById = (worldState: WorldState, itemId: string): WorldState => {
  const slotIndex = worldState.player.inventory.items.findIndex((item) => item.itemId === itemId);
  if (slotIndex < 0) {
    throw new Error(`Missing inventory item: ${itemId}`);
  }

  return {
    ...worldState,
    player: {
      ...worldState.player,
      position: { x: 20, y: 13 },
      inventory: {
        ...worldState.player.inventory,
        selectedItem: {
          slotIndex,
          itemId,
        },
      },
    },
  };
};

const hasItem = (worldState: WorldState, itemId: string): boolean => {
  return worldState.player.inventory.items.some((item) => item.itemId === itemId);
};

const runFullThreeSealsSequence = (): WorldState => {
  let worldState = createThreeSealsGateState();

  worldState = collectObjectItem(worldState, 'old-supply-crate');
  worldState = applyNpcOutcome(worldState, 'quartermaster', {});
  expect(hasItem(worldState, 'iron-key')).toBe(true);

  worldState = collectObjectItem(worldState, 'archive-strongbox');
  worldState = collectObjectItem(worldState, 'chapel-cache');
  worldState = applyNpcOutcome(worldState, 'stablehand', {
    grantKnowledgeTokens: ['seal-fragment-a'],
  });
  worldState = applyNpcOutcome(worldState, 'guard-captain', {
    grantKnowledgeTokens: ['seal-fragment-b'],
  });
  worldState = applyNpcOutcome(worldState, 'archivist', {
    requireKnowledgeTokens: ['seal-fragment-a', 'seal-fragment-b'],
  });
  expect(hasItem(worldState, 'brass-key')).toBe(true);

  worldState = collectObjectItem(worldState, 'workshop-crate');
  worldState = collectObjectItem(worldState, 'repair-ledger-box');
  worldState = applyNpcOutcome(worldState, 'bell-ringer', {
    grantKnowledgeTokens: ['bell-before-dawn'],
  });
  worldState = applyNpcOutcome(worldState, 'mechanic', {
    requireKnowledgeTokens: ['bell-before-dawn'],
  });
  expect(hasItem(worldState, 'steel-key')).toBe(true);

  worldState = selectInventoryItemById(worldState, 'iron-key');
  const unlockEvent = createDefaultItemUseResolver().resolveItemUseAttempt({
    worldState,
    commandIndex: 1,
  });

  expect(unlockEvent.result).toBe('success');
  expect(unlockEvent.doorUnlockedId).toBe('three-seals-gate-door');

  return applyItemUseResult(worldState, unlockEvent);
};

describe('three-seals-gate level integration', () => {
  it('can complete all social chains and finish the level through the multi-key gate', () => {
    const worldState = runFullThreeSealsSequence();
    const finalDoor = worldState.doors.find((door) => door.id === 'three-seals-gate-door');

    expect(finalDoor).toBeDefined();
    expect(finalDoor?.isLocked).toBe(false);
    expect(finalDoor?.isOpen).toBe(true);

    const doorInteraction = handleDoorInteraction({
      door: finalDoor!,
      player: worldState.player,
    });
    expect(doorInteraction.levelOutcome).toBe('win');
  });

  it('keeps the final gate locked for 0, 1, and 2 key inventories', () => {
    const resolver = createDefaultItemUseResolver();

    const noKeyState = {
      ...createThreeSealsGateState(),
      player: {
        ...createThreeSealsGateState().player,
        position: { x: 20, y: 13 },
      },
    };
    const noKeyEvent = resolver.resolveItemUseAttempt({
      worldState: noKeyState,
      commandIndex: 1,
    });
    expect(noKeyEvent.result).toBe('no-selection');

    let oneKeyState = createThreeSealsGateState();
    oneKeyState = collectObjectItem(oneKeyState, 'old-supply-crate');
    oneKeyState = applyNpcOutcome(oneKeyState, 'quartermaster', {});
    oneKeyState = selectInventoryItemById(oneKeyState, 'iron-key');

    const oneKeyEvent = resolver.resolveItemUseAttempt({
      worldState: oneKeyState,
      commandIndex: 2,
    });
    expect(oneKeyEvent.result).toBe('blocked');
    expect(oneKeyEvent.doorUnlockedId).toBeUndefined();
    expect(oneKeyState.doors.find((door) => door.id === 'three-seals-gate-door')?.isLocked).toBe(true);

    let twoKeyState = oneKeyState;
    twoKeyState = collectObjectItem(twoKeyState, 'archive-strongbox');
    twoKeyState = collectObjectItem(twoKeyState, 'chapel-cache');
    twoKeyState = applyNpcOutcome(twoKeyState, 'stablehand', {
      grantKnowledgeTokens: ['seal-fragment-a'],
    });
    twoKeyState = applyNpcOutcome(twoKeyState, 'guard-captain', {
      grantKnowledgeTokens: ['seal-fragment-b'],
    });
    twoKeyState = applyNpcOutcome(twoKeyState, 'archivist', {
      requireKnowledgeTokens: ['seal-fragment-a', 'seal-fragment-b'],
    });
    twoKeyState = selectInventoryItemById(twoKeyState, 'brass-key');

    const twoKeyEvent = resolver.resolveItemUseAttempt({
      worldState: twoKeyState,
      commandIndex: 3,
    });
    expect(twoKeyEvent.result).toBe('blocked');
    expect(twoKeyEvent.doorUnlockedId).toBeUndefined();
    expect(twoKeyState.doors.find((door) => door.id === 'three-seals-gate-door')?.isLocked).toBe(true);
  });

  it('does not resolve level outcome when interacting with the final gate while locked', () => {
    const worldState = createThreeSealsGateState();
    const finalDoor = worldState.doors.find((door) => door.id === 'three-seals-gate-door');
    if (!finalDoor) {
      throw new Error('Missing final gate door');
    }

    const doorInteraction = handleDoorInteraction({
      door: finalDoor,
      player: worldState.player,
    });

    expect(doorInteraction.responseText).toBe('The door is locked.');
    expect(doorInteraction.levelOutcome).toBeUndefined();
  });

  it('replays equivalent full sequences deterministically', () => {
    const first = runFullThreeSealsSequence();
    const second = runFullThreeSealsSequence();

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });
});