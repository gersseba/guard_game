import type { Guard, Player } from '../world/types';

export interface GuardInteractionRequest {
  guard: Guard;
  player: Player;
}

export interface GuardInteractionResult {
  guardId: string;
  responseText: string;
}

const GUARD_STATE_RESPONSES: Record<Guard['guardState'], string> = {
  idle: 'Guard: Halt! Who goes there?',
  patrolling: 'Guard: Keep moving, nothing to see here.',
  alert: 'Guard: Stop right there!',
};

export const handleGuardInteraction = (
  request: GuardInteractionRequest,
): GuardInteractionResult => ({
  guardId: request.guard.id,
  responseText: GUARD_STATE_RESPONSES[request.guard.guardState],
});
