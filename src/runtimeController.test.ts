import { describe, expect, it, vi } from 'vitest';
import { createCommandBuffer } from './input/commands';
import { createRuntimeController } from './runtimeController';
import type { World, WorldCommand, WorldState } from './world/types';

const createTestWorldState = (
  overrides?: Omit<Partial<WorldState>, 'player'> & { player?: Partial<WorldState['player']> },
): WorldState => {
  const baseState: WorldState = {
    tick: 0,
    grid: { width: 10, height: 10, tileSize: 32 },
    levelObjective: 'Reach the safe exit.',
    player: {
      id: 'player',
      displayName: 'Player',
      position: { x: 1, y: 1 },
      inventory: {
        items: [],
      },
    },
    guards: [],
    doors: [],
    npcs: [],
    interactiveObjects: [],
    actorConversationHistoryByActorId: {},
    levelOutcome: null,
  };

  return {
    ...baseState,
    ...(overrides ?? {}),
    player: {
      ...baseState.player,
      ...(overrides?.player ?? {}),
    },
  };
};

const createTestWorld = (
  initialState: WorldState = createTestWorldState(),
): {
  world: Pick<World, 'getState' | 'applyCommands'>;
  applyCommandsSpy: ReturnType<typeof vi.fn<(commands: WorldCommand[]) => void>>;
} => {
  let worldState = initialState;
  const applyCommandsSpy = vi.fn<(commands: WorldCommand[]) => void>((commands) => {
    const moveCommand = commands.find((command) => command.type === 'move');
    const nextPosition = moveCommand && moveCommand.type === 'move'
      ? {
          x: worldState.player.position.x + moveCommand.dx,
          y: worldState.player.position.y + moveCommand.dy,
        }
      : worldState.player.position;

    worldState = {
      ...worldState,
      tick: worldState.tick + 1,
      player: {
        ...worldState.player,
        position: nextPosition,
      },
    };
  });

  return {
    world: {
      getState: () => worldState,
      applyCommands: applyCommandsSpy,
    },
    applyCommandsSpy,
  };
};

describe('createRuntimeController', () => {
  it('enters paused conversation state and clears buffered commands on conversation start', () => {
    const commandBuffer = createCommandBuffer();
    commandBuffer.enqueue({ type: 'move', dx: 1, dy: 0 });
    const { world } = createTestWorld();
    const runInteractions = vi.fn();
    const controller = createRuntimeController({ world, commandBuffer, runInteractions });

    controller.openConversation('guard-1');

    expect(controller.isPaused()).toBe(true);
    expect(controller.getCurrentInteraction()).toEqual({ actorId: 'guard-1' });
    expect(commandBuffer.drain()).toEqual([]);
  });

  it('drops gameplay commands and skips world updates while paused', () => {
    const commandBuffer = createCommandBuffer();
    const { world, applyCommandsSpy } = createTestWorld();
    const runInteractions = vi.fn();
    const controller = createRuntimeController({ world, commandBuffer, runInteractions });

    controller.openConversation('npc-1');
    commandBuffer.enqueue({ type: 'move', dx: 1, dy: 0 });
    commandBuffer.enqueue({ type: 'interact' });

    controller.stepSimulation();

    expect(applyCommandsSpy).not.toHaveBeenCalled();
    expect(runInteractions).not.toHaveBeenCalled();
    expect(commandBuffer.drain()).toEqual([]);
  });

  it('resumes simulation after conversation close without leaking paused commands into the first resumed tick', () => {
    const commandBuffer = createCommandBuffer();
    const { world, applyCommandsSpy } = createTestWorld();
    const runInteractions = vi.fn();
    const controller = createRuntimeController({ world, commandBuffer, runInteractions });

    controller.openConversation('guard-1');
    commandBuffer.enqueue({ type: 'move', dx: 1, dy: 0 });
    controller.stepSimulation();

    controller.closeConversation();
    controller.stepSimulation();

    expect(controller.isPaused()).toBe(false);
    expect(controller.getCurrentInteraction()).toBeNull();
    expect(applyCommandsSpy).toHaveBeenCalledTimes(1);
    expect(applyCommandsSpy).toHaveBeenNthCalledWith(1, []);
    expect(runInteractions).toHaveBeenNthCalledWith(1, world.getState(), []);
    expect(world.getState().player.position).toEqual({ x: 1, y: 1 });

    commandBuffer.enqueue({ type: 'move', dx: 1, dy: 0 });
    controller.stepSimulation();

    expect(applyCommandsSpy).toHaveBeenNthCalledWith(2, [{ type: 'move', dx: 1, dy: 0 }]);
    expect(world.getState().player.position).toEqual({ x: 2, y: 1 });
  });

  it('still blocks gameplay commands after level outcome without affecting pause state handling', () => {
    const commandBuffer = createCommandBuffer();
    commandBuffer.enqueue({ type: 'move', dx: 1, dy: 0 });
    const { world, applyCommandsSpy } = createTestWorld(
      createTestWorldState({ levelOutcome: 'win' }),
    );
    const runInteractions = vi.fn();
    const controller = createRuntimeController({ world, commandBuffer, runInteractions });

    controller.stepSimulation();

    expect(applyCommandsSpy).toHaveBeenCalledWith([]);
    expect(runInteractions).toHaveBeenCalledWith(world.getState(), []);
  });
});
