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

export interface InteractiveObject {
  id: string;
  displayName: string;
  position: GridPosition;
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
