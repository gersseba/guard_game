import type { GridPosition } from './types';

export interface ParsedLayout {
  width: number;
  height: number;
  blockingTiles: GridPosition[];
}

const WALKABLE_SYMBOL = '.';
const BLOCKING_SYMBOL = '#';

const normalizeLayoutRows = (layoutText: string): string[] => {
  const normalized = layoutText.replace(/\r/g, '');
  const rows = normalized.split('\n');

  if (rows.length > 0 && rows[rows.length - 1] === '') {
    rows.pop();
  }

  return rows;
};

export const parseLayoutText = (layoutText: string): ParsedLayout => {
  const rows = normalizeLayoutRows(layoutText);

  if (rows.length === 0) {
    throw new Error('Invalid layout: layout must contain at least one row');
  }

  const width = rows[0].length;
  if (width === 0) {
    throw new Error('Invalid layout: rows must not be empty');
  }

  const blockingTiles: GridPosition[] = [];

  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];

    if (row.length !== width) {
      throw new Error(
        `Invalid layout: row ${y + 1} has width ${row.length}, expected ${width}`,
      );
    }

    for (let x = 0; x < row.length; x++) {
      const symbol = row[x];
      if (symbol !== WALKABLE_SYMBOL && symbol !== BLOCKING_SYMBOL) {
        throw new Error(
          `Invalid layout: unknown symbol "${symbol}" at row ${y + 1}, column ${x + 1}`,
        );
      }

      if (symbol === BLOCKING_SYMBOL) {
        blockingTiles.push({ x, y });
      }
    }
  }

  return {
    width,
    height: rows.length,
    blockingTiles,
  };
};

export const isBlockingLayoutCell = (layout: ParsedLayout, position: GridPosition): boolean =>
  layout.blockingTiles.some((tile) => tile.x === position.x && tile.y === position.y);
