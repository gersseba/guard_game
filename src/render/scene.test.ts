import { describe, expect, it } from 'vitest';
import { buildEntityCircleSpecs, getColorForEntityType } from './scene';
import type { WorldState } from '../world/types';

const createWorldState = (): WorldState => ({
  tick: 0,
  grid: {
    width: 20,
    height: 20,
    tileSize: 48,
  },
  player: {
    id: 'player-1',
    displayName: 'Player',
    position: { x: 10, y: 10 },
  },
  npcs: [
    {
      id: 'npc-1',
      displayName: 'Archivist',
      position: { x: 8, y: 3 },
      dialogueContextKey: 'archive_keeper_intro',
    },
  ],
  guards: [
    {
      id: 'guard-1',
      displayName: 'West Guard',
      position: { x: 5, y: 10 },
      guardState: 'patrolling',
    },
  ],
  doors: [
    {
      id: 'door-1',
      displayName: 'West Door',
      position: { x: 2, y: 10 },
      doorState: 'closed',
      outcome: 'safe',
    },
  ],
  interactiveObjects: [
    {
      id: 'obj-1',
      displayName: 'Console',
      position: { x: 4, y: 5 },
      objectType: 'supply-crate',
      interactionType: 'inspect',
      state: 'idle',
    },
  ],
  npcConversationHistoryByNpcId: {},
  levelOutcome: null,
});

describe('render entity circle helpers', () => {
  it('maps entity type to deterministic color', () => {
    expect(getColorForEntityType('npc')).toBe(getColorForEntityType('npc'));
    expect(getColorForEntityType('interactive-object:inspect')).toBe(
      getColorForEntityType('interactive-object:inspect'),
    );
  });

  it('builds circles at tile-centered pixel coordinates for all renderable entities', () => {
    const worldState = createWorldState();

    const circles = buildEntityCircleSpecs(worldState);

    expect(circles).toHaveLength(4);
    expect(circles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          typeKey: 'npc',
          centerX: 8 * 48 + 24,
          centerY: 3 * 48 + 24,
          color: getColorForEntityType('npc'),
        }),
        expect.objectContaining({
          typeKey: 'guard',
          centerX: 5 * 48 + 24,
          centerY: 10 * 48 + 24,
          color: getColorForEntityType('guard'),
        }),
        expect.objectContaining({
          typeKey: 'door',
          centerX: 2 * 48 + 24,
          centerY: 10 * 48 + 24,
          color: getColorForEntityType('door'),
        }),
        expect.objectContaining({
          typeKey: 'interactive-object:inspect',
          centerX: 4 * 48 + 24,
          centerY: 5 * 48 + 24,
          color: getColorForEntityType('interactive-object:inspect'),
        }),
      ]),
    );
  });

  it('recomputes positions when world state is replaced during level switch/reset', () => {
    const beforeReset = createWorldState();
    const afterReset: WorldState = {
      ...beforeReset,
      npcs: [
        {
          ...beforeReset.npcs[0],
          position: { x: 12, y: 1 },
        },
      ],
      guards: [
        {
          ...beforeReset.guards[0],
          position: { x: 1, y: 12 },
        },
      ],
      doors: [
        {
          ...beforeReset.doors[0],
          position: { x: 18, y: 8 },
        },
      ],
      interactiveObjects: [
        {
          ...beforeReset.interactiveObjects[0],
          position: { x: 9, y: 9 },
        },
      ],
    };

    const circlesBeforeReset = buildEntityCircleSpecs(beforeReset);
    const circlesAfterReset = buildEntityCircleSpecs(afterReset);

    expect(circlesAfterReset).not.toEqual(circlesBeforeReset);
    expect(circlesAfterReset).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ typeKey: 'npc', centerX: 12 * 48 + 24, centerY: 1 * 48 + 24 }),
        expect.objectContaining({ typeKey: 'guard', centerX: 1 * 48 + 24, centerY: 12 * 48 + 24 }),
        expect.objectContaining({ typeKey: 'door', centerX: 18 * 48 + 24, centerY: 8 * 48 + 24 }),
        expect.objectContaining({
          typeKey: 'interactive-object:inspect',
          centerX: 9 * 48 + 24,
          centerY: 9 * 48 + 24,
        }),
      ]),
    );
  });
});
