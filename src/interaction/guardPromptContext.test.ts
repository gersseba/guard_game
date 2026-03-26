import { describe, expect, it } from 'vitest';
import { createInitialWorldState } from '../world/state';
import {
  buildGuardPromptContext,
  buildGuardWorldContextPayload,
  buildGuardPersonaContract,
  GUARD_PERSONA_CONTRACT,
  TRUTH_TELLER_PERSONA_CONTRACT,
  LIAR_PERSONA_CONTRACT,
} from './guardPromptContext';

describe('buildGuardWorldContextPayload', () => {
  it('includes player, guard, npc, and interactive object positions including doors', () => {
    const worldState = createInitialWorldState();
    worldState.player.position = { x: 2, y: 3 };
    worldState.guards = [
      {
        id: 'guard-2',
        displayName: 'South Guard',
        position: { x: 4, y: 5 },
        guardState: 'patrolling',
      },
      {
        id: 'guard-1',
        displayName: 'North Guard',
        position: { x: 1, y: 0 },
        guardState: 'idle',
      },
    ];
    worldState.npcs = [
      {
        id: 'npc-2',
        displayName: 'Engineer',
        position: { x: 8, y: 1 },
        dialogueContextKey: 'engineer_intro',
      },
      {
        id: 'npc-1',
        displayName: 'Archivist',
        position: { x: 3, y: 9 },
        dialogueContextKey: 'archive_keeper_intro',
      },
    ];
    worldState.doors = [
      {
        id: 'door-2',
        displayName: 'South Door',
        position: { x: 7, y: 7 },
        doorState: 'closed',
      },
      {
        id: 'door-1',
        displayName: 'North Door',
        position: { x: 5, y: 6 },
        doorState: 'open',
      },
    ];
    worldState.interactiveObjects = [
      {
        id: 'obj-2',
        displayName: 'Terminal',
        position: { x: 10, y: 2 },
        interactionType: 'inspect',
        state: 'idle',
      },
      {
        id: 'obj-1',
        displayName: 'Lever',
        position: { x: 6, y: 3 },
        interactionType: 'use',
        state: 'used',
      },
    ];

    const payload = buildGuardWorldContextPayload(worldState);

    expect(payload.player).toEqual({
      id: worldState.player.id,
      position: { x: 2, y: 3 },
    });
    expect(payload.guards).toEqual([
      { id: 'guard-1', position: { x: 1, y: 0 } },
      { id: 'guard-2', position: { x: 4, y: 5 } },
    ]);
    expect(payload.npcs).toEqual([
      { id: 'npc-1', position: { x: 3, y: 9 } },
      { id: 'npc-2', position: { x: 8, y: 1 } },
    ]);
    expect(payload.interactiveObjects).toEqual([
      { id: 'door-1', kind: 'door', position: { x: 5, y: 6 } },
      { id: 'door-2', kind: 'door', position: { x: 7, y: 7 } },
      { id: 'obj-1', kind: 'object', position: { x: 6, y: 3 } },
      { id: 'obj-2', kind: 'object', position: { x: 10, y: 2 } },
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
      guardPersonaContract: string;
      worldContext: ReturnType<typeof buildGuardWorldContextPayload>;
    };
    const roundTrip = JSON.parse(JSON.stringify(parsed)) as typeof parsed;

    expect(parsed.guardPersonaContract).toBe(GUARD_PERSONA_CONTRACT);
    expect(roundTrip.worldContext).toEqual(parsed.worldContext);
  });
});

describe('buildGuardPersonaContract', () => {
  it('returns TRUTH_TELLER_PERSONA_CONTRACT when honestyTrait is truth-teller', () => {
    const guard = {
      id: 'g1',
      displayName: 'Honest Guard',
      position: { x: 0, y: 0 },
      guardState: 'idle' as const,
      honestyTrait: 'truth-teller' as const,
    };
    expect(buildGuardPersonaContract(guard)).toBe(TRUTH_TELLER_PERSONA_CONTRACT);
  });

  it('returns LIAR_PERSONA_CONTRACT when honestyTrait is liar', () => {
    const guard = {
      id: 'g2',
      displayName: 'Liar Guard',
      position: { x: 0, y: 0 },
      guardState: 'idle' as const,
      honestyTrait: 'liar' as const,
    };
    expect(buildGuardPersonaContract(guard)).toBe(LIAR_PERSONA_CONTRACT);
  });

  it('falls back to GUARD_PERSONA_CONTRACT when honestyTrait is absent', () => {
    const guard = {
      id: 'g3',
      displayName: 'Generic Guard',
      position: { x: 0, y: 0 },
      guardState: 'idle' as const,
    };
    expect(buildGuardPersonaContract(guard)).toBe(GUARD_PERSONA_CONTRACT);
  });

  it('embeds the correct persona contract in the serialized prompt context', () => {
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
    const generic = {
      id: 'g-generic',
      displayName: 'Generic Guard',
      position: { x: 3, y: 3 },
      guardState: 'idle' as const,
    };

    const parsedTruth = JSON.parse(buildGuardPromptContext(truthTeller, worldState)) as { guardPersonaContract: string };
    const parsedLiar = JSON.parse(buildGuardPromptContext(liar, worldState)) as { guardPersonaContract: string };
    const parsedGeneric = JSON.parse(buildGuardPromptContext(generic, worldState)) as { guardPersonaContract: string };

    expect(parsedTruth.guardPersonaContract).toBe(TRUTH_TELLER_PERSONA_CONTRACT);
    expect(parsedLiar.guardPersonaContract).toBe(LIAR_PERSONA_CONTRACT);
    expect(parsedGeneric.guardPersonaContract).toBe(GUARD_PERSONA_CONTRACT);
  });
});