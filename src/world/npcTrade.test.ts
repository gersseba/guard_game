import { describe, expect, it } from 'vitest';
import { createTestInventoryItem, createTestNpc, createTestWorldState } from '../test-support/worldState';
import { resolveNpcTrade } from './npcTrade';

describe('resolveNpcTrade', () => {
  it('consumes required items, grants configured rewards, and records rule completion once', () => {
    const npc = createTestNpc('npc-trader', {
      tradeRules: [
        {
          ruleId: 'swap-pass-for-key',
          requiredItemIds: ['gate-pass'],
          rewardItems: [{ itemId: 'archive-key', displayName: 'Archive Key' }],
        },
      ],
    });
    const player = createTestWorldState({
      player: {
        inventory: {
          items: [createTestInventoryItem('gate-pass', { displayName: 'Gate Pass' })],
          selectedItem: { slotIndex: 0, itemId: 'gate-pass' },
        },
      },
    }).player;

    const result = resolveNpcTrade(npc, player, 7);

    expect(result.appliedRuleId).toBe('swap-pass-for-key');
    expect(result.player.inventory.items).toEqual([
      {
        itemId: 'archive-key',
        displayName: 'Archive Key',
        sourceObjectId: 'npc-trader',
        pickedUpAtTick: 7,
      },
    ]);
    expect(result.player.inventory.selectedItem).toBeNull();
    expect(result.npc.tradeState).toEqual({
      completedRuleIds: ['swap-pass-for-key'],
    });
  });

  it('does not mutate inventory or trade state when requirements are missing', () => {
    const npc = createTestNpc('npc-trader', {
      tradeRules: [
        {
          ruleId: 'swap-pass-for-key',
          requiredItemIds: ['gate-pass'],
          rewardItems: [{ itemId: 'archive-key', displayName: 'Archive Key' }],
        },
      ],
    });
    const player = createTestWorldState({
      player: {
        inventory: {
          items: [createTestInventoryItem('apple', { displayName: 'Apple' })],
          selectedItem: null,
        },
      },
    }).player;

    const result = resolveNpcTrade(npc, player, 7);

    expect(result.appliedRuleId).toBeNull();
    expect(result.player).toEqual(player);
    expect(result.npc).toEqual(npc);
  });

  it('prevents duplicate reward grants after the rule is already completed', () => {
    const npc = createTestNpc('npc-trader', {
      tradeRules: [
        {
          ruleId: 'swap-pass-for-key',
          requiredItemIds: ['gate-pass'],
          rewardItems: [{ itemId: 'archive-key', displayName: 'Archive Key' }],
        },
      ],
    });
    const player = createTestWorldState({
      player: {
        inventory: {
          items: [createTestInventoryItem('gate-pass', { displayName: 'Gate Pass' })],
          selectedItem: null,
        },
      },
    }).player;

    const first = resolveNpcTrade(npc, player, 7);
    const second = resolveNpcTrade(first.npc, first.player, 8);

    expect(first.player.inventory.items).toEqual([
      {
        itemId: 'archive-key',
        displayName: 'Archive Key',
        sourceObjectId: 'npc-trader',
        pickedUpAtTick: 7,
      },
    ]);
    expect(second.appliedRuleId).toBeNull();
    expect(second.player.inventory.items).toEqual(first.player.inventory.items);
    expect(second.npc.tradeState).toEqual({
      completedRuleIds: ['swap-pass-for-key'],
    });
  });
});