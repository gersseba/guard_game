import { describe, expect, it } from 'vitest';
import { Environment } from './environment/Environment';
import { Item } from './items/Item';
import { mapNpcDtoToRuntime } from './dtoRuntimeSeams';
import { Npc } from './npcs/Npc';

describe('domain class foundation seams', () => {
  it('instantiates foundational classes and maps NPC dto to runtime class without runtime integration', () => {
    const item = new Item({
      id: 'item-1',
      position: { x: 1, y: 2 },
      displayName: 'Bronze Key',
      itemType: 'key',
    });
    const environment = new Environment({
      id: 'env-1',
      position: { x: 3, y: 4 },
      displayName: 'Stone Wall',
      isBlocking: true,
    });

    const npc = mapNpcDtoToRuntime({
      id: 'npc-1',
      displayName: 'Archivist',
      position: { x: 5, y: 6 },
      npcType: 'archive_keeper',
      dialogueContextKey: 'archive_keeper_intro',
      patrol: { path: [{ x: 5, y: 6 }, { x: 6, y: 6 }] },
    });

    expect(item.itemType).toBe('key');
    expect(environment.isBlocking).toBe(true);
    expect(npc).toBeInstanceOf(Npc);
    expect(npc.npcType).toBe('archive_keeper');
    expect(JSON.parse(JSON.stringify(npc))).toMatchObject({
      id: 'npc-1',
      displayName: 'Archivist',
      position: { x: 5, y: 6 },
      npcType: 'archive_keeper',
      dialogueContextKey: 'archive_keeper_intro',
    });
  });
});
