import { describe, expect, it, vi } from 'vitest';
import { bindKeyboardCommands, mapKeyboardEventToWorldCommand } from './keyboard';
import { createCommandBuffer } from './commands';

describe('keyboard binding', () => {
  it('enqueues movement commands when modal is not open', () => {
    const commandBuffer = createCommandBuffer();
    const isModalOpen = vi.fn(() => false);

    bindKeyboardCommands(window, commandBuffer, { isModalOpen });

    const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    window.dispatchEvent(event);

    const commands = commandBuffer.dequeueAll();
    expect(commands).toContainEqual({ type: 'move', dx: 0, dy: -1 });
  });

  it('suppresses movement commands when modal is open', () => {
    const commandBuffer = createCommandBuffer();
    const isModalOpen = vi.fn(() => true);

    bindKeyboardCommands(window, commandBuffer, { isModalOpen });

    const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    window.dispatchEvent(event);

    const commands = commandBuffer.dequeueAll();
    expect(commands).toEqual([]);
  });

  it('suppresses interact commands when modal is open', () => {
    const commandBuffer = createCommandBuffer();
    const isModalOpen = vi.fn(() => true);

    bindKeyboardCommands(window, commandBuffer, { isModalOpen });

    const event = new KeyboardEvent('keydown', { key: 'e' });
    window.dispatchEvent(event);

    const commands = commandBuffer.dequeueAll();
    expect(commands).toEqual([]);
  });
});
