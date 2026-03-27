import { describe, expect, it } from 'vitest';
import { resolveGuardFacingFromApproach } from './guardFacing';

describe('resolveGuardFacingFromApproach', () => {
  const guard = { x: 5, y: 5 };

  it('maps player west of guard to left', () => {
    expect(resolveGuardFacingFromApproach({ x: 4, y: 5 }, guard)).toBe('left');
  });

  it('maps player east of guard to right', () => {
    expect(resolveGuardFacingFromApproach({ x: 6, y: 5 }, guard)).toBe('right');
  });

  it('maps player north of guard to away', () => {
    expect(resolveGuardFacingFromApproach({ x: 5, y: 4 }, guard)).toBe('away');
  });

  it('maps player south of guard to front', () => {
    expect(resolveGuardFacingFromApproach({ x: 5, y: 6 }, guard)).toBe('front');
  });

  it('returns undefined for non-adjacent or diagonal positions', () => {
    expect(resolveGuardFacingFromApproach({ x: 7, y: 5 }, guard)).toBeUndefined();
    expect(resolveGuardFacingFromApproach({ x: 4, y: 4 }, guard)).toBeUndefined();
  });
});