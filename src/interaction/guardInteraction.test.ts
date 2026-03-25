import { describe, expect, it } from 'vitest';
import { handleGuardInteraction } from './guardInteraction';
import type { Guard, Player } from '../world/types';

const player: Player = { id: 'player-1', displayName: 'Hero', position: { x: 1, y: 1 } };

const makeGuard = (guardState: Guard['guardState']): Guard => ({
  id: 'guard-1',
  displayName: 'Guard',
  position: { x: 2, y: 1 },
  guardState,
});

describe('handleGuardInteraction', () => {
  it('returns halt response when guard is idle', () => {
    const result = handleGuardInteraction({ guard: makeGuard('idle'), player });
    expect(result.guardId).toBe('guard-1');
    expect(result.responseText).toBe('Guard: Halt! Who goes there?');
  });

  it('returns patrol response when guard is patrolling', () => {
    const result = handleGuardInteraction({ guard: makeGuard('patrolling'), player });
    expect(result.guardId).toBe('guard-1');
    expect(result.responseText).toBe('Guard: Keep moving, nothing to see here.');
  });

  it('returns alert response when guard is alert', () => {
    const result = handleGuardInteraction({ guard: makeGuard('alert'), player });
    expect(result.guardId).toBe('guard-1');
    expect(result.responseText).toBe('Guard: Stop right there!');
  });

  it('returns deterministic output for same input', () => {
    const guard = makeGuard('idle');
    const first = handleGuardInteraction({ guard, player });
    const second = handleGuardInteraction({ guard, player });
    expect(first).toEqual(second);
  });
});
