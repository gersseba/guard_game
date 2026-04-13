import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import threeSealsGateJson from '../../public/levels/three-seals-gate.json';
import { handleDoorInteraction } from '../interaction/doorInteraction';
import { createDefaultItemUseResolver } from '../interaction/itemUse';
import { createNpcInteractionService } from '../interaction/npcInteraction';
import { handleObjectInteraction } from '../interaction/objectInteraction';
import type { LlmClient, LlmPrompt, LlmResponse } from '../llm/client';
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

const createThreeSealsScriptedLlmClient = (): LlmClient => {
  const responsesByNpcId: Readonly<Record<string, LlmResponse>> = {
    quartermaster: {
      text: 'Bring me the satchel from old storage and I can help.',
    },
    stablehand: {
      text: 'First fragment: Seal under moonlit stone.',
    },
    'chapel-keeper': {
      text: 'Second fragment: Spoken at dawn beneath the chapel bell.',
    },
    archivist: {
      text: 'Speak the complete phrase and I can release the brass key.',
    },
    'bell-ringer': {
      text: 'Remember this phrase: bell before dawn.',
    },
    mechanic: {
      text: 'Show me the cog and the bell phrase, then I can help.',
    },
  };

  return {
    complete: async (prompt: LlmPrompt): Promise<LlmResponse> => {
      return responsesByNpcId[prompt.actorId] ?? { text: 'No exchange available.' };
    },
  };
};

const npcInteractionService = createNpcInteractionService(createThreeSealsScriptedLlmClient());

