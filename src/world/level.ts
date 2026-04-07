import type { Environment, GridPosition, LevelData, Npc, WorldState } from './types';
import { validateSpatialLayout } from './spatialRules';

const DEFAULT_TILE_SIZE = 48;

const SPRITE_SET_KEYS = ['default', 'front', 'away', 'left', 'right'] as const;

const validateSpriteSet = (
  value: unknown,
  contextLabel: string,
): void => {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`Invalid level data: ${contextLabel} spriteSet must be an object when provided`);
  }

  const raw = value as Record<string, unknown>;
  let hasAnyPath = false;
  for (const key of SPRITE_SET_KEYS) {
    const path = raw[key];
    if (path === undefined) {
      continue;
    }
    if (typeof path !== 'string') {
      throw new Error(`Invalid level data: ${contextLabel} spriteSet.${key} must be a string when provided`);
    }
    hasAnyPath = true;
  }

  if (!hasAnyPath) {
    throw new Error(`Invalid level data: ${contextLabel} spriteSet must provide at least one sprite path`);
  }
};

const validateItemUseRules = (value: unknown, contextLabel: string): void => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid level data: ${contextLabel} itemUseRules must be an object when provided`);
  }

  const rawRules = value as Record<string, unknown>;
  for (const [itemId, rule] of Object.entries(rawRules)) {
    if (typeof rule !== 'object' || rule === null || Array.isArray(rule)) {
      throw new Error(
        `Invalid level data: ${contextLabel} itemUseRules.${itemId} must be an object with allowed and responseText`,
      );
    }

    const rawRule = rule as Record<string, unknown>;
    if (typeof rawRule['allowed'] !== 'boolean') {
      throw new Error(
        `Invalid level data: ${contextLabel} itemUseRules.${itemId}.allowed must be a boolean`,
      );
    }

    if (typeof rawRule['responseText'] !== 'string') {
      throw new Error(
        `Invalid level data: ${contextLabel} itemUseRules.${itemId}.responseText must be a string`,
      );
    }
  }
};

const validateObjectCapabilities = (value: unknown, contextLabel: string): void => {
  if (value === undefined) {
    return;
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid level data: ${contextLabel} capabilities must be an object when provided`);
  }

  const rawCapabilities = value as Record<string, unknown>;
  for (const [key, val] of Object.entries(rawCapabilities)) {
    if (key !== 'containsItems' && key !== 'isActivatable' && key !== 'isLockable') {
      throw new Error(`Invalid level data: ${contextLabel} capabilities has unknown key '${key}'`);
    }
    if (typeof val !== 'boolean') {
      throw new Error(
        `Invalid level data: ${contextLabel} capabilities.${key} must be a boolean when provided`,
      );
    }
  }
};

const validateGridPositionInBounds = (
  value: unknown,
  contextLabel: string,
  gridWidth: number,
  gridHeight: number,
): void => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid level data: ${contextLabel} must be an object with numeric x and y`);
  }

  const position = value as Record<string, unknown>;
  if (typeof position['x'] !== 'number' || typeof position['y'] !== 'number') {
    throw new Error(`Invalid level data: ${contextLabel} must include numeric x and y`);
  }

  if (
    position['x'] < 0 ||
    position['x'] >= gridWidth ||
    position['y'] < 0 ||
    position['y'] >= gridHeight
  ) {
    throw new Error(
      `Invalid level data: ${contextLabel} is out of bounds at (${position['x']}, ${position['y']})`,
    );
  }
};

const validateTriggerEffect = (value: unknown, contextLabel: string): void => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid level data: ${contextLabel} must be an object when provided`);
  }

  const effect = value as Record<string, unknown>;
  if (typeof effect['setFact'] !== 'string' || effect['setFact'].trim() === '') {
    throw new Error(`Invalid level data: ${contextLabel}.setFact must be a non-empty string`);
  }

  const effectValue = effect['value'];
  if (
    typeof effectValue !== 'string' &&
    typeof effectValue !== 'boolean' &&
    typeof effectValue !== 'number'
  ) {
    throw new Error(
      `Invalid level data: ${contextLabel}.value must be a string, boolean, or number`,
    );
  }
};

