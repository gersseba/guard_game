import type { WorldState } from './types';

export const createInitialWorldState = (): WorldState => ({
  tick: 0,
  grid: {
    width: 12,
    height: 8,
    tileSize: 48,
  },
  levelMetadata: {
    name: 'Sandbox',
    premise: 'A baseline deterministic world used before a level is loaded.',
    goal: 'Move around and interact with nearby entities.',
  },
  player: {
    id: 'player-1',
    displayName: 'Guard',
    position: { x: 1, y: 1 },
    inventory: {
      items: [],
      selectedItem: null,
    },
    facingDirection: 'front',
  },
  npcs: [
    {
      id: 'npc-1',
      displayName: 'Archivist',
      position: { x: 8, y: 3 },
      npcType: 'archive_keeper',
      dialogueContextKey: 'archive_keeper_intro',
    },
  ],
  guards: [],
  doors: [],
  interactiveObjects: [
    {
      id: 'crate-1',
      displayName: 'Supply Crate',
      position: { x: 4, y: 5 },
      objectType: 'supply-crate',
      interactionType: 'inspect',
      state: 'idle',
      idleMessage: 'You pry open the crate and find emergency rations.',
      usedMessage: 'The crate sits open and empty.',
      spriteAssetPath: '/assets/medieval_supply_crate_inspect.svg',
    },
  ],
  environments: [],
  actorConversationHistoryByActorId: {},
  lastItemUseAttemptEvent: null,
  levelOutcome: null,
});

export const serializeWorldState = (worldState: WorldState): string => JSON.stringify(worldState);
