export interface FixedTickLoopDependencies {
  fixedTickDurationMs: number;
  stepSimulation: () => void;
  renderFrame: () => void;
  now?: () => number;
  requestFrame?: (callback: (time: number) => void) => number;
}

export interface FixedTickLoop {
  start(): void;
}

export const createFixedTickLoop = (
  dependencies: FixedTickLoopDependencies,
): FixedTickLoop => {
  const now = dependencies.now ?? (() => performance.now());
  const requestFrame = dependencies.requestFrame ?? requestAnimationFrame;

  let previousFrameTime = now();
  let accumulatedTime = 0;

  const runFrame = (currentTime: number): void => {
    accumulatedTime += currentTime - previousFrameTime;
    previousFrameTime = currentTime;

    while (accumulatedTime >= dependencies.fixedTickDurationMs) {
      dependencies.stepSimulation();
      accumulatedTime -= dependencies.fixedTickDurationMs;
    }

    dependencies.renderFrame();
    requestFrame(runFrame);
  };

  return {
    start(): void {
      previousFrameTime = now();
      accumulatedTime = 0;
      requestFrame(runFrame);
    },
  };
};
