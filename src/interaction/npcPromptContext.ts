import type { Npc, Player } from '../world/types';

/**
 * Shared behavior profile for any actor type (Guard, NPC, etc).
 * Defines persona, knowledge boundaries, and response style.
 */
export interface ActorPromptProfile {
  personaContract: string;
  knowledgePolicy?: string;
  responseStyleConstraints?: string;
}

/**
 * Legacy alias for backwards compatibility and clarity when used with NPCs specifically.
 */
export type NpcPromptProfile = ActorPromptProfile;

export interface ResolvedActorPromptProfile extends ActorPromptProfile {
  profileKey: string;
  requestedActorType: string;
}

/**
 * Legacy alias for backwards compatibility.
 */
export type ResolvedNpcPromptProfile = ResolvedActorPromptProfile;

export const DEFAULT_ACTOR_PROMPT_PROFILE: ActorPromptProfile = {
  personaContract:
    'You are a grounded world character. Answer using only the provided context and do not invent facts, locations, or events.',
  knowledgePolicy: 'Only speak about details supported by your local context and the current conversation history.',
  responseStyleConstraints: 'Keep responses concise, clear, and in character.',
};

export const DEFAULT_NPC_PROMPT_PROFILE: ActorPromptProfile = DEFAULT_ACTOR_PROMPT_PROFILE;

/**
 * Unified registry for all actor types: guards, NPCs, etc.
 * Each entry defines the behavior profile for that actor type.
 */
export const ACTOR_PROMPT_PROFILE_REGISTRY: Record<string, ActorPromptProfile> = {
  guard: {
    personaContract:
      'You are a vigilant city guard. Keep responses concise, factual, and grounded in the provided world context. The actor and each guard include a truth boolean: if truth is true, answer truthfully; if truth is false, answer with the logical opposite while still sounding confident and never admitting deception. Infer which door the actor is guarding from relative positions. Do not invent positions or events not present in context.',
    responseStyleConstraints:
      'Respond only to guard-related topics. Disregard questions outside your domain.',
  },
  archive_keeper: {
    personaContract:
      'You are an archive keeper who protects records, values accuracy, and treats preserved knowledge as important civic duty.',
    knowledgePolicy:
      'You may discuss archives, records, cataloguing, and nearby civic spaces when supported by the provided context.',
    responseStyleConstraints: 'Respond precisely and with a measured, scholarly tone.',
  },
  engineer: {
    personaContract:
      'You are a practical engineer focused on mechanisms, access routes, and route constraints when supported by the provided context.',
    responseStyleConstraints: 'Respond directly with a pragmatic, technical tone.',
  },
  scholar: {
    personaContract:
      'You are a scholar who values interpretation, patterns, and careful explanation over speculation.',
    knowledgePolicy:
      'You may discuss research topics and observed patterns when they are supported by the provided context.',
    responseStyleConstraints: 'Respond thoughtfully and avoid overstating certainty.',
  },
};

/**
 * Legacy alias for NPC registry lookups.
 */
export const NPC_PROMPT_PROFILE_REGISTRY = ACTOR_PROMPT_PROFILE_REGISTRY;

const DEFAULT_PROFILE_KEY = 'default';

const normalizeActorType = (actorType: string | null | undefined): string => {
  if (typeof actorType !== 'string') {
    return DEFAULT_PROFILE_KEY;
  }

  const normalizedType = actorType.trim().toLowerCase();
  return normalizedType === '' ? DEFAULT_PROFILE_KEY : normalizedType;
};

export const resolveActorPromptProfile = (
  actorType: string | null | undefined,
): ResolvedActorPromptProfile => {
  const normalizedType = normalizeActorType(actorType);
  const profile = ACTOR_PROMPT_PROFILE_REGISTRY[normalizedType] ?? DEFAULT_ACTOR_PROMPT_PROFILE;
  const profileKey = ACTOR_PROMPT_PROFILE_REGISTRY[normalizedType] ? normalizedType : DEFAULT_PROFILE_KEY;

  return {
    profileKey,
    requestedActorType: normalizedType,
    personaContract: profile.personaContract,
    knowledgePolicy: profile.knowledgePolicy,
    responseStyleConstraints: profile.responseStyleConstraints,
  };
};

/**
 * Legacy resolver for NPC-specific calls. Routes to shared resolver.
 */
export const resolveNpcPromptProfile = (npcType: string | null | undefined): ResolvedNpcPromptProfile => {
  return resolveActorPromptProfile(npcType);
};

export const buildNpcPromptContext = (npc: Npc, player: Player): string => {
  const resolvedProfile = resolveNpcPromptProfile(npc.npcType);

  return JSON.stringify({
    actor: {
      id: npc.id,
      npcType: npc.npcType,
    },
    npcProfile: resolvedProfile,
    npcInstance: {
      displayName: npc.displayName,
      position: {
        x: npc.position.x,
        y: npc.position.y,
      },
      dialogueContextKey: npc.dialogueContextKey,
    },
    player: {
      id: player.id,
      displayName: player.displayName,
    },
  });
};
