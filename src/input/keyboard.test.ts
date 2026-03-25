import { describe, expect, it, vi } from 'vitest';
import { createCommandBuffer } from './commands';
import { bindKeyboardCommands, mapKeyboardEventToWorldCommand } from './keyboard';

describe('mapKeyboardEventToWorldCommand', () => {
  it('maps arrow keys and WASD to movement commands', () => {
    expect(mapKeyboardEventToWorldCommand('ArrowUp')).toEqual({ type: 'move', dx: 0, dy: -1 });
    expect(mapKeyboardEventToWorldCommand('ArrowDown')).toEqual({ type: 'move', dx: 0, dy: 1 });
    expect(mapKeyboardEventToWorldCommand('ArrowLeft')).toEqual({ type: 'move', dx: -1, dy: 0 });
    expect(mapKeyboardEventToWorldCommand('ArrowRight')).toEqual({ type: 'move', dx: 1, dy: 0 });
    expect(mapKeyboardEventToWorldCommand('w')).toEqual({ type: 'move', dx: 0, dy: -1 });
    expect(mapKeyboardEventToWorldCommand('a')).toEqual({ type: 'move', dx: -1, dy: 0 });
    expect(mapKeyboardEventToWorldCommand('s')).toEqual({ type: 'move', dx: 0, dy: 1 });
    expect(mapKeyboardEventToWorldCommand('d')).toEqual({ type: 'move', dx: 1, dy: 0 });
  });

  it('preserves interact mapping and ignores unrelated keys', () => {
    expect(mapKeyboardEventToWorldCommand('e')).toEqual({ type: 'interact' });
    expect(mapKeyboardEventToWorldCommand('q')).toBeNull();
  });
});

describe('bindKeyboardCommands', () => {
  it('enqueues commands for recognized keys and prevents browser defaults', () => {
    const commandBuffer = createCommandBuffer();
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    const target = {
      addEventListener,
      removeEventListener,
    } as unknown as Window;

    const binding = bindKeyboardCommands(target, commandBuffer);
    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(addEventListener.mock.calls[0][0]).toBe('keydown');

    const handler = addEventListener.mock.calls[0][1] as (event: KeyboardEvent) => void;
    const handledEvent = {
      key: 'ArrowRight',
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;

    handler(handledEvent);

    expect(handledEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(commandBuffer.drain()).toEqual([{ type: 'move', dx: 1, dy: 0 }]);

    const ignoredEvent = {
      key: 'q',
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;

    handler(ignoredEvent);

    expect(ignoredEvent.preventDefault).not.toHaveBeenCalled();
    expect(commandBuffer.drain()).toEqual([]);

    binding.dispose();
    expect(removeEventListener).toHaveBeenCalledTimes(1);
    expect(removeEventListener).toHaveBeenCalledWith('keydown', handler);
  });
});