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

/** Shared base for all interactable world objects. JSON-serializable. */
export interface Interactable {
  id: string;
  displayName: string;
  position: GridPosition;
}

/** A guard entity that the player can interact with. */
export interface Guard extends Interactable {
  guardState: 'idle' | 'patrolling' | 'alert';
}

/** A door that the player can pass through or be blocked by. */
export interface Door extends Interactable {
  doorState: 'open' | 'closed' | 'locked';
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

export interface WorldState {
  tick: number;
  grid: WorldGrid;
  player: Player;
  npcs: Npc[];
  guards: Guard[];
  doors: Door[];
  interactiveObjects: InteractiveObject[];
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
}
