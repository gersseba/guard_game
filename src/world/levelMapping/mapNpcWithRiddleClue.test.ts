import { describe, expect, it } from 'vitest';
import { mapNpcWithRiddleClue } from './mapNpcWithRiddleClue';

const safeDoor = { id: 'door-safe', displayName: 'Safe Door', x: 0, y: 10, isOpen: false, isLocked: false as const, isSafe: true as const };
const dangerDoor = { id: 'door-danger', displayName: 'Danger Door', x: 19, y: 10, isOpen: false, isLocked: false as const, isSafe: false as const };

const baseNpc = {
  id: 'npc-1',
  displayName: 'Archivist',
  x: 5,
  y: 5,
  npcType: 'archive_keeper',
};

describe('mapNpcWithRiddleClue', () => {
  it('maps a plain NPC without riddleClue', () => {
    const result = mapNpcWithRiddleClue(baseNpc, [safeDoor]);

    expect(result.id).toBe('npc-1');
    expect(result.riddleClue).toBeUndefined();
  });

  it('resolves mustStateDoorAs=safe for truthful NPC and safe door', () => {
    const npc = {
      ...baseNpc,
      riddleClue: { clueId: 'clue-1', doorId: 'door-safe', truthBehavior: 'truthful' as const },
    };

    const result = mapNpcWithRiddleClue(npc, [safeDoor, dangerDoor]);

    expect(result.riddleClue?.mustStateDoorAs).toBe('safe');
  });

  it('resolves mustStateDoorAs=danger for inverse NPC and safe door', () => {
    const npc = {
      ...baseNpc,
      riddleClue: { clueId: 'clue-1', doorId: 'door-safe', truthBehavior: 'inverse' as const },
    };

    const result = mapNpcWithRiddleClue(npc, [safeDoor, dangerDoor]);

    expect(result.riddleClue?.mustStateDoorAs).toBe('danger');
  });

  it('resolves mustStateDoorAs=danger for truthful NPC and danger door', () => {
    const npc = {
      ...baseNpc,
      riddleClue: { clueId: 'clue-1', doorId: 'door-danger', truthBehavior: 'truthful' as const },
    };

    const result = mapNpcWithRiddleClue(npc, [safeDoor, dangerDoor]);

    expect(result.riddleClue?.mustStateDoorAs).toBe('danger');
  });

  it('resolves mustStateDoorAs=safe for inverse NPC and danger door', () => {
    const npc = {
      ...baseNpc,
      riddleClue: { clueId: 'clue-1', doorId: 'door-danger', truthBehavior: 'inverse' as const },
    };

    const result = mapNpcWithRiddleClue(npc, [safeDoor, dangerDoor]);

    expect(result.riddleClue?.mustStateDoorAs).toBe('safe');
  });

  it('preserves riddleClue clueId, doorId, and truthBehavior fields', () => {
    const npc = {
      ...baseNpc,
      riddleClue: { clueId: 'clue-42', doorId: 'door-safe', truthBehavior: 'truthful' as const },
    };

    const result = mapNpcWithRiddleClue(npc, [safeDoor]);

    expect(result.riddleClue?.clueId).toBe('clue-42');
    expect(result.riddleClue?.doorId).toBe('door-safe');
    expect(result.riddleClue?.truthBehavior).toBe('truthful');
  });

  it('throws when riddleClue references a non-existent door', () => {
    const npc = {
      ...baseNpc,
      riddleClue: { clueId: 'clue-1', doorId: 'door-missing', truthBehavior: 'truthful' as const },
    };

    expect(() => mapNpcWithRiddleClue(npc, [safeDoor])).toThrowError(
      'npc npc-1 references non-existent door door-missing',
    );
  });

  it('is deterministic — same input always produces the same NPC', () => {
    const npc = {
      ...baseNpc,
      riddleClue: { clueId: 'clue-1', doorId: 'door-safe', truthBehavior: 'truthful' as const },
    };

    expect(JSON.stringify(mapNpcWithRiddleClue(npc, [safeDoor]))).toBe(
      JSON.stringify(mapNpcWithRiddleClue(npc, [safeDoor])),
    );
  });
});
