import { describe, expect, it } from 'vitest';
import {
  createActionModalSession,
  isActionModalEligibleTarget,
} from './actionModalRouting';
import type { AdjacentTarget } from './adjacencyResolver';

describe('action modal routing', () => {
  it('treats guards and npcs as action-modal eligible targets', () => {
    const guardTarget: AdjacentTarget = {
      kind: 'guard',
      target: {
        id: 'guard-1',
        displayName: 'Gate Guard',
        position: { x: 1, y: 2 },
        guardState: 'idle',
      },
    };
    const npcTarget: AdjacentTarget = {
      kind: 'npc',
      target: {
        id: 'npc-1',
        displayName: 'Archivist',
        position: { x: 2, y: 2 },
        npcType: 'sage',
        dialogueContextKey: 'archive',
      },
    };

    expect(isActionModalEligibleTarget(guardTarget)).toBe(true);
    expect(isActionModalEligibleTarget(npcTarget)).toBe(true);
  });

  it('keeps direct interaction flow for doors and interactive objects', () => {
    const doorTarget: AdjacentTarget = {
      kind: 'door',
      target: {
        id: 'door-1',
        displayName: 'North Door',
        position: { x: 1, y: 2 },
        doorState: 'closed',
        outcome: 'safe',
      },
    };
    const objectTarget: AdjacentTarget = {
      kind: 'interactiveObject',
      target: {
        id: 'crate-1',
        displayName: 'Supply Crate',
        position: { x: 2, y: 2 },
        objectType: 'supply-crate',
        interactionType: 'use',
        state: 'idle',
      },
    };

    expect(isActionModalEligibleTarget(doorTarget)).toBe(false);
    expect(isActionModalEligibleTarget(objectTarget)).toBe(false);
  });

  it('creates a runtime modal session from an eligible target', () => {
    const guardTarget: AdjacentTarget = {
      kind: 'guard',
      target: {
        id: 'guard-1',
        displayName: 'Gate Guard',
        position: { x: 1, y: 2 },
        guardState: 'idle',
      },
    };

    if (!isActionModalEligibleTarget(guardTarget)) {
      throw new Error('Expected guard target to be action-modal eligible.');
    }

    expect(createActionModalSession(guardTarget)).toEqual({
      targetId: 'guard-1',
      targetKind: 'guard',
      displayName: 'Gate Guard',
    });
  });
});