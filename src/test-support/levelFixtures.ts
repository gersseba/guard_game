import type { LevelData } from '../world/types';

export const keyArmoryLevelFixture: LevelData = {
  version: 2,
  name: 'The Locked Armory',
  premise: 'A locked armory holds the supplies you need. You spotted a key in an old crate nearby.',
  goal: 'Find the key, unlock the armory door, and step through to safety.',
  width: 20,
  height: 20,
  player: {
    x: 10,
    y: 12,
  },
  guards: [],
  doors: [
    {
      id: 'armory-door',
      displayName: 'Armory Door',
      x: 11,
      y: 8,
      doorState: 'locked',
      requiredItemId: 'armory-key',
    },
  ],
  interactiveObjects: [
    {
      id: 'old-crate',
      displayName: 'Old Crate',
      x: 10,
      y: 11,
      objectType: 'supply-crate',
      interactionType: 'inspect',
      state: 'idle',
      pickupItem: {
        itemId: 'armory-key',
        displayName: 'Armory Key',
      },
      idleMessage: 'The crate is splintered but still intact.',
      capabilities: {
        containsItems: true,
      },
    },
  ],
};

export const guardBribeLevelFixture: LevelData = {
  version: 2,
  name: 'The Persuasive Bribe',
  premise: 'A guard blocks the only passage through the old gate. Rumour has it they can be persuaded with enough coin.',
  goal: 'Offer the gold coin to the guard and slip through the gate.',
  width: 20,
  height: 20,
  player: {
    x: 10,
    y: 12,
  },
  guards: [
    {
      id: 'gate-guard',
      displayName: 'Gate Guard',
      x: 10,
      y: 9,
      guardState: 'idle',
      itemUseRules: {
        'gold-coin': {
          allowed: true,
          responseText: "A bribe? I suppose I didn't see anything. Move along.",
        },
        'iron-key': {
          allowed: false,
          responseText: 'A key is not a bribe. Move along.',
        },
      },
    },
  ],
  doors: [],
  interactiveObjects: [
    {
      id: 'coin-pouch',
      displayName: 'Coin Pouch',
      x: 8,
      y: 8,
      objectType: 'pouch',
      interactionType: 'inspect',
      state: 'idle',
      pickupItem: {
        itemId: 'gold-coin',
        displayName: 'Gold Coin',
      },
      idleMessage: 'A worn pouch with a few coins inside.',
      capabilities: {
        containsItems: true,
      },
    },
  ],
};

export const brokenMechanismLevelFixture: LevelData = {
  version: 2,
  name: 'The Broken Mechanism',
  premise: 'An ancient door mechanism is jammed. The corridor beyond holds your escape, but only the right tool can fix the mechanism.',
  goal: 'Find the iron wrench and repair the mechanism to open the path forward.',
  width: 20,
  height: 20,
  player: {
    x: 5,
    y: 10,
  },
  guards: [],
  doors: [],
  interactiveObjects: [
    {
      id: 'tool-chest',
      displayName: 'Tool Chest',
      x: 5,
      y: 8,
      objectType: 'tool-chest',
      interactionType: 'inspect',
      state: 'idle',
      pickupItem: {
        itemId: 'wrench',
        displayName: 'Iron Wrench',
      },
      idleMessage: 'A chest of rusted tools.',
      capabilities: {
        containsItems: true,
      },
    },
    {
      id: 'door-mechanism',
      displayName: 'Door Mechanism',
      x: 10,
      y: 7,
      objectType: 'mechanism',
      interactionType: 'use',
      state: 'idle',
      idleMessage: 'The mechanism is jammed and refuses to move.',
      usedMessage: 'The mechanism hums smoothly now.',
      capabilities: {
        isActivatable: true,
      },
      itemUseRules: {
        wrench: {
          allowed: true,
          responseText: 'The mechanism clicks into place. The corridor door swings open.',
        },
        'gold-coin': {
          allowed: false,
          responseText: 'A coin will not fix a broken mechanism.',
        },
      },
    },
  ],
};