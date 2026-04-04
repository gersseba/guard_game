import type { RuntimeActionModalSession } from '../runtimeController';
import type { AdjacentTarget } from './adjacencyResolver';

export type ActionModalEligibleTarget = Extract<AdjacentTarget, { kind: 'guard' | 'npc' }>;

export const isActionModalEligibleTarget = (
  target: AdjacentTarget,
): target is ActionModalEligibleTarget => {
  return target.kind === 'guard' || target.kind === 'npc';
};

export const createActionModalSession = (
  target: ActionModalEligibleTarget,
): RuntimeActionModalSession => {
  return {
    targetId: target.target.id,
    targetKind: target.kind,
    displayName: target.target.displayName,
  };
};