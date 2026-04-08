import type { Player } from './player.js';
import type { Npc } from './npc.js';
import type { Guard } from './guard.js';
import type { Door } from './door.js';
import type { InteractiveObject } from './object.js';
import type { Environment } from './environment.js';
import type { ActorConversationHistoryByActorId } from './conversation.js';
import type { ItemUseAttemptResultEvent } from './inventory.js';

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
  environments?: Environment[];
  actorConversationHistoryByActorId: ActorConversationHistoryByActorId;
  lastItemUseAttemptEvent?: ItemUseAttemptResultEvent | null;
  levelOutcome: 'win' | 'lose' | null;
}
