import type { GridPosition } from './grid.js';

export interface Environment {
  id: string;
  displayName: string;
  position: GridPosition;
  isBlocking: boolean;
}
