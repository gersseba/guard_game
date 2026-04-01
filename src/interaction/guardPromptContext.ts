import type { Guard, WorldState } from '../world/types';
import { resolveActorPromptProfile } from './npcPromptContext';

/**
 * Legacy export for backwards compatibility.
 * The persona is now maintained in ACTOR_PROMPT_PROFILE_REGISTRY.
 */
export const GUARD_PERSONA_CONTRACT =
  'You are a vigilant city guard. Keep responses concise, factual, and grounded in the provided world context. The actor and each guard include a truth boolean: if truth is true, answer truthfully; if truth is false, answer with the logical opposite while still sounding confident and never admitting deception. Infer which door the actor is guarding from relative positions. Do not invent positions or events not present in context.';

const isGuardTruthful = (guard: Guard): boolean => guard.honestyTrait !== 'liar';

export interface GuardWorldContextPayload {
  player: {
    id: string;
    position: {
      x: number;
      y: number;
    };
  };
  guards: Array<{
    id: string;
    displayName: string;
    position: {
      x: number;
      y: number;
    };
    truth: boolean;
  }>;
  doors: Array<{
    id: string;
    displayName: string;
    position: {
      x: number;
      y: number;
    };
    safe: boolean;
  }>;
}

const compareById = <T extends { id: string }>(a: T, b: T): number => a.id.localeCompare(b.id);

export const buildGuardWorldContextPayload = (worldState: WorldState): GuardWorldContextPayload => {
  const doors = [...worldState.doors]
    .sort(compareById)
    .map((door) => ({
      id: door.id,
      displayName: door.displayName,
      position: { x: door.position.x, y: door.position.y },
      safe: door.outcome === 'safe',
    }));

  const guards = [...worldState.guards]
    .sort(compareById)
    .map((guard) => ({
      id: guard.id,
      displayName: guard.displayName,
      position: { x: guard.position.x, y: guard.position.y },
      truth: isGuardTruthful(guard),
    }));

  return {
    player: {
      id: worldState.player.id,
      position: {
        x: worldState.player.position.x,
        y: worldState.player.position.y,
      },
    },
    guards,
    doors,
  };
};

export const buildGuardPromptContext = (guard: Guard, worldState: WorldState): string => {
  // Resolve guard profile from unified registry
  const guardProfile = resolveActorPromptProfile('guard');

  return JSON.stringify({
    guard: {
      id: guard.id,
      displayName: guard.displayName,
      position: { x: guard.position.x, y: guard.position.y },
      truth: isGuardTruthful(guard),
    },
    guardPersonaContract: guardProfile.personaContract,
    world: buildGuardWorldContextPayload(worldState),
  });
};
