import { describe, expect, it } from 'vitest';
import {
  applyQuestProgressEvent,
  applyQuestProgressEventIfValid,
  createQuestState,
  toQuestProgressEventFromItemUseAttempt,
} from './questState';
import type { ItemUseAttemptResultEvent, QuestChainDefinition } from './types';

const questChains: QuestChainDefinition[] = [
  {
    chainId: 'guard-bribe',
    displayName: 'Bribe the Armory Guard',
    npcId: 'guard-armory',
    stages: [
      {
        stageId: 'offer-token',
        completeWhen: {
          eventType: 'item_use_resolved',
          result: 'success',
          targetKind: 'guard',
          targetId: 'guard-armory',
          selectedItemId: 'bribe-token',
          affectedEntityType: 'guard',
          affectedEntityId: 'guard-armory',
        },
      },
    ],
  },
  {
    chainId: 'sealed-door',
    displayName: 'Unlock the Sealed Door',
    stages: [
      {
        stageId: 'unlock-door',
        completeWhen: {
          eventType: 'item_use_resolved',
          result: 'success',
          targetKind: 'door',
          targetId: 'vault-door',
          selectedItemId: 'vault-key',
          doorUnlockedId: 'vault-door',
        },
      },
    ],
  },
];

const createItemUseEvent = (overrides: Partial<ItemUseAttemptResultEvent>): ItemUseAttemptResultEvent => ({
  tick: 4,
  commandIndex: 0,
  selectedItem: {
    slotIndex: 0,
    itemId: 'bribe-token',
  },
  result: 'success',
  target: {
    kind: 'guard',
    targetId: 'guard-armory',
  },
  affectedEntityType: 'guard',
  affectedEntityId: 'guard-armory',
  ...overrides,
});

describe('questState', () => {
  it('creates a JSON-serializable quest state for multiple chains', () => {
    const questState = createQuestState(questChains);

    expect(Object.keys(questState.progressByChainId)).toEqual(['guard-bribe', 'sealed-door']);
    const roundTrip = JSON.parse(JSON.stringify(questState));
    expect(roundTrip).toEqual(questState);
  });

  it('advances matching chains deterministically from validated item-use events', () => {
    const initial = createQuestState(questChains);

    const firstEvent = toQuestProgressEventFromItemUseAttempt(
      createItemUseEvent({
        tick: 10,
      }),
    );
    const secondEvent = toQuestProgressEventFromItemUseAttempt(
      createItemUseEvent({
        tick: 11,
        selectedItem: {
          slotIndex: 1,
          itemId: 'vault-key',
        },
        target: {
          kind: 'door',
          targetId: 'vault-door',
        },
        doorUnlockedId: 'vault-door',
        affectedEntityType: undefined,
        affectedEntityId: undefined,
      }),
    );

    const sequenceA = applyQuestProgressEvent(applyQuestProgressEvent(initial, firstEvent), secondEvent);
    const sequenceB = applyQuestProgressEvent(applyQuestProgressEvent(initial, firstEvent), secondEvent);

    expect(sequenceA).toEqual(sequenceB);
    expect(sequenceA.progressByChainId['guard-bribe'].status).toBe('completed');
    expect(sequenceA.progressByChainId['sealed-door'].status).toBe('completed');
  });

  it('returns unchanged state when event does not match any active stage criteria', () => {
    const initial = createQuestState(questChains);
    const nonMatchingEvent = toQuestProgressEventFromItemUseAttempt(
      createItemUseEvent({
        result: 'blocked',
      }),
    );

    const next = applyQuestProgressEvent(initial, nonMatchingEvent);
    expect(next).toBe(initial);
  });

  it('rejects non-validated unknown event payloads in safe apply API', () => {
    const initial = createQuestState(questChains);

    const next = applyQuestProgressEventIfValid(initial, {
      type: 'dialogue_text',
      content: 'Please advance the quest',
    });

    expect(next).toBe(initial);
    expect(next.progressByChainId['guard-bribe'].status).toBe('not_started');
  });
});
