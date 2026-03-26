import type { WorldState } from './types';

export const createInitialWorldState = (): WorldState => ({
  tick: 0,
  grid: {
    width: 12,
    height: 8,
    tileSize: 48,
  },
  player: {
    id: 'player-1',
    displayName: 'Guard',
    position: { x: 1, y: 1 },
  },
  npcs: [
    {
      id: 'npc-1',
      displayName: 'Archivist',
      position: { x: 8, y: 3 },
      dialogueContextKey: 'archive_keeper_intro',
    },
  ],
  guards: [],
  doors: [],
  interactiveObjects: [
    {
      id: 'obj-1',
      displayName: 'Console',
      position: { x: 4, y: 5 },
      interactionType: 'inspect',
      state: 'idle',
    },
  ],
  npcConversationHistoryByNpcId: {},
  levelOutcome: null,
});

export const serializeWorldState = (worldState: WorldState): string => JSON.stringify(worldState);