const validateNpcTriggers = (value: unknown, contextLabel: string): void => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid level data: ${contextLabel} must be an object when provided`);
  }

  const triggers = value as Record<string, unknown>;
  for (const key of Object.keys(triggers)) {
    if (key !== 'onApproach' && key !== 'onTalk') {
      throw new Error(`Invalid level data: ${contextLabel} has unknown key '${key}'`);
    }
  }

  if (triggers['onApproach'] !== undefined) {
    validateTriggerEffect(triggers['onApproach'], `${contextLabel}.onApproach`);
  }

  if (triggers['onTalk'] !== undefined) {
    validateTriggerEffect(triggers['onTalk'], `${contextLabel}.onTalk`);
  }
};

const validateInventoryItems = (value: unknown, contextLabel: string): void => {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid level data: ${contextLabel} must be an array when provided`);
  }

  for (let index = 0; index < value.length; index++) {
    const item = value[index] as Record<string, unknown>;
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof item['itemId'] !== 'string' ||
      typeof item['displayName'] !== 'string' ||
      typeof item['sourceObjectId'] !== 'string' ||
      typeof item['pickedUpAtTick'] !== 'number'
    ) {
      throw new Error(
        `Invalid level data: ${contextLabel}[${index}] must include itemId, displayName, sourceObjectId, and pickedUpAtTick`,
      );
    }
  }
};

/**
 * Validates that an unknown value conforms to the LevelData schema.
 * Throws a descriptive Error if any required field is missing or has an unexpected type/value.
 */
export function validateLevelData(input: unknown): LevelData {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Invalid level data: expected an object');
  }

  const raw = input as Record<string, unknown>;

  if (raw['version'] === undefined) {
    throw new Error('Level format version is missing. Expected version 2.');
  }

  if (raw['version'] !== 2) {
    throw new Error(`Level format version ${raw['version']} is not supported. Expected version 2.`);
  }

  if (typeof raw['name'] !== 'string' || raw['name'].trim() === '') {
    throw new Error('Invalid level data: name must be a non-empty string');
  }

  if (typeof raw['premise'] !== 'string' || raw['premise'].trim() === '') {
    throw new Error('Invalid level data: premise must be a non-empty string');
  }

  if (typeof raw['goal'] !== 'string' || raw['goal'].trim() === '') {
    throw new Error('Invalid level data: goal must be a non-empty string');
  }

  if (typeof raw['width'] !== 'number' || raw['width'] <= 0) {
    throw new Error('Invalid level data: width must be a positive number');
  }

  if (typeof raw['height'] !== 'number' || raw['height'] <= 0) {
    throw new Error('Invalid level data: height must be a positive number');
  }

  const levelWidth = raw['width'] as number;
  const levelHeight = raw['height'] as number;

  const player = raw['player'];
  if (
    typeof player !== 'object' ||
    player === null ||
    typeof (player as Record<string, unknown>)['x'] !== 'number' ||
    typeof (player as Record<string, unknown>)['y'] !== 'number'
  ) {
    throw new Error('Invalid level data: player must have numeric x and y');
  }

  if (
    (player as Record<string, unknown>)['spriteAssetPath'] !== undefined &&
    typeof (player as Record<string, unknown>)['spriteAssetPath'] !== 'string'
  ) {
    throw new Error('Invalid level data: player spriteAssetPath must be a string when provided');
  }

  if ((player as Record<string, unknown>)['spriteSet'] !== undefined) {
    validateSpriteSet((player as Record<string, unknown>)['spriteSet'], 'player');
  }

  if (!Array.isArray(raw['guards'])) {
    throw new Error('Invalid level data: guards must be an array');
  }

  for (let i = 0; i < (raw['guards'] as unknown[]).length; i++) {
    const guard = (raw['guards'] as unknown[])[i] as Record<string, unknown>;
    if (
      typeof guard !== 'object' ||
      guard === null ||
      typeof guard['id'] !== 'string' ||
      typeof guard['displayName'] !== 'string' ||
      typeof guard['x'] !== 'number' ||
      typeof guard['y'] !== 'number' ||
      typeof guard['guardState'] !== 'string'
    ) {
      throw new Error(
        `Invalid level data: guard at index ${i} must have id, displayName, x, y, and guardState`,
      );
    }
    // honestyTrait is optional
    // traits is optional — validate it's a plain string-valued object when present
    if (guard['traits'] !== undefined) {
      if (typeof guard['traits'] !== 'object' || guard['traits'] === null || Array.isArray(guard['traits'])) {
        throw new Error(`Invalid level data: guard at index ${i} has invalid traits (must be a plain object when provided)`);
      }
      const rawTraits = guard['traits'] as Record<string, unknown>;
      for (const [key, value] of Object.entries(rawTraits)) {
        if (typeof value !== 'string') {
          throw new Error(`Invalid level data: guard at index ${i} traits.${key} must be a string`);
        }
      }
    }

    if (guard['spriteAssetPath'] !== undefined && typeof guard['spriteAssetPath'] !== 'string') {
      throw new Error(
        `Invalid level data: guard at index ${i} has invalid spriteAssetPath (must be a string when provided)`,
      );
    }

    if (guard['spriteSet'] !== undefined) {
      validateSpriteSet(guard['spriteSet'], `guard at index ${i}`);
    }

    // instanceKnowledge and instanceBehavior are optional strings
    if (guard['instanceKnowledge'] !== undefined && typeof guard['instanceKnowledge'] !== 'string') {
      throw new Error(
        `Invalid level data: guard at index ${i} has invalid instanceKnowledge (must be a string when provided)`,
      );
    }

    if (guard['instanceBehavior'] !== undefined && typeof guard['instanceBehavior'] !== 'string') {
      throw new Error(
        `Invalid level data: guard at index ${i} has invalid instanceBehavior (must be a string when provided)`,
      );
    }

    if (guard['itemUseRules'] !== undefined) {
      validateItemUseRules(guard['itemUseRules'], `guard at index ${i}`);
    }
  }

  if (!Array.isArray(raw['doors'])) {
    throw new Error('Invalid level data: doors must be an array');
  }

  for (let i = 0; i < (raw['doors'] as unknown[]).length; i++) {
    const door = (raw['doors'] as unknown[])[i] as Record<string, unknown>;
    if (
      typeof door !== 'object' ||
      door === null ||
      typeof door['id'] !== 'string' ||
      typeof door['displayName'] !== 'string' ||
      typeof door['x'] !== 'number' ||
      typeof door['y'] !== 'number' ||
      typeof door['doorState'] !== 'string'
    ) {
      throw new Error(
        `Invalid level data: door at index ${i} must have id, displayName, x, y, and doorState`,
      );
    }
    if (door['outcome'] !== undefined && door['outcome'] !== 'safe' && door['outcome'] !== 'danger') {
      throw new Error(
        `Invalid level data: door at index ${i} has invalid outcome (must be 'safe' or 'danger')`,
      );
    }
    if (door['requiredItemId'] !== undefined && typeof door['requiredItemId'] !== 'string') {
      throw new Error(
        `Invalid level data: door at index ${i} has invalid requiredItemId (must be a string when provided)`,
      );
    }

    if (door['spriteAssetPath'] !== undefined && typeof door['spriteAssetPath'] !== 'string') {
      throw new Error(
        `Invalid level data: door at index ${i} has invalid spriteAssetPath (must be a string when provided)`,
      );
    }

    if (door['spriteSet'] !== undefined) {
      validateSpriteSet(door['spriteSet'], `door at index ${i}`);
    }
  }

  if (raw['npcs'] !== undefined) {
    if (!Array.isArray(raw['npcs'])) {
      throw new Error('Invalid level data: npcs must be an array');
    }

    for (let i = 0; i < (raw['npcs'] as unknown[]).length; i++) {
      const npc = (raw['npcs'] as unknown[])[i] as Record<string, unknown>;
      if (
        typeof npc !== 'object' ||
        npc === null ||
        typeof npc['id'] !== 'string' ||
        typeof npc['displayName'] !== 'string' ||
        typeof npc['x'] !== 'number' ||
        typeof npc['y'] !== 'number' ||
        typeof npc['npcType'] !== 'string'
      ) {
        throw new Error(
          `Invalid level data: npc at index ${i} must have id, displayName, x, y, and npcType`,
        );
      }

      if (npc['spriteAssetPath'] !== undefined && typeof npc['spriteAssetPath'] !== 'string') {
        throw new Error(
          `Invalid level data: npc at index ${i} has invalid spriteAssetPath (must be a string when provided)`,
        );
      }

      if (npc['spriteSet'] !== undefined) {
        validateSpriteSet(npc['spriteSet'], `npc at index ${i}`);
      }

      if (npc['patrol'] !== undefined) {
        if (
          typeof npc['patrol'] !== 'object' ||
          npc['patrol'] === null ||
          Array.isArray(npc['patrol'])
        ) {
          throw new Error(`Invalid level data: npc at index ${i} patrol must be an object when provided`);
        }

        const patrol = npc['patrol'] as Record<string, unknown>;
        if (!Array.isArray(patrol['path'])) {
          throw new Error(`Invalid level data: npc at index ${i} patrol.path must be an array`);
        }

        for (let pathIndex = 0; pathIndex < patrol['path'].length; pathIndex++) {
          validateGridPositionInBounds(
            patrol['path'][pathIndex],
            `npc at index ${i} patrol.path[${pathIndex}]`,
            levelWidth,
            levelHeight,
          );
        }
      }

      if (npc['triggers'] !== undefined) {
        validateNpcTriggers(npc['triggers'], `npc at index ${i} triggers`);
      }

      if (npc['inventory'] !== undefined) {
        validateInventoryItems(npc['inventory'], `npc at index ${i} inventory`);
      }

      // instanceKnowledge and instanceBehavior are optional strings
      if (npc['instanceKnowledge'] !== undefined && typeof npc['instanceKnowledge'] !== 'string') {
        throw new Error(
          `Invalid level data: npc at index ${i} has invalid instanceKnowledge (must be a string when provided)`,
        );
      }

      if (npc['instanceBehavior'] !== undefined && typeof npc['instanceBehavior'] !== 'string') {
        throw new Error(
          `Invalid level data: npc at index ${i} has invalid instanceBehavior (must be a string when provided)`,
        );
      }

      // riddleClue is optional
      if (npc['riddleClue'] !== undefined) {
        const riddleClue = npc['riddleClue'] as Record<string, unknown>;
        if (
          typeof riddleClue !== 'object' ||
          riddleClue === null ||
          typeof riddleClue['clueId'] !== 'string' ||
          typeof riddleClue['doorId'] !== 'string' ||
          (riddleClue['truthBehavior'] !== 'truthful' && riddleClue['truthBehavior'] !== 'inverse')
        ) {
          throw new Error(
            `Invalid level data: npc at index ${i} has invalid riddleClue (must have clueId, doorId, and truthBehavior ('truthful' or 'inverse'))`,
          );
        }
      }
    }
  }

  if (raw['interactiveObjects'] !== undefined) {
    if (!Array.isArray(raw['interactiveObjects'])) {
      throw new Error('Invalid level data: interactiveObjects must be an array');
    }

    for (let i = 0; i < (raw['interactiveObjects'] as unknown[]).length; i++) {
      const interactiveObject = (raw['interactiveObjects'] as unknown[])[i] as Record<string, unknown>;
      if (
        typeof interactiveObject !== 'object' ||
        interactiveObject === null ||
        typeof interactiveObject['id'] !== 'string' ||
        typeof interactiveObject['displayName'] !== 'string' ||
        typeof interactiveObject['x'] !== 'number' ||
        typeof interactiveObject['y'] !== 'number' ||
        typeof interactiveObject['objectType'] !== 'string' ||
        (interactiveObject['interactionType'] !== 'inspect' &&
          interactiveObject['interactionType'] !== 'use' &&
          interactiveObject['interactionType'] !== 'talk') ||
        (interactiveObject['state'] !== 'idle' && interactiveObject['state'] !== 'used')
      ) {
        throw new Error(
          `Invalid level data: interactiveObject at index ${i} must have id, displayName, x, y, objectType (string), interactionType, and state`,
        );
      }

      if (
        interactiveObject['firstUseOutcome'] !== undefined &&
        interactiveObject['firstUseOutcome'] !== 'win' &&
        interactiveObject['firstUseOutcome'] !== 'lose'
      ) {
        throw new Error(
          `Invalid level data: interactiveObject at index ${i} has invalid firstUseOutcome (must be 'win' or 'lose')`,
        );
      }

      if (interactiveObject['pickupItem'] !== undefined) {
        const pickupItem = interactiveObject['pickupItem'] as Record<string, unknown>;
        if (
          typeof pickupItem !== 'object' ||
          pickupItem === null ||
          typeof pickupItem['itemId'] !== 'string' ||
          pickupItem['itemId'].trim() === '' ||
          typeof pickupItem['displayName'] !== 'string' ||
          pickupItem['displayName'].trim() === ''
        ) {
          throw new Error(
            `Invalid level data: interactiveObject at index ${i} has invalid pickupItem (must include non-empty string itemId and displayName)`,
          );
        }
      }

      if (
        interactiveObject['spriteAssetPath'] !== undefined &&
        typeof interactiveObject['spriteAssetPath'] !== 'string'
      ) {
        throw new Error(
          `Invalid level data: interactiveObject at index ${i} has invalid spriteAssetPath (must be a string when provided)`,
        );
      }

      if (interactiveObject['spriteSet'] !== undefined) {
        validateSpriteSet(interactiveObject['spriteSet'], `interactiveObject at index ${i}`);
      }

      if (interactiveObject['capabilities'] !== undefined) {
        validateObjectCapabilities(interactiveObject['capabilities'], `interactiveObject at index ${i}`);
      }

      if (interactiveObject['itemUseRules'] !== undefined) {
        validateItemUseRules(interactiveObject['itemUseRules'], `interactiveObject at index ${i}`);
      }
    }
  }

  if (raw['environments'] !== undefined) {
    if (!Array.isArray(raw['environments'])) {
      throw new Error('Invalid level data: environments must be an array');
    }

    for (let i = 0; i < (raw['environments'] as unknown[]).length; i++) {
      const environment = (raw['environments'] as unknown[])[i] as Record<string, unknown>;

      if (
        typeof environment !== 'object' ||
        environment === null ||
        typeof environment['id'] !== 'string' ||
        typeof environment['displayName'] !== 'string' ||
        typeof environment['x'] !== 'number' ||
        typeof environment['y'] !== 'number' ||
        typeof environment['isBlocking'] !== 'boolean'
      ) {
        throw new Error(
          `Invalid level data: environment at index ${i} must have id, displayName, x, y, and isBlocking`,
        );
      }
    }
  }

  return raw as unknown as LevelData;
}

/**
 * Converts a flat LevelData JSON document into a fully-typed WorldState.
 * Pure and deterministic: same input always produces the same output.
 */
export function deserializeLevel(levelData: LevelData): WorldState {
  const worldState: WorldState = {
    tick: 0,
    grid: {
      width: levelData.width,
      height: levelData.height,
      tileSize: DEFAULT_TILE_SIZE,
    },
    levelMetadata: {
      name: levelData.name,
      premise: levelData.premise,
      goal: levelData.goal,
    },
    player: {
      id: 'player',
      displayName: 'Player',
      position: { x: levelData.player.x, y: levelData.player.y },
      inventory: {
        items: [],
        selectedItem: null,
      },
      facingDirection: 'front',
      ...(levelData.player.spriteAssetPath !== undefined
        ? { spriteAssetPath: levelData.player.spriteAssetPath }
        : {}),
      ...(levelData.player.spriteSet !== undefined ? { spriteSet: levelData.player.spriteSet } : {}),
    },
    npcs: (levelData.npcs ?? []).map((n) => {
      const npc: Npc = {
        id: n.id,
        displayName: n.displayName,
        position: { x: n.x, y: n.y },
        npcType: n.npcType,
        dialogueContextKey: `npc_${n.npcType.toLowerCase()}`,
        ...(n.spriteAssetPath !== undefined ? { spriteAssetPath: n.spriteAssetPath } : {}),
        ...(n.spriteSet !== undefined ? { spriteSet: n.spriteSet } : {}),
        ...(n.patrol !== undefined
          ? {
              patrol: {
                path: n.patrol.path.map((position: GridPosition) => ({ x: position.x, y: position.y })),
              },
            }
          : {}),
        ...(n.triggers !== undefined ? { triggers: n.triggers } : {}),
        ...(n.inventory !== undefined
          ? {
              inventory: n.inventory.map((item) => ({
                itemId: item.itemId,
                displayName: item.displayName,
                sourceObjectId: item.sourceObjectId,
                pickedUpAtTick: item.pickedUpAtTick,
              })),
            }
          : {}),
        ...(n.instanceKnowledge !== undefined ? { instanceKnowledge: n.instanceKnowledge } : {}),
        ...(n.instanceBehavior !== undefined ? { instanceBehavior: n.instanceBehavior } : {}),
      };

      // Add riddleClue if present, computing mustStateDoorAs
      if (n.riddleClue !== undefined) {
        const door = levelData.doors.find((d) => d.id === n.riddleClue!.doorId);
        if (!door) {
          throw new Error(
            `Invalid level data: npc ${n.id} references non-existent door ${n.riddleClue.doorId}`,
          );
        }

        // Logic: if door is safe and NPC is truthful, NPC must state "safe"
        //        if door is safe and NPC is inverse, NPC must state "danger"
        //        if door is danger and NPC is truthful, NPC must state "danger"
        //        if door is danger and NPC is inverse, NPC must state "safe"
        const mustStateDoorAs: 'safe' | 'danger' =
          (door.outcome === 'safe') === (n.riddleClue.truthBehavior === 'truthful')
            ? 'safe'
            : 'danger';

        npc.riddleClue = {
          clueId: n.riddleClue.clueId,
          doorId: n.riddleClue.doorId,
          truthBehavior: n.riddleClue.truthBehavior,
          mustStateDoorAs,
        };
      }

      return npc;
    }),
    guards: levelData.guards.map((g) => ({
      id: g.id,
      displayName: g.displayName,
      position: { x: g.x, y: g.y },
      guardState: g.guardState,
      ...(g.traits !== undefined ? { traits: g.traits } : {}),
      ...(g.spriteAssetPath !== undefined ? { spriteAssetPath: g.spriteAssetPath } : {}),
      ...(g.spriteSet !== undefined ? { spriteSet: g.spriteSet } : {}),
      ...(g.instanceKnowledge !== undefined ? { instanceKnowledge: g.instanceKnowledge } : {}),
      ...(g.instanceBehavior !== undefined ? { instanceBehavior: g.instanceBehavior } : {}),
      ...(g.itemUseRules !== undefined ? { itemUseRules: g.itemUseRules } : {}),
    })),
    doors: levelData.doors.map((d) => ({
      id: d.id,
      displayName: d.displayName,
      position: { x: d.x, y: d.y },
      doorState: d.doorState,
      ...(d.outcome !== undefined ? { outcome: d.outcome } : {}),
      ...(d.requiredItemId !== undefined ? { requiredItemId: d.requiredItemId } : {}),
      isUnlocked: false,
      ...(d.spriteAssetPath !== undefined ? { spriteAssetPath: d.spriteAssetPath } : {}),
      ...(d.spriteSet !== undefined ? { spriteSet: d.spriteSet } : {}),
    })),
    interactiveObjects: (levelData.interactiveObjects ?? []).map((o) => ({
      id: o.id,
      displayName: o.displayName,
      position: { x: o.x, y: o.y },
      objectType: o.objectType,
      interactionType: o.interactionType,
      state: o.state,
      pickupItem: o.pickupItem,
      idleMessage: o.idleMessage,
      usedMessage: o.usedMessage,
      firstUseOutcome: o.firstUseOutcome,
      spriteAssetPath: o.spriteAssetPath,
      spriteSet: o.spriteSet,
      capabilities: o.capabilities,
      itemUseRules: o.itemUseRules,
    })),
    environments: (levelData.environments ?? []).map(
      (environment): Environment => ({
        id: environment.id,
        displayName: environment.displayName,
        position: { x: environment.x, y: environment.y },
        isBlocking: environment.isBlocking,
      }),
    ),
    actorConversationHistoryByActorId: {},
    lastItemUseAttemptEvent: null,
    levelOutcome: null,
  };
  validateSpatialLayout(worldState);
  return worldState;
}
