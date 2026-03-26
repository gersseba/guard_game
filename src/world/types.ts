export interface GridPosition {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  displayName: string;
  position: GridPosition;
}

export interface Npc {
  id: string;
  displayName: string;
  position: GridPosition;
  dialogueContextKey: string;
}

export interface ConversationMessage {
  role: 'player' | 'assistant';
  text: string;
}

export type NpcConversationHistoryByNpcId = Record<string, ConversationMessage[]>;

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
}

/** A door that the player can pass through or be blocked by. */
export interface Door extends Interactable {
  doorState: 'open' | 'closed' | 'locked';
  outcome?: 'safe' | 'danger';
}

export interface InteractiveObject extends Interactable {
  interactionType: 'inspect' | 'use' | 'talk';
  state: 'idle' | 'used';
}

export interface WorldGrid {
  width: number;
  height: number;
  tileSize: number;
}

/** Flat JSON representation of a level file (public/levels/*.json). Version-stamped for future migrations. */
export interface LevelData {
  version: 1;
  name: string;
  width: number;
  height: number;
  player: { x: number; y: number };
  guards: Array<{
    id: string;
    displayName: string;
    x: number;
    y: number;
    guardState: 'patrolling' | 'alert' | 'idle';
    honestyTrait?: 'truth-teller' | 'liar';
  }>;
  doors: Array<{
    id: string;
    displayName: string;
    x: number;
    y: number;
    doorState: 'open' | 'closed' | 'locked';
    outcome: 'safe' | 'danger';
  }>;
}

export interface WorldState {
  tick: number;
  grid: WorldGrid;
  player: Player;
  npcs: Npc[];
  guards: Guard[];
  doors: Door[];
  interactiveObjects: InteractiveObject[];
  npcConversationHistoryByNpcId: NpcConversationHistoryByNpcId;
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
  /** Replace the current world state wholesale (e.g. level load or reset). */
  resetToState(state: WorldState): void;
}
