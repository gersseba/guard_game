import { describe, expect, it, vi } from 'vitest';
import { createFixedTickLoop } from './fixedTickLoop';

describe('createFixedTickLoop', () => {
  it('runs fixed simulation ticks before each frame render', () => {
    const stepSimulation = vi.fn();
    const renderFrame = vi.fn();
    const frameCallbacks: Array<(time: number) => void> = [];

    const loop = createFixedTickLoop({
      fixedTickDurationMs: 100,
      stepSimulation,
      renderFrame,
      now: () => 0,
      requestFrame(callback) {
        frameCallbacks.push(callback);
        return 1;
      },
    });

    loop.start();
    expect(frameCallbacks).toHaveLength(1);
    const firstFrame = frameCallbacks[0];

    firstFrame(350);
    expect(stepSimulation).toHaveBeenCalledTimes(3);
    expect(renderFrame).toHaveBeenCalledTimes(1);
    expect(frameCallbacks).toHaveLength(2);

    const secondFrame = frameCallbacks[1];
    secondFrame(430);
    expect(stepSimulation).toHaveBeenCalledTimes(4);
    expect(renderFrame).toHaveBeenCalledTimes(2);
  });

  it('renders a frame even when accumulated time is below tick duration', () => {
    const stepSimulation = vi.fn();
    const renderFrame = vi.fn();
    const frameCallbacks: Array<(time: number) => void> = [];

    const loop = createFixedTickLoop({
      fixedTickDurationMs: 100,
      stepSimulation,
      renderFrame,
      now: () => 0,
      requestFrame(callback) {
        frameCallbacks.push(callback);
        return 1;
      },
    });

    loop.start();
    expect(frameCallbacks).toHaveLength(1);
    const firstFrame = frameCallbacks[0];
    firstFrame(40);

    expect(stepSimulation).not.toHaveBeenCalled();
    expect(renderFrame).toHaveBeenCalledTimes(1);
  });
});
