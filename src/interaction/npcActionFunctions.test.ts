import { describe, expect, it } from 'vitest';
import {
  createDefaultNpcFunctionRegistry,
  createNpcFunctionRegistry,
  type NpcActionCall,
} from './npcActionFunctions';
import type { Npc } from '../world/types';

const createNpc = (overrides: Partial<Npc> = {}): Npc => ({
  id: 'npc-1',
  displayName: 'Archivist',
  position: { x: 5, y: 5 },
  npcType: 'archive_keeper',
  dialogueContextKey: 'archive_keeper_intro',
  ...overrides,
});

describe('npcActionFunctions', () => {
  it('provides deterministic base function order for default registry', () => {
    const registry = createDefaultNpcFunctionRegistry();
    const functions = registry.resolveFunctions(createNpc());

    expect(functions.map((fn) => fn.name)).toEqual(['end_chat', 'move', 'interact', 'use_item']);
  });

  it('returns serializable function schemas', () => {
    const registry = createDefaultNpcFunctionRegistry();
    const functions = registry.resolveFunctions(createNpc());

    const serialized = JSON.stringify(functions);
    const roundTrip = JSON.parse(serialized) as Array<{ name: string }>;

    expect(roundTrip.map((fn) => fn.name)).toEqual(['end_chat', 'move', 'interact', 'use_item']);
  });

  it('supports serializable action call payloads', () => {
    const calls: NpcActionCall[] = [
      { name: 'move', arguments: { x: 7, y: 8 } },
      { name: 'interact', arguments: { targetId: 'door-safe' } },
      { name: 'use_item', arguments: { itemId: 'armory-key', targetId: 'door-safe' } },
      { name: 'end_chat', arguments: { reason: 'Conversation complete.' } },
    ];

    const roundTrip = JSON.parse(JSON.stringify(calls)) as Array<{ name: string }>;
    expect(roundTrip.map((call) => call.name)).toEqual(['move', 'interact', 'use_item', 'end_chat']);
  });

  it('filters function exposure using npc facts capabilities', () => {
    const registry = createDefaultNpcFunctionRegistry();
    const npc = createNpc({
      facts: {
        canMove: false,
        canUseItem: false,
      },
    });

    const functions = registry.resolveFunctions(npc);
    expect(functions.map((fn) => fn.name)).toEqual(['end_chat', 'interact']);
  });

  it('merges npc-type specific additional functions and dedupes by name', () => {
    const registry = createNpcFunctionRegistry({
      additionalByNpcType: {
        archive_keeper: [
          {
            name: 'interact',
            description: 'Interact with archive-only target.',
            parameters: {
              type: 'object',
              properties: {
                targetId: { type: 'string' },
              },
              required: ['targetId'],
              additionalProperties: false,
            },
          },
        ],
      },
    });

    const functions = registry.resolveFunctions(createNpc());
    expect(functions.map((fn) => fn.name)).toEqual(['end_chat', 'move', 'interact', 'use_item']);
    expect(functions.find((fn) => fn.name === 'interact')?.description).toContain('archive-only');
  });
});
