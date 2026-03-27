import { describe, expect, it } from 'vitest';
import { createInitialWorldState } from '../world/state';
import {
  buildGuardPromptContext,
  buildGuardWorldContextPayload,
  GUARD_PERSONA_CONTRACT,
} from './guardPromptContext';

describe('buildGuardWorldContextPayload', () => {
  it('includes only player, guards, and doors with truth/safe booleans', () => {
    const worldState = createInitialWorldState();
    worldState.player.position = { x: 2, y: 3 };
    worldState.guards = [
      {
        id: 'guard-2',
        displayName: 'South Guard',
        position: { x: 4, y: 8 },
        guardState: 'patrolling',
        honestyTrait: 'liar',
      },
      {
        id: 'guard-1',
        displayName: 'North Guard',
        position: { x: 1, y: 0 },
        guardState: 'idle',
        honestyTrait: 'truth-teller',
      },
    ];
    worldState.doors = [
      {
        id: 'door-2',
        displayName: 'South Door',
        position: { x: 4, y: 7 },
        doorState: 'closed',
        outcome: 'danger',
      },
      {
        id: 'door-1',
        displayName: 'North Door',
        position: { x: 5, y: 6 },
        doorState: 'open',
        outcome: 'safe',
      },
    ];

    const payload = buildGuardWorldContextPayload(worldState);

    expect(payload.player).toEqual({
      id: worldState.player.id,
      position: { x: 2, y: 3 },
    });
    expect(payload.guards).toEqual([
      {
        id: 'guard-1',
        displayName: 'North Guard',
        position: { x: 1, y: 0 },
        truth: true,
      },
      {
        id: 'guard-2',
        displayName: 'South Guard',
        position: { x: 4, y: 8 },
        truth: false,
      },
    ]);
    expect(payload.doors).toEqual([
      {
        id: 'door-1',
        displayName: 'North Door',
        position: { x: 5, y: 6 },
        safe: true,
      },
      {
        id: 'door-2',
        displayName: 'South Door',
        position: { x: 4, y: 7 },
        safe: false,
      },
    ]);
  });

  it('produces deterministic serialized prompt context for identical world snapshot', () => {
    const worldState = createInitialWorldState();
    worldState.guards = [
      {
        id: 'guard-1',
        displayName: 'Guard',
        position: { x: 4, y: 4 },
        guardState: 'alert',
      },
    ];
    const guard = worldState.guards[0];

    const first = buildGuardPromptContext(guard, worldState);
    const second = buildGuardPromptContext(guard, worldState);
    const reconstructed = JSON.parse(JSON.stringify(worldState)) as typeof worldState;
    const third = buildGuardPromptContext(reconstructed.guards[0], reconstructed);

    expect(first).toBe(second);
    expect(first).toBe(third);
  });

  it('returns JSON-serializable payload data and includes guard persona contract', () => {
    const worldState = createInitialWorldState();
    worldState.guards = [
      {
        id: 'guard-1',
        displayName: 'Guard',
        position: { x: 2, y: 2 },
        guardState: 'idle',
      },
    ];

    const promptContext = buildGuardPromptContext(worldState.guards[0], worldState);
    const parsed = JSON.parse(promptContext) as {
      guard: {
        id: string;
        displayName: string;
        position: { x: number; y: number };
        truth: boolean;
      };
      guardPersonaContract: string;
      world: ReturnType<typeof buildGuardWorldContextPayload>;
    };
    const roundTrip = JSON.parse(JSON.stringify(parsed)) as typeof parsed;

    expect(parsed.guardPersonaContract).toBe(GUARD_PERSONA_CONTRACT);
    expect(parsed.guard).toEqual({
      id: 'guard-1',
      displayName: 'Guard',
      position: { x: 2, y: 2 },
      truth: true,
    });
    expect(roundTrip.world).toEqual(parsed.world);
  });
});

describe('guard truth encoding', () => {
  it('embeds truth boolean in guard and world entries', () => {
    const worldState = createInitialWorldState();

    const truthTeller = {
      id: 'g-truth',
      displayName: 'Truth Guard',
      position: { x: 1, y: 1 },
      guardState: 'idle' as const,
      honestyTrait: 'truth-teller' as const,
    };
    const liar = {
      id: 'g-liar',
      displayName: 'Liar Guard',
      position: { x: 2, y: 2 },
      guardState: 'idle' as const,
      honestyTrait: 'liar' as const,
    };
    worldState.guards = [liar, truthTeller];

    const parsedTruth = JSON.parse(buildGuardPromptContext(truthTeller, worldState)) as {
      guard: { truth: boolean };
      world: { guards: Array<{ id: string; truth: boolean }> };
    };
    const parsedLiar = JSON.parse(buildGuardPromptContext(liar, worldState)) as {
      guard: { truth: boolean };
      world: { guards: Array<{ id: string; truth: boolean }> };
    };

    expect(parsedTruth.guard.truth).toBe(true);
    expect(parsedLiar.guard.truth).toBe(false);
    expect(parsedTruth.world.guards).toEqual([
      {
        id: 'g-liar',
        displayName: 'Liar Guard',
        position: { x: 2, y: 2 },
        truth: false,
      },
      {
        id: 'g-truth',
        displayName: 'Truth Guard',
        position: { x: 1, y: 1 },
        truth: true,
      },
    ]);
  });
});