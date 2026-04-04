import { describe, expect, it } from 'vitest';
import { mapKeyboardEventToWorldCommand } from './keyboard';

describe('keyboard input mapping', () => {
  describe('movement commands', () => {
    it('maps arrow keys to move commands', () => {
      expect(mapKeyboardEventToWorldCommand('ArrowUp')).toEqual({ type: 'move', dx: 0, dy: -1 });
      expect(mapKeyboardEventToWorldCommand('ArrowDown')).toEqual({ type: 'move', dx: 0, dy: 1 });
      expect(mapKeyboardEventToWorldCommand('ArrowLeft')).toEqual({ type: 'move', dx: -1, dy: 0 });
      expect(mapKeyboardEventToWorldCommand('ArrowRight')).toEqual({ type: 'move', dx: 1, dy: 0 });
    });

    it('maps WASD keys to move commands (uppercase and lowercase normalize)', () => {
      // Lowercase
      expect(mapKeyboardEventToWorldCommand('w')).toEqual({ type: 'move', dx: 0, dy: -1 });
      expect(mapKeyboardEventToWorldCommand('a')).toEqual({ type: 'move', dx: -1, dy: 0 });
      expect(mapKeyboardEventToWorldCommand('s')).toEqual({ type: 'move', dx: 0, dy: 1 });
      expect(mapKeyboardEventToWorldCommand('d')).toEqual({ type: 'move', dx: 1, dy: 0 });

      // Uppercase (should normalize to lowercase)
      expect(mapKeyboardEventToWorldCommand('W')).toEqual({ type: 'move', dx: 0, dy: -1 });
      expect(mapKeyboardEventToWorldCommand('A')).toEqual({ type: 'move', dx: -1, dy: 0 });
      expect(mapKeyboardEventToWorldCommand('S')).toEqual({ type: 'move', dx: 0, dy: 1 });
      expect(mapKeyboardEventToWorldCommand('D')).toEqual({ type: 'move', dx: 1, dy: 0 });
    });

    it('normalizes key case for single-character keys', () => {
      // Uppercase E should normalize to lowercase 'e'
      const result = mapKeyboardEventToWorldCommand('E');
      expect(result).toEqual({ type: 'interact' });
    });
  });

  describe('action commands', () => {
    it('maps E to interact', () => {
      expect(mapKeyboardEventToWorldCommand('e')).toEqual({ type: 'interact' });
    });

    it('maps F to useSelectedItem', () => {
      expect(mapKeyboardEventToWorldCommand('f')).toEqual({ type: 'useSelectedItem' });
    });
  });

  describe('inventory slot selection', () => {
    it('maps number keys 1-9 to inventory slots 0-8', () => {
      for (let i = 1; i <= 9; i++) {
        expect(mapKeyboardEventToWorldCommand(String(i))).toEqual({
          type: 'selectInventorySlot',
          slotIndex: i - 1,
        });
      }
    });

    it('does not map 0', () => {
      expect(mapKeyboardEventToWorldCommand('0')).toBeNull();
    });
  });

  describe('unmapped keys', () => {
    it('returns null for unmapped keys', () => {
      expect(mapKeyboardEventToWorldCommand('x')).toBeNull();
      expect(mapKeyboardEventToWorldCommand('Enter')).toBeNull();
      expect(mapKeyboardEventToWorldCommand(' ')).toBeNull();
    });
  });
});
