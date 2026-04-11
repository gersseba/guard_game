import { describe, expect, it } from 'vitest';
import { isBlockingLayoutCell, parseLayoutText } from './layout';

describe('parseLayoutText', () => {
  it('parses a rectangular layout and returns dimensions with blocking coordinates', () => {
    const parsed = parseLayoutText('..#\n#..\n...');

    expect(parsed.width).toBe(3);
    expect(parsed.height).toBe(3);
    expect(parsed.blockingTiles).toEqual([
      { x: 2, y: 0 },
      { x: 0, y: 1 },
    ]);
  });

  it('accepts a trailing newline in layout files', () => {
    const parsed = parseLayoutText('..\n##\n');

    expect(parsed.width).toBe(2);
    expect(parsed.height).toBe(2);
    expect(parsed.blockingTiles).toEqual([
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]);
  });

  it('throws when layout is empty', () => {
    expect(() => parseLayoutText('')).toThrowError(
      'Invalid layout: layout must contain at least one row',
    );
  });

  it('throws when rows are ragged', () => {
    expect(() => parseLayoutText('...\n..')).toThrowError(
      'Invalid layout: row 2 has width 2, expected 3',
    );
  });

  it('throws when an unknown symbol is used', () => {
    expect(() => parseLayoutText('..x')).toThrowError(
      'Invalid layout: unknown symbol "x" at row 1, column 3',
    );
  });
});

describe('isBlockingLayoutCell', () => {
  it('returns true only for blocking coordinates from parsed layout', () => {
    const parsed = parseLayoutText('..#\n...');

    expect(isBlockingLayoutCell(parsed, { x: 2, y: 0 })).toBe(true);
    expect(isBlockingLayoutCell(parsed, { x: 0, y: 0 })).toBe(false);
  });
});
