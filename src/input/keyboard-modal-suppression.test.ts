import { describe, expect, it, vi } from 'vitest';
import { bindKeyboardCommands, mapKeyboardEventToWorldCommand } from './keyboard';
import { createCommandBuffer } from './commands';

const createKeyboardTarget = (): {
  target: Window;
  dispatchKey: (key: string) => void;
} => {
  const listeners = new Set<(event: KeyboardEvent) => void>();

  const target = {
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === 'function') {
        listeners.add(listener as (event: KeyboardEvent) => void);
      }
    },
    removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === 'function') {
        listeners.delete(listener as (event: KeyboardEvent) => void);
      }
    },
  } as unknown as Window;

  const dispatchKey = (key: string): void => {
    const event = {
      key,
      preventDefault: () => {
        // no-op for tests
      },
    } as unknown as KeyboardEvent;
    listeners.forEach((listener) => listener(event));
  };

  return { target, dispatchKey };
};

describe('keyboard binding', () => {
  it('enqueues movement commands when modal is not open', () => {
    const commandBuffer = createCommandBuffer();
    const isModalOpen = vi.fn(() => false);
    const { target, dispatchKey } = createKeyboardTarget();

    bindKeyboardCommands(target, commandBuffer, { isModalOpen });
    dispatchKey('ArrowUp');

    const commands = commandBuffer.drain();
    expect(commands).toContainEqual({ type: 'move', dx: 0, dy: -1 });
  });

  it('suppresses movement commands when modal is open', () => {
    const commandBuffer = createCommandBuffer();
    const isModalOpen = vi.fn(() => true);
    const { target, dispatchKey } = createKeyboardTarget();

    bindKeyboardCommands(target, commandBuffer, { isModalOpen });
    dispatchKey('ArrowUp');

    const commands = commandBuffer.drain();
    expect(commands).toEqual([]);
  });

  it('suppresses interact commands when modal is open', () => {
    const commandBuffer = createCommandBuffer();
    const isModalOpen = vi.fn(() => true);
    const { target, dispatchKey } = createKeyboardTarget();

    bindKeyboardCommands(target, commandBuffer, { isModalOpen });
    dispatchKey('e');

    const commands = commandBuffer.drain();
    expect(commands).toEqual([]);
  });
});
