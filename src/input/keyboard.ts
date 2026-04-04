import type { CommandBuffer } from './commands';
import type { WorldCommand } from '../world/types';

const keyToCommandMap: Record<string, WorldCommand> = {
  ArrowUp: { type: 'move', dx: 0, dy: -1 },
  ArrowDown: { type: 'move', dx: 0, dy: 1 },
  ArrowLeft: { type: 'move', dx: -1, dy: 0 },
  ArrowRight: { type: 'move', dx: 1, dy: 0 },
  w: { type: 'move', dx: 0, dy: -1 },
  a: { type: 'move', dx: -1, dy: 0 },
  s: { type: 'move', dx: 0, dy: 1 },
  d: { type: 'move', dx: 1, dy: 0 },
  e: { type: 'interact' },
  f: { type: 'useSelectedItem' },
};

export const mapKeyboardEventToWorldCommand = (key: string): WorldCommand | null => {
  if (/^[1-9]$/.test(key)) {
    return {
      type: 'selectInventorySlot',
      slotIndex: Number(key) - 1,
    };
  }

  const normalizedKey = key.length === 1 ? key.toLowerCase() : key;

  return keyToCommandMap[normalizedKey] ?? null;
};

export interface KeyboardCommandInputBinding {
  dispose(): void;
}

export interface KeyboardBindingOptions {
  /** Optional callback to check if modal/input is open; suppresses movement if true. */
  isModalOpen?: () => boolean;
}

export const bindKeyboardCommands = (
  target: Window,
  commandBuffer: CommandBuffer,
  options?: KeyboardBindingOptions,
): KeyboardCommandInputBinding => {
  const onKeyDown = (event: KeyboardEvent): void => {
    const command = mapKeyboardEventToWorldCommand(event.key);
    if (!command) {
      return;
    }

    // Suppress movement and interact commands while modal is open.
    if (options?.isModalOpen?.()) {
      return;
    }

    event.preventDefault();
    commandBuffer.enqueue(command);
  };

  target.addEventListener('keydown', onKeyDown);

  return {
    dispose: () => {
      target.removeEventListener('keydown', onKeyDown);
    },
  };
};