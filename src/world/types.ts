/**
 * Barrel export file for world type contracts.
 * 
 * This file re-exports types from domain-focused modules under `src/world/types/`,
 * providing a stable compatibility layer for existing imports.
 * 
 * # Module Organization
 * 
 * - `grid.ts` - GridPosition, SpriteDirection, SpriteSet
 * - `entity.ts` - GameEntity, EntityCapabilities (base entity types)
 * - `player.ts` - Player
 * - `inventory.ts` - Inventory management and item-use rules
 * - `guard.ts` - Guard entities
 * - `npc.ts` - NPC entities, riddle clues, triggers
 * - `door.ts` - Door entities
 * - `object.ts` - InteractiveObject and ObjectCapabilities
 * - `environment.ts` - Environment entities
 * - `conversation.ts` - Conversation history contracts
 * - `quest.ts` - Deterministic quest-chain state and event contracts
 * - `knowledge.ts` - Deterministic knowledge-token state and validation contracts
 * - `level.ts` - Level DTOs and LevelData format
 * - `world-state.ts` - WorldState, WorldGrid, LevelMetadata
 * - `command.ts` - WorldCommand, Intent, World interface
 * 
 * # Usage
 * 
 * Existing imports from `src/world/types` continue to work:
 * ```typescript
 * import type { WorldState, Player, Guard } from '../world/types';
 * ```
 * 
 * For new code, consider importing from domain-focused modules:
 * ```typescript
 * import type { WorldState } from '../world/types/world-state';
 * import type { Player } from '../world/types/player';
 * ```
 */

// Grid and sprite types
export type { GridPosition, SpriteDirection, SpriteSet } from './types/grid.js';

// Entity base types
export type { GameEntity, EntityCapabilities } from './types/entity.js';

// Player types
export type { Player } from './types/player.js';

// Inventory and item-use types
export type {
  InventoryItem,
  PlayerInventory,
  SelectedInventoryItem,
  ItemUseRule,
  ItemUseAttemptResult,
  ItemUseAttemptResultEvent,
} from './types/inventory.js';

// Guard types
export type { Guard } from './types/guard.js';

// NPC types
export type { RiddleClue, RiddleClueConstraint, TriggerEffect, NpcTriggers, Npc } from './types/npc.js';

// Door types
export type { Door } from './types/door.js';

// Interactive object types
export type { ObjectCapabilities, InteractiveObject } from './types/object.js';

// Environment types
export type { Environment } from './types/environment.js';

// Conversation types
export type { ConversationMessage, ActorConversationHistoryByActorId } from './types/conversation.js';

// Quest progression types
export type {
  QuestItemUseTargetKind,
  QuestAffectedEntityType,
  QuestItemUseResolvedCriteria,
  QuestProgressCriteria,
  QuestStageDefinition,
  QuestChainDefinition,
  QuestChainStatus,
  QuestChainProgress,
  QuestState,
  QuestItemUseResolvedEvent,
  QuestProgressEvent,
} from './types/quest.js';

// Knowledge-token progression types
export type {
  KnowledgeTokenGrantRecord,
  KnowledgeState,
  KnowledgeTokenOutcome,
  KnowledgeTokenValidationResult,
  KnowledgeTokenOutcomeResolution,
} from './types/knowledge.js';

// World state types
export type { WorldState, WorldGrid, LevelMetadata } from './types/world-state.js';

// Level DTO types
export type {
  LevelPlayerDto,
  LevelGuardDto,
  LevelDoorDto,
  LevelNpcRiddleClueDto,
  LevelNpcDto,
  LevelInteractiveObjectDto,
  LevelEnvironmentDto,
  LevelData,
} from './types/level.js';

// Command and intent types
export type { WorldCommand, IntentType, Intent, World } from './types/command.js';
