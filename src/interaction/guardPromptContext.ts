import type { Guard, WorldState } from '../world/types';
import {
  ACTOR_TYPE_WORLD_KNOWLEDGE_BUILDERS,
  buildActorTypeWorldKnowledge,
  resolveActorPromptProfile,
} from './npcPromptContext';

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

/**
 * Legacy function for backwards compatibility.
 * Now wraps the guard world knowledge builder from the registry.
 */
export const buildGuardWorldContextPayload = (worldState: WorldState): GuardWorldContextPayload => {
  const builder = ACTOR_TYPE_WORLD_KNOWLEDGE_BUILDERS['guard'];
  if (!builder) {
    throw new Error('Guard world knowledge builder not found in registry');
  }

  const payload = builder(worldState, 'placeholder') as {
    player: { id: string; position: { x: number; y: number } };
    guards: Array<{ id: string; displayName: string; position: { x: number; y: number }; truth: boolean }>;
    doors: Array<{ id: string; displayName: string; position: { x: number; y: number }; safe: boolean }>;
  };

  return payload;
};

export const buildGuardPromptContext = (guard: Guard, worldState: WorldState): string => {
  const guardProfile = resolveActorPromptProfile('guard');
  const worldKnowledge = buildActorTypeWorldKnowledge('guard', worldState, guard.id);

  if (worldKnowledge === null) {
    throw new Error('Guard world knowledge builder not found in registry');
  }

  return JSON.stringify({
    guard: {
      id: guard.id,
      displayName: guard.displayName,
      position: { x: guard.position.x, y: guard.position.y },
      truth: isGuardTruthful(guard),
    },
    guardPersonaContract: guardProfile.personaContract,
    world: worldKnowledge,
  });
};
