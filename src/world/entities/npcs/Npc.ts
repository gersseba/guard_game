import type {
  InventoryItem,
  NpcTradeRule,
  NpcTradeState,
  NpcTriggers,
  RiddleClue,
} from '../../types';
import { Actor, type ActorInit } from '../base/Actor';
import { Item } from '../items/Item';

export interface NpcInit extends ActorInit {
  npcType: string;
  dialogueContextKey: string;
  patrol?: { path: Array<{ x: number; y: number }> };
  triggers?: NpcTriggers;
  inventory?: InventoryItem[];
  tradeRules?: NpcTradeRule[];
  tradeState?: NpcTradeState;
  instanceKnowledge?: string;
  instanceBehavior?: string;
  riddleClue?: RiddleClue;
}

export class Npc extends Actor {
  public npcType: string;
  public dialogueContextKey: string;
  public patrol?: { path: Array<{ x: number; y: number }> };
  public triggers?: NpcTriggers;
  public inventory?: InventoryItem[];
  public tradeRules?: NpcTradeRule[];
  public tradeState?: NpcTradeState;
  public instanceKnowledge?: string;
  public instanceBehavior?: string;
  public riddleClue?: RiddleClue;

  public constructor(init: NpcInit) {
    super(init);
    this.npcType = init.npcType;
    this.dialogueContextKey = init.dialogueContextKey;
    this.patrol = init.patrol ? { path: init.patrol.path.map((position) => ({ ...position })) } : undefined;
    this.triggers = init.triggers;
    this.inventory = init.inventory?.map((item) => Item.fromInventoryItem(item));
    this.tradeRules = init.tradeRules?.map((rule) => ({
      ruleId: rule.ruleId,
      requiredItemIds: [...rule.requiredItemIds],
      rewardItems: rule.rewardItems.map((item) => ({ ...item })),
    }));
    this.tradeState = init.tradeState
      ? {
          completedRuleIds: [...init.tradeState.completedRuleIds],
        }
      : undefined;
    this.instanceKnowledge = init.instanceKnowledge;
    this.instanceBehavior = init.instanceBehavior;
    this.riddleClue = init.riddleClue ? { ...init.riddleClue } : undefined;

    if (init.instanceKnowledge === undefined) {
      delete this.instanceKnowledge;
    }

    if (init.instanceBehavior === undefined) {
      delete this.instanceBehavior;
    }
  }
}
