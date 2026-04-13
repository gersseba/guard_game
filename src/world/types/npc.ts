import type { GameEntity } from './entity.js';
import type { InventoryItem } from './inventory.js';

/**
 * Riddle clue constraint for an NPC in a logic puzzle.
 * Defines what claim the NPC must make about a door's safety.
 */
export interface RiddleClue {
  clueId: string;
  doorId: string;
  truthBehavior: 'truthful' | 'inverse';
  /** Computed field: what the NPC must claim about the door's safety */
  mustStateDoorAs: 'safe' | 'danger';
}

/**
 * Human-readable riddle clue constraint for prompt context.
 */
export interface RiddleClueConstraint {
  doorId: string;
  mustStateDoorAs: 'safe' | 'danger';
  constraint: string;
}

export interface TriggerEffect {
  setFact: string;
  value: string | boolean | number;
}

export interface NpcTriggers {
  onApproach?: TriggerEffect;
  onTalk?: TriggerEffect;
}

export interface NpcTradeRewardItem {
  itemId: string;
  displayName: string;
}

export interface NpcTradeRule {
  ruleId: string;
  requiredItemIds?: string[];
  requiredKnowledgeTokens?: string[];
  rewardItems: NpcTradeRewardItem[];
}

export interface NpcTradeState {
  completedRuleIds: string[];
}

export interface Npc extends GameEntity {
  npcType: string;
  dialogueContextKey: string;
  patrol?: { path: Array<{ x: number; y: number }> };
  triggers?: NpcTriggers;
  inventory?: InventoryItem[];
  tradeRules?: NpcTradeRule[];
  knowledgeTokensGrantedOnTalk?: string[];
  tradeState?: NpcTradeState;
  /** Instance-specific knowledge this NPC has (overrides or extends type-level knowledge). */
  instanceKnowledge?: string;
  /** Instance-specific behavior traits for this NPC (overrides or extends type-level behavior). */
  instanceBehavior?: string;
  /** Riddle clue constraint for logic puzzle NPCs. */
  riddleClue?: RiddleClue;
}
