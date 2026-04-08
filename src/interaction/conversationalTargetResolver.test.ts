import { describe, expect, it, vi } from 'vitest';
import { createConversationalTargetResolver } from './conversationalTargetResolver';
import type { ConversationalTargetResolver } from './interactionDispatcherTypes';
import { createTestGuard, createTestNpc, createTestWorldState } from '../test-support/worldState';

describe('createConversationalTargetResolver', () => {
  it('resolves default guard and npc targets by actor id', () => {
    const guard = createTestGuard('guard-1');
    const npc = createTestNpc('npc-1', { position: { x: 2, y: 0 } });
    const resolveTarget = createConversationalTargetResolver();
    const worldState = createTestWorldState({ guards: [guard], npcs: [npc] });

    expect(resolveTarget(worldState, 'guard-1')).toMatchObject({ kind: 'guard', target: guard });
    expect(resolveTarget(worldState, 'npc-1')).toMatchObject({ kind: 'npc', target: npc });
    expect(resolveTarget(worldState, 'missing')).toBeNull();
  });

  it('stops at the first matching resolver to preserve ordering semantics', () => {
    const guard = createTestGuard('guard-1');
    const worldState = createTestWorldState({ guards: [guard] });
    const secondResolver = vi.fn<ConversationalTargetResolver>().mockReturnValue(null);
    const resolveTarget = createConversationalTargetResolver([
      () => ({ kind: 'guard', target: guard }),
      secondResolver,
    ]);

    expect(resolveTarget(worldState, 'guard-1')).toMatchObject({ kind: 'guard', target: guard });
    expect(secondResolver).not.toHaveBeenCalled();
  });
});