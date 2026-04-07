export interface GridPosition {
  x: number;
  y: number;
}

export type SpriteDirection = 'front' | 'away' | 'left' | 'right';

/**
 * Serializable sprite configuration for entities with optional directional variants.
 * `default` provides a deterministic base asset when a directional key is missing.
 */
export interface SpriteSet {
  default?: string;
  front?: string;
  away?: string;
  left?: string;
  right?: string;
}

export interface InventoryItem {
  itemId: string;
  displayName: string;
  sourceObjectId: string;
  pickedUpAtTick: number;
}

export interface PlayerInventory {
  items: InventoryItem[];
  selectedItem?: SelectedInventoryItem | null;
}

export interface SelectedInventoryItem {
  slotIndex: number;
  itemId: string;
}

/**
 * Deterministic item-use rule for guards or objects.
 * Defines whether an item can be used and what response to provide.
 */
export interface ItemUseRule {
  allowed: boolean;
  responseText: string;
}

export type ItemUseAttemptResult = 'no-selection' | 'no-target' | 'blocked' | 'success' | 'no-rule';

export interface ItemUseAttemptResultEvent {
  tick: number;
  commandIndex: number;
  selectedItem: SelectedInventoryItem | null;
  result: ItemUseAttemptResult;
  target: {
    kind: 'door' | 'guard' | 'npc' | 'interactiveObject';
    targetId: string;
  } | null;
  /** If a door was unlocked via correct item-use, contains the door ID */
  doorUnlockedId?: string;
  /** Type of entity affected by successful item-use rule (guard or object) */
  affectedEntityType?: 'guard' | 'object';
  /** ID of entity affected by successful item-use rule */
  affectedEntityId?: string;
  /** Response text from the applied item-use rule */
  ruleResponseText?: string;
}

export interface Player {
  id: string;
  displayName: string;
  position: GridPosition;
  inventory: PlayerInventory;
  facingDirection?: SpriteDirection;
  spriteAssetPath?: string;
  spriteSet?: SpriteSet;
}

/**
 * Riddle clue constraint for an NPC in a logic puzzle.
 * Defines what claim the NPC must make about a door's safety.
 */
export interface RiddleClue {
  clueId: string;
  doorId: string;
  truthBehavior: 'truthful' | 'inverse';
  /** Computed field: what the NPC must claim about the door's safety */
  mustStateDoorAs: 'safe' | 'danger';
}

/**
 * Human-readable riddle clue constraint for prompt context.
 */
export interface RiddleClueConstraint {
  doorId: string;
  mustStateDoorAs: 'safe' | 'danger';
  constraint: string;
}

/**
 * Shared structural base for all game entities.
 * All world entities share this common root. JSON-serializable.
 */
export interface GameEntity {
  id: string;
  position: GridPosition;
  displayName: string;
  spriteSet?: SpriteSet;
  spriteAssetPath?: string;
  /** Open-ended behavioral traits bag, readable by LLM prompt builders. */
  traits?: Record<string, string>;
  /** Open-ended facts bag for arbitrary key/value data, readable by LLM prompt builders. */
  facts?: Record<string, string | number | boolean>;
}

/**
 * Opt-in capability container for game entities.
 * Capabilities are typed sub-objects; omit a key if the entity lacks that capability.
 */
export interface EntityCapabilities {
  inventory?: { items: InventoryItem[] };
  dialogue?: { threadId?: string };
  patrol?: { path: GridPosition[] };
  lock?: { isLocked: boolean; requiredItemId?: string };
}

export interface Npc extends GameEntity {
  npcType: string;
  dialogueContextKey: string;
  /** Instance-specific knowledge this NPC has (overrides or extends type-level knowledge). */
  instanceKnowledge?: string;
  /** Instance-specific behavior traits for this NPC (overrides or extends type-level behavior). */
  instanceBehavior?: string;
  /** Riddle clue constraint for logic puzzle NPCs. */
  riddleClue?: RiddleClue;
}

export interface ConversationMessage {
  role: 'player' | 'assistant';
  text: string;
}

export type ActorConversationHistoryByActorId = Record<string, ConversationMessage[]>;

/** A guard entity that the player can interact with. */
export interface Guard extends GameEntity {
  guardState: 'idle' | 'patrolling' | 'alert';
  facingDirection?: SpriteDirection;
  /** Instance-specific knowledge this guard has (overrides or extends type-level knowledge). */
  instanceKnowledge?: string;
  /** Instance-specific behavior traits for this guard (overrides or extends type-level behavior). */
  instanceBehavior?: string;
  /** Deterministic item-use rules: item ID → rule definition */
  itemUseRules?: Record<string, ItemUseRule>;
}

/** A door that the player can pass through or be blocked by. */
export interface Door extends GameEntity {
  doorState: 'open' | 'closed' | 'locked';
  outcome?: 'safe' | 'danger';
  /** Item ID required to unlock this door (if set, door must be interacted with using this item) */
  requiredItemId?: string;
  /** Whether this door has been unlocked via item-use (persists unlock state; default: false) */
  isUnlocked?: boolean;
}

export interface InteractiveObject extends GameEntity {
  objectType: 'supply-crate' | 'mechanism';
  interactionType: 'inspect' | 'use' | 'talk';
  state: 'idle' | 'used';
  pickupItem?: {
    itemId: string;
    displayName: string;
  };
  idleMessage?: string;
  usedMessage?: string;
  firstUseOutcome?: 'win' | 'lose';
  /** Deterministic item-use rules: item ID → rule definition */
  itemUseRules?: Record<string, ItemUseRule>;
}

export interface WorldGrid {
  width: number;
  height: number;
  tileSize: number;
}

export interface LevelMetadata {
  name: string;
  premise: string;
  goal: string;
}

/** Flat JSON representation of a level file (public/levels/*.json). Version-stamped for future migrations. */
export interface LevelData {
  version: 1;
  name: string;
  premise: string;
  goal: string;
  objective?: string;
  width: number;
  height: number;
  player: { x: number; y: number; spriteAssetPath?: string; spriteSet?: SpriteSet };
  guards: Array<{
    id: string;
    displayName: string;
    x: number;
    y: number;
    guardState: 'patrolling' | 'alert' | 'idle';
    /** Behavioral traits bag. Use traits.truthMode for guard honesty ('truth-teller' | 'liar'). */
    traits?: Record<string, string>;
    spriteAssetPath?: string;
    spriteSet?: SpriteSet;
    /** Instance-specific knowledge this guard has. */
    instanceKnowledge?: string;
    /** Instance-specific behavior traits for this guard. */
    instanceBehavior?: string;
    /** Deterministic item-use rules: item ID → rule definition */
    itemUseRules?: Record<string, ItemUseRule>;
  }>;
  doors: Array<{
    id: string;
    displayName: string;
    x: number;
    y: number;
    doorState: 'open' | 'closed' | 'locked';
    outcome?: 'safe' | 'danger';
    /** Item ID required to unlock this door */
    requiredItemId?: string;
    spriteAssetPath?: string;
    spriteSet?: SpriteSet;
  }>;
  npcs?: Array<{
    id: string;
    displayName: string;
    x: number;
    y: number;
    npcType: string;
    spriteAssetPath?: string;
    spriteSet?: SpriteSet;
    /** Instance-specific knowledge this NPC has. */
    instanceKnowledge?: string;
    /** Instance-specific behavior traits for this NPC. */
    instanceBehavior?: string;
    /** Riddle clue constraint for logic puzzle NPCs. */
    riddleClue?: {
      clueId: string;
      doorId: string;
      truthBehavior: 'truthful' | 'inverse';
    };
  }>;
  interactiveObjects?: Array<{
    id: string;
    displayName: string;
    x: number;
    y: number;
    objectType: 'supply-crate' | 'mechanism';
    interactionType: 'inspect' | 'use' | 'talk';
    state: 'idle' | 'used';
    pickupItem?: {
      itemId: string;
      displayName: string;
    };
    idleMessage?: string;
    usedMessage?: string;
    firstUseOutcome?: 'win' | 'lose';
    spriteAssetPath?: string;
    spriteSet?: SpriteSet;
    /** Deterministic item-use rules: item ID → rule definition */
    itemUseRules?: Record<string, ItemUseRule>;
  }>;
}

export interface WorldState {
  tick: number;
  grid: WorldGrid;
  levelMetadata: LevelMetadata;
  levelObjective?: string;
  player: Player;
  npcs: Npc[];
  guards: Guard[];
  doors: Door[];
  interactiveObjects: InteractiveObject[];
  actorConversationHistoryByActorId: ActorConversationHistoryByActorId;
  lastItemUseAttemptEvent?: ItemUseAttemptResultEvent | null;
  levelOutcome: 'win' | 'lose' | null;
}

export type WorldCommand =
  | {
      type: 'move';
      dx: number;
      dy: number;
    }
  | {
      type: 'interact';
    }
  | {
      type: 'selectInventorySlot';
      slotIndex: number;
    }
  | {
      type: 'useSelectedItem';
    };

export type IntentType = 'move' | 'wait' | 'interact';

/**
 * Represents an action requested by any actor (player, NPC, scripted).
 * Intent is decoupled from input source (keyboard, LLM, etc.).
 * Deterministically resolved by resolveIntent() function.
 */
export interface Intent {
  actorId: string;
  type: IntentType;
  payload?: {
    direction?: 'up' | 'down' | 'left' | 'right';
    targetId?: string;
    // Support arbitrary delta movement for backward compatibility during transition.
    // Preferred path uses direction; delta is fallback for legacy movement vectors.
    delta?: { dx: number; dy: number };
  };
}

export interface World {
  getState(): WorldState;
  applyCommands(commands: WorldCommand[]): void;
  resetToState(state: WorldState): void;
}
