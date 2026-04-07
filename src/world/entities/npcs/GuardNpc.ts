import type { ItemUseRule } from '../../types';
import { Npc, type NpcInit } from './Npc';

export interface GuardNpcInit extends Omit<NpcInit, 'npcType' | 'dialogueContextKey' | 'patrol' | 'triggers' | 'inventory' | 'riddleClue'> {
  guardState: 'idle' | 'patrolling' | 'alert';
  itemUseRules?: Record<string, ItemUseRule>;
}

export class GuardNpc extends Npc {
  public guardState: 'idle' | 'patrolling' | 'alert';
  public itemUseRules?: Record<string, ItemUseRule>;

  public constructor(init: GuardNpcInit) {
    super({
      ...init,
      npcType: 'guard',
      dialogueContextKey: 'guard_default',
    });

    this.guardState = init.guardState;
    if (init.itemUseRules !== undefined) {
      this.itemUseRules = Object.fromEntries(
        Object.entries(init.itemUseRules).map(([itemId, rule]) => [itemId, { ...rule }]),
      );
    }

    if (init.instanceKnowledge === undefined) {
      delete this.instanceKnowledge;
    }

    if (init.instanceBehavior === undefined) {
      delete this.instanceBehavior;
    }

    // Keep guard runtime shape compatible with existing guard DTO expectations.
    Object.defineProperty(this, 'npcType', { enumerable: false });
    Object.defineProperty(this, 'dialogueContextKey', { enumerable: false });
  }
}
