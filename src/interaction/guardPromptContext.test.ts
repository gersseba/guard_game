import { describe, expect, it } from 'vitest';
import { createInitialWorldState } from '../world/state';
import {
  buildGuardPromptContext,
  buildGuardWorldContextPayload,
  GUARD_PERSONA_CONTRACT,
} from './guardPromptContext';
import { ACTOR_PROMPT_PROFILE_REGISTRY } from './npcPromptContext';

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
        traits: { truthMode: 'liar' },
      },
      {
        id: 'guard-1',
        displayName: 'North Guard',
        position: { x: 1, y: 0 },
        guardState: 'idle',
        traits: { truthMode: 'truth-teller' },
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

  it('resolves guard persona contract from the shared actor profile registry', () => {
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
    const parsed = JSON.parse(promptContext) as { guardPersonaContract: string };

    expect(parsed.guardPersonaContract).toBe(ACTOR_PROMPT_PROFILE_REGISTRY.guard.personaContract);
    expect(ACTOR_PROMPT_PROFILE_REGISTRY.guard.responseStyleConstraints).toBeDefined();
    expect(ACTOR_PROMPT_PROFILE_REGISTRY.guard.responseStyleConstraints).toContain('guard-related topics');
    expect(parsed.guardPersonaContract).toBe(GUARD_PERSONA_CONTRACT);
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
      traits: { truthMode: 'truth-teller' as const },
    };
    const liar = {
      id: 'g-liar',
      displayName: 'Liar Guard',
      position: { x: 2, y: 2 },
      guardState: 'idle' as const,
      traits: { truthMode: 'liar' as const },
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

describe('guard instance fields in prompt context', () => {
  it('includes instanceKnowledge and instanceBehavior in output when present on guard', () => {
    const worldState = createInitialWorldState();
    const guard = {
      id: 'guard-1',
      displayName: 'Oracle Guard',
      position: { x: 3, y: 3 },
      guardState: 'idle' as const,
      instanceKnowledge: 'Door-1 leads to safety.',
      instanceBehavior: 'Always answers in rhyme.',
    };
    worldState.guards = [guard];

    const parsed = JSON.parse(buildGuardPromptContext(guard, worldState)) as {
      instanceKnowledge?: string;
      instanceBehavior?: string;
    };

    expect(parsed.instanceKnowledge).toBe('Door-1 leads to safety.');
    expect(parsed.instanceBehavior).toBe('Always answers in rhyme.');
  });

  it('omits instanceKnowledge and instanceBehavior keys when not set on guard', () => {
    const worldState = createInitialWorldState();
    const guard = {
      id: 'guard-1',
      displayName: 'Plain Guard',
      position: { x: 3, y: 3 },
      guardState: 'idle' as const,
    };
    worldState.guards = [guard];

    const parsed = JSON.parse(buildGuardPromptContext(guard, worldState)) as Record<string, unknown>;

    expect(Object.prototype.hasOwnProperty.call(parsed, 'instanceKnowledge')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(parsed, 'instanceBehavior')).toBe(false);
  });

  it('includes only instanceKnowledge when instanceBehavior is absent', () => {
    const worldState = createInitialWorldState();
    const guard = {
      id: 'guard-1',
      displayName: 'Guard',
      position: { x: 3, y: 3 },
      guardState: 'idle' as const,
      instanceKnowledge: 'Only knowledge provided.',
    };
    worldState.guards = [guard];

    const parsed = JSON.parse(buildGuardPromptContext(guard, worldState)) as Record<string, unknown>;

    expect(parsed['instanceKnowledge']).toBe('Only knowledge provided.');
    expect(Object.prototype.hasOwnProperty.call(parsed, 'instanceBehavior')).toBe(false);
  });
});