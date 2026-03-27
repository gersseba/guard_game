import { describe, expect, it } from 'vitest';
import { createCommandBuffer } from './commands';

describe('createCommandBuffer', () => {
  it('drains commands in enqueue order', () => {
    const buffer = createCommandBuffer();

    buffer.enqueue({ type: 'move', dx: 1, dy: 0 });
    buffer.enqueue({ type: 'interact' });
    buffer.enqueue({ type: 'move', dx: 0, dy: -1 });

    expect(buffer.drain()).toEqual([
      { type: 'move', dx: 1, dy: 0 },
      { type: 'interact' },
      { type: 'move', dx: 0, dy: -1 },
    ]);
  });

  it('resets drained commands so subsequent drains are empty until enqueued again', () => {
    const buffer = createCommandBuffer();

    buffer.enqueue({ type: 'interact' });

    const firstDrain = buffer.drain();
    const secondDrain = buffer.drain();

    expect(firstDrain).toEqual([{ type: 'interact' }]);
    expect(secondDrain).toEqual([]);

    firstDrain.push({ type: 'move', dx: 5, dy: 5 });
    expect(buffer.drain()).toEqual([]);
  });

  it('clears pending commands without affecting future enqueue operations', () => {
    const buffer = createCommandBuffer();

    buffer.enqueue({ type: 'move', dx: -1, dy: 0 });
    buffer.enqueue({ type: 'interact' });
    buffer.clear();

    expect(buffer.drain()).toEqual([]);

    buffer.enqueue({ type: 'move', dx: 0, dy: 1 });
    expect(buffer.drain()).toEqual([{ type: 'move', dx: 0, dy: 1 }]);
  });
});
