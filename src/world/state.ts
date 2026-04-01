import type { WorldState } from './types';

export const createInitialWorldState = (): WorldState => ({
  tick: 0,
  grid: {
    width: 12,
    height: 8,
    tileSize: 48,
  },
  levelObjective: 'Reach the safe exit.',
  player: {
    id: 'player-1',
    displayName: 'Guard',
    position: { x: 1, y: 1 },
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
  actorConversationHistoryByActorId: {},
  levelOutcome: null,
});

export const serializeWorldState = (worldState: WorldState): string => JSON.stringify(worldState);
