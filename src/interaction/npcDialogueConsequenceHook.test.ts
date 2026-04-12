import { describe, expect, it } from 'vitest';
import { createQuestState } from '../world/questState';
import type { ItemUseAttemptResultEvent, QuestChainDefinition } from '../world/types';
import {
  createTestInventoryItem,
  createTestNpc,
  createTestWorldState,
} from '../test-support/worldState';
import { applyNpcDialogueConsequences } from './npcDialogueConsequenceHook';

const buildQuestEvent = (overrides: Partial<ItemUseAttemptResultEvent> = {}): ItemUseAttemptResultEvent => {
  return {
    tick: 0,
    commandIndex: 0,
    selectedItem: null,
    result: 'success',
    target: null,
    ...overrides,
  };
};

describe('applyNpcDialogueConsequences', () => {
  it('routes valid dialogue outcomes through deterministic token/trade/quest executors', () => {
    const npc = createTestNpc('npc-trader', {
      tradeRules: [
        {
          ruleId: 'swap-pass-for-key',
          requiredItemIds: ['gate-pass'],
          rewardItems: [{ itemId: 'archive-key', displayName: 'Archive Key' }],
        },
      ],
    });

    const questChain: QuestChainDefinition = {
      chainId: 'chain-1',
      displayName: 'First Step',
      npcId: npc.id,
      stages: [
        {
          stageId: 'stage-1',
          completeWhen: {
            eventType: 'item_use_resolved',
            result: 'success',
          },
        },
      ],
    };

    const worldState = createTestWorldState({
      npcs: [npc],
      player: {
        inventory: {
          items: [createTestInventoryItem('gate-pass', { displayName: 'Gate Pass' })],
          selectedItem: null,
        },
      },
      questState: createQuestState([questChain]),
    });

    const result = applyNpcDialogueConsequences({
      npcId: npc.id,
      worldState,
      outcome: {
        grantKnowledgeTokens: ['seal-alpha'],
        questProgressEvent: {
          type: 'item_use_resolved',
          tick: worldState.tick,
          itemUseEvent: buildQuestEvent(),
        },
      },
    });

    expect(result.trace.outcomeStatus).toBe('accepted');
    expect(result.trace.tradeRuleIdApplied).toBe('swap-pass-for-key');
    expect(result.trace.questStateMutated).toBe(true);
    expect(result.updatedWorldState.knowledgeState?.tokensById['seal-alpha']).toEqual({
      tokenId: 'seal-alpha',
      grantedAtTick: 0,
      grantedByActorId: npc.id,
    });
    expect(result.updatedWorldState.player.inventory.items).toEqual([
      {
        itemId: 'archive-key',
        displayName: 'Archive Key',
        sourceObjectId: npc.id,
        pickedUpAtTick: 0,
      },
    ]);
    expect(result.updatedWorldState.questState?.progressByChainId['chain-1']).toEqual({
      chainId: 'chain-1',
      status: 'completed',
      currentStageIndex: 1,
      completedStageIds: ['stage-1'],
      lastAdvancedTick: 0,
    });
  });

  it('rejects invalid dialogue outcomes with deterministic no-mutation state', () => {
    const npc = createTestNpc('npc-1');
    const worldState = createTestWorldState({
      npcs: [npc],
    });

    const result = applyNpcDialogueConsequences({
      npcId: npc.id,
      worldState,
      outcome: {
        grantKnowledgeTokens: 'not-an-array',
      },
    });

    expect(result.trace.outcomeStatus).toBe('rejected');
    expect(result.trace.tradeRuleIdApplied).toBeNull();
    expect(result.trace.inventoryMutated).toBe(false);
    expect(result.trace.questStateMutated).toBe(false);
    expect(result.updatedWorldState).toEqual(worldState);
  });

  it('remains deterministic and idempotent when replaying the same accepted outcome', () => {
    const npc = createTestNpc('npc-trader', {
      tradeRules: [
        {
          ruleId: 'swap-pass-for-key',
          requiredItemIds: ['gate-pass'],
          rewardItems: [{ itemId: 'archive-key', displayName: 'Archive Key' }],
        },
      ],
    });

    const worldState = createTestWorldState({
      npcs: [npc],
      player: {
        inventory: {
          items: [createTestInventoryItem('gate-pass', { displayName: 'Gate Pass' })],
          selectedItem: null,
        },
      },
    });

    const outcome = {
      grantKnowledgeTokens: ['seal-alpha'],
    };

    const first = applyNpcDialogueConsequences({
      npcId: npc.id,
      worldState,
      outcome,
    });
    const second = applyNpcDialogueConsequences({
      npcId: npc.id,
      worldState: first.updatedWorldState,
      outcome,
    });

    expect(first.trace.tradeRuleIdApplied).toBe('swap-pass-for-key');
    expect(second.trace.tradeRuleIdApplied).toBeNull();
    expect(second.updatedWorldState.player.inventory.items).toEqual(
      first.updatedWorldState.player.inventory.items,
    );
    expect(second.updatedWorldState.knowledgeState).toEqual(first.updatedWorldState.knowledgeState);
    expect(second.updatedWorldState.npcs).toEqual(first.updatedWorldState.npcs);
  });
});
