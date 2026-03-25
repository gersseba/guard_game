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
};

export const mapKeyboardEventToWorldCommand = (key: string): WorldCommand | null => {
  return keyToCommandMap[key] ?? null;
};

export interface KeyboardCommandInputBinding {
  dispose(): void;
}

export const bindKeyboardCommands = (
  target: Window,
  commandBuffer: CommandBuffer,
): KeyboardCommandInputBinding => {
  const onKeyDown = (event: KeyboardEvent): void => {
    const command = mapKeyboardEventToWorldCommand(event.key);
    if (!command) {
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