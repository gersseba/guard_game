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

export interface Npc {
  id: string;
  displayName: string;
  position: GridPosition;
  npcType: string;
  dialogueContextKey: string;
  spriteAssetPath?: string;
  spriteSet?: SpriteSet;
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

/** Shared base for all interactable world objects. JSON-serializable. */
export interface Interactable {
  id: string;
  displayName: string;
  position: GridPosition;
}

/** A guard entity that the player can interact with. */
export interface Guard extends Interactable {
  guardState: 'idle' | 'patrolling' | 'alert';
  honestyTrait?: 'truth-teller' | 'liar';
  facingDirection?: SpriteDirection;
  spriteAssetPath?: string;
  spriteSet?: SpriteSet;
  /** Instance-specific knowledge this guard has (overrides or extends type-level knowledge). */
  instanceKnowledge?: string;
  /** Instance-specific behavior traits for this guard (overrides or extends type-level behavior). */
  instanceBehavior?: string;
}

/** A door that the player can pass through or be blocked by. */
export interface Door extends Interactable {
  doorState: 'open' | 'closed' | 'locked';
  outcome?: 'safe' | 'danger';
  spriteAssetPath?: string;
  spriteSet?: SpriteSet;
}

export interface InteractiveObject extends Interactable {
  objectType: 'supply-crate';
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
  width: number;
  height: number;
  player: { x: number; y: number; spriteAssetPath?: string; spriteSet?: SpriteSet };
  guards: Array<{
    id: string;
    displayName: string;
    x: number;
    y: number;
    guardState: 'patrolling' | 'alert' | 'idle';
    honestyTrait?: 'truth-teller' | 'liar';
    spriteAssetPath?: string;
    spriteSet?: SpriteSet;
    /** Instance-specific knowledge this guard has. */
    instanceKnowledge?: string;
    /** Instance-specific behavior traits for this guard. */
    instanceBehavior?: string;
  }>;
  doors: Array<{
    id: string;
    displayName: string;
    x: number;
    y: number;
    doorState: 'open' | 'closed' | 'locked';
    outcome: 'safe' | 'danger';
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
    objectType: 'supply-crate';
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
  }>;
}

export interface WorldState {
  tick: number;
  grid: WorldGrid;
<<<<<<< HEAD
  levelObjective: string;
=======
  levelMetadata: LevelMetadata;
>>>>>>> b9bd8b0 (#111 add premise and goal metadata to level system)
  player: Player;
  npcs: Npc[];
  guards: Guard[];
  doors: Door[];
  interactiveObjects: InteractiveObject[];
  actorConversationHistoryByActorId: ActorConversationHistoryByActorId;
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
    };

export interface World {
  getState(): WorldState;
  applyCommands(commands: WorldCommand[]): void;
  resetToState(state: WorldState): void;
}