const runNpcTurn = async (
  worldState: WorldState,
  npcId: string,
  playerMessage: string,
) => {
  const npc = worldState.npcs.find((candidate) => candidate.id === npcId);
  if (!npc) {
    throw new Error(`Missing NPC: ${npcId}`);
  }

  const result = await npcInteractionService.handleNpcInteraction({
    npc,
    player: worldState.player,
    worldState,
    playerMessage,
  });
  expect(result.llmError).toBeUndefined();
  return result;
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

const runFullThreeSealsSequence = async (): Promise<WorldState> => {
  let worldState = createThreeSealsGateState();

  worldState = collectObjectItem(worldState, 'old-supply-crate');
  worldState = (await runNpcTurn(worldState, 'quartermaster', 'I found your supply satchel.')).updatedWorldState;
  expect(hasItem(worldState, 'iron-key')).toBe(true);

  worldState = (await runNpcTurn(worldState, 'stablehand', 'Do you know part of the seal phrase?')).updatedWorldState;
  worldState =
    (await runNpcTurn(worldState, 'chapel-keeper', 'Can you share the chapel fragment?')).updatedWorldState;
  worldState =
    (await runNpcTurn(worldState, 'archivist', 'I can recite the combined passphrase now.')).updatedWorldState;
  expect(hasItem(worldState, 'brass-key')).toBe(true);

  worldState = collectObjectItem(worldState, 'workshop-crate');
  worldState = (await runNpcTurn(worldState, 'bell-ringer', 'What phrase does the mechanic need?')).updatedWorldState;
  worldState =
    (await runNpcTurn(worldState, 'mechanic', 'I have the cog and the phrase bell before dawn.')).updatedWorldState;
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
  it('encodes archivist and mechanic gating through level-configured chain entities', () => {
    const worldState = createThreeSealsGateState();
    const objectItemIds = worldState.interactiveObjects
      .map((interactiveObject) => interactiveObject.pickupItem?.itemId)
      .filter((itemId): itemId is string => typeof itemId === 'string');
    const archivist = worldState.npcs.find((npc) => npc.id === 'archivist');
    const mechanic = worldState.npcs.find((npc) => npc.id === 'mechanic');
    const chapelKeeper = worldState.npcs.find((npc) => npc.id === 'chapel-keeper');

    expect(chapelKeeper).toBeDefined();
    expect(objectItemIds).not.toContain('archive-token');
    expect(objectItemIds).not.toContain('chapel-seal-note');
    expect(archivist?.tradeRules?.[0]?.requiredItemIds).toBeUndefined();
    expect(archivist?.tradeRules?.[0]?.requiredKnowledgeTokens).toEqual([
      'seal-fragment-a',
      'seal-fragment-b',
    ]);
    expect(mechanic?.tradeRules?.[0]?.requiredItemIds).toEqual(['gear-cog']);
    expect(mechanic?.tradeRules?.[0]?.requiredKnowledgeTokens).toEqual(['bell-before-dawn']);
    expect(worldState.npcs.find((npc) => npc.id === 'stablehand')?.knowledgeTokensGrantedOnTalk).toEqual([
      'seal-fragment-a',
    ]);
    expect(worldState.npcs.find((npc) => npc.id === 'chapel-keeper')?.knowledgeTokensGrantedOnTalk).toEqual([
      'seal-fragment-b',
    ]);
    expect(worldState.npcs.find((npc) => npc.id === 'bell-ringer')?.knowledgeTokensGrantedOnTalk).toEqual([
      'bell-before-dawn',
    ]);
  });

  it('can complete all social chains and finish the level through the multi-key gate', async () => {
    const worldState = await runFullThreeSealsSequence();
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

  it('enforces knowledge-token gating from NPC interaction behavior before key grants', async () => {
    let worldState = createThreeSealsGateState();

    worldState = (await runNpcTurn(worldState, 'stablehand', 'Share your fragment.')).updatedWorldState;

    const missingSecondFragment = await runNpcTurn(
      worldState,
      'archivist',
      'Can I have the brass key now?',
    );
    expect(missingSecondFragment.consequenceTrace?.outcomeStatus).toBe('rejected');
    expect(missingSecondFragment.consequenceTrace?.missingKnowledgeTokens).toEqual(['seal-fragment-b']);
    expect(hasItem(missingSecondFragment.updatedWorldState, 'brass-key')).toBe(false);

    worldState = missingSecondFragment.updatedWorldState;
    worldState =
      (await runNpcTurn(worldState, 'chapel-keeper', 'Share the second fragment.')).updatedWorldState;

    const brassGranted = await runNpcTurn(worldState, 'archivist', 'I know both fragments now.');
    expect(brassGranted.consequenceTrace?.outcomeStatus).toBe('accepted');
    expect(hasItem(brassGranted.updatedWorldState, 'brass-key')).toBe(true);

    worldState = collectObjectItem(brassGranted.updatedWorldState, 'workshop-crate');
    const mechanicBlocked = await runNpcTurn(
      worldState,
      'mechanic',
      'Can you reward me now?',
    );
    expect(mechanicBlocked.consequenceTrace?.outcomeStatus).toBe('rejected');
    expect(mechanicBlocked.consequenceTrace?.missingKnowledgeTokens).toEqual(['bell-before-dawn']);
    expect(hasItem(mechanicBlocked.updatedWorldState, 'steel-key')).toBe(false);

    const bellPhraseGranted = await runNpcTurn(
      mechanicBlocked.updatedWorldState,
      'bell-ringer',
      'Tell me the phrase again.',
    );
    const mechanicGranted = await runNpcTurn(
      bellPhraseGranted.updatedWorldState,
      'mechanic',
      'I know the phrase bell before dawn.',
    );
    expect(mechanicGranted.consequenceTrace?.outcomeStatus).toBe('accepted');
    expect(hasItem(mechanicGranted.updatedWorldState, 'steel-key')).toBe(true);
  });

  it('keeps the final gate locked for 0, 1, and 2 key inventories', async () => {
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
    oneKeyState = (await runNpcTurn(oneKeyState, 'quartermaster', 'I found your satchel.')).updatedWorldState;
    oneKeyState = selectInventoryItemById(oneKeyState, 'iron-key');

    const oneKeyEvent = resolver.resolveItemUseAttempt({
      worldState: oneKeyState,
      commandIndex: 2,
    });
    expect(oneKeyEvent.result).toBe('blocked');
    expect(oneKeyEvent.doorUnlockedId).toBeUndefined();
    expect(oneKeyState.doors.find((door) => door.id === 'three-seals-gate-door')?.isLocked).toBe(true);

    let twoKeyState = oneKeyState;
    twoKeyState =
      (await runNpcTurn(twoKeyState, 'stablehand', 'Share your seal fragment.')).updatedWorldState;
    twoKeyState =
      (await runNpcTurn(twoKeyState, 'chapel-keeper', 'Share your seal fragment.')).updatedWorldState;
    twoKeyState = (await runNpcTurn(twoKeyState, 'archivist', 'I can recite the phrase.')).updatedWorldState;
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

  it('replays equivalent full sequences deterministically', async () => {
    const first = await runFullThreeSealsSequence();
    const second = await runFullThreeSealsSequence();

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });
});