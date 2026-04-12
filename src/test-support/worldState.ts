import type { Door, Guard, InteractiveObject, InventoryItem, Npc, WorldState } from '../world/types';
import { createQuestState } from '../world/questState';

export type TestWorldStateOverrides = Omit<Partial<WorldState>, 'player'> & {
  player?: Partial<WorldState['player']>;
};

export const createTestWorldState = (overrides?: TestWorldStateOverrides): WorldState => {
  const baseState: WorldState = {
    tick: 0,
    grid: { width: 10, height: 10, tileSize: 32 },
    levelMetadata: {
      name: 'Test Level',
      premise: 'Fixture for unit and integration tests.',
      goal: 'Exercise deterministic game behavior.',
    },
    levelObjective: 'Complete the test scenario.',
    player: {
      id: 'player',
      displayName: 'Player',
      position: { x: 0, y: 0 },
      inventory: {
        items: [],
      },
    },
    guards: [],
    doors: [],
    npcs: [],
    interactiveObjects: [],
    questState: createQuestState(),
    actorConversationHistoryByActorId: {},
    levelOutcome: null,
  };

  return {
    ...baseState,
    ...(overrides ?? {}),
    player: {
      ...baseState.player,
      ...(overrides?.player ?? {}),
    },
  };
};

export const createTestGuard = (id: string, overrides?: Partial<Guard>): Guard => ({
  id,
  displayName: 'Test Guard',
  position: { x: 1, y: 0 },
  guardState: 'idle',
  ...(overrides ?? {}),
});

export const createTestNpc = (id: string, overrides?: Partial<Npc>): Npc => ({
  id,
  displayName: 'Test NPC',
  position: { x: 1, y: 0 },
  dialogueContextKey: 'test',
  npcType: 'scholar',
  ...(overrides ?? {}),
});

export const createTestDoor = (id: string, overrides?: Partial<Door>): Door => ({
  id,
  displayName: 'Test Door',
  position: { x: 1, y: 0 },
  isOpen: true, isLocked: false,
  ...(overrides ?? {}),
});

export const createTestObject = (
  id: string,
  overrides?: Partial<InteractiveObject>,
): InteractiveObject => ({
  id,
  displayName: 'Test Object',
  position: { x: 1, y: 0 },
  objectType: 'supply-crate',
  interactionType: 'inspect',
  state: 'idle',
  idleMessage: 'You see a crate.',
  capabilities: {
    containsItems: true,
  },
  ...(overrides ?? {}),
});

export const createTestInventoryItem = (
  itemId: string,
  overrides?: Partial<InventoryItem>,
): InventoryItem => ({
  itemId,
  displayName: 'Test Item',
  sourceObjectId: 'test-source',
  pickedUpAtTick: 1,
  ...(overrides ?? {}),
});