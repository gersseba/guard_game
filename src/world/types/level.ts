import type { GridPosition, SpriteSet } from './grid.js';
import type { InventoryItem, ItemUseRule } from './inventory.js';
import type { NpcTriggers } from './npc.js';

export interface LevelPlayerDto {
  x: number;
  y: number;
  spriteAssetPath?: string;
  spriteSet?: SpriteSet;
}

export interface LevelGuardDto {
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
  /** Deterministic item-use rules: item ID -> rule definition */
  itemUseRules?: Record<string, ItemUseRule>;
}

export interface LevelDoorDto {
  id: string;
  displayName: string;
  x: number;
  y: number;
  /** Whether the door starts open. */
  isOpen: boolean;
  /** Whether the door starts locked. */
  isLocked: boolean;
  /** Deterministic level outcome trigger for this door. true => win, false => lose. */
  isSafe?: boolean;
  /** Item ID required to unlock this door */
  requiredItemId?: string;
  spriteAssetPath?: string;
  spriteSet?: SpriteSet;
}

export interface LevelNpcRiddleClueDto {
  clueId: string;
  doorId: string;
  truthBehavior: 'truthful' | 'inverse';
}

export interface LevelNpcDto {
  id: string;
  displayName: string;
  x: number;
  y: number;
  npcType: string;
  patrol?: { path: GridPosition[] };
  triggers?: NpcTriggers;
  inventory?: InventoryItem[];
  spriteAssetPath?: string;
  spriteSet?: SpriteSet;
  /** Instance-specific knowledge this NPC has. */
  instanceKnowledge?: string;
  /** Instance-specific behavior traits for this NPC. */
  instanceBehavior?: string;
  /** Riddle clue constraint for logic puzzle NPCs. */
  riddleClue?: LevelNpcRiddleClueDto;
}

export interface LevelInteractiveObjectDto {
  id: string;
  displayName: string;
  x: number;
  y: number;
  objectType: string;
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
  capabilities?: {
    containsItems?: boolean;
    isActivatable?: boolean;
    isLockable?: boolean;
  };
  /** Deterministic item-use rules: item ID -> rule definition */
  itemUseRules?: Record<string, ItemUseRule>;
}

export interface LevelEnvironmentDto {
  id: string;
  displayName: string;
  x: number;
  y: number;
  isBlocking: boolean;
}

/** Flat JSON representation of a level file (public/levels/*.json). Version-stamped for future migrations. */
export interface LevelData {
  version: number;
  name: string;
  premise: string;
  goal: string;
  objective?: string;
  width: number;
  height: number;
  player: LevelPlayerDto;
  guards: LevelGuardDto[];
  doors: LevelDoorDto[];
  npcs?: LevelNpcDto[];
  interactiveObjects?: LevelInteractiveObjectDto[];
  environments?: LevelEnvironmentDto[];
}
