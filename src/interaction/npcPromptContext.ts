import type { Npc, Player, WorldState } from '../world/types';

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

export interface ResolvedNpcPromptProfile extends ActorPromptProfile {
  profileKey: string;
  requestedNpcType: string;
}

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
      'You are a practical engineer focused on mechanisms, access routes, and keeping infrastructure operational.',
    knowledgePolicy:
      'You may discuss machinery, access points, repairs, and route constraints when supported by the provided context.',
    responseStyleConstraints: 'Respond directly with a pragmatic, technical tone.',
  },
  scholar: {
    personaContract:
      'You are a scholar who values interpretation, patterns, and careful explanation over speculation.',
    knowledgePolicy:
      'You may discuss research topics and observed patterns when they are supported by the provided context.',
    responseStyleConstraints: 'Respond thoughtfully and avoid overstating certainty.',
  },
  villager: {
    personaContract:
      'You are a common villager with local knowledge and everyday concerns. You know your neighbors and the immediate community.',
    knowledgePolicy:
      'You may discuss other NPCs, local events, and community matters when supported by nearby context.',
    responseStyleConstraints: 'Respond naturally and conversationally, like an ordinary person.',
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
  const resolvedProfile = resolveActorPromptProfile(npcType);

  return {
    profileKey: resolvedProfile.profileKey,
    requestedNpcType: resolvedProfile.requestedActorType,
    personaContract: resolvedProfile.personaContract,
    knowledgePolicy: resolvedProfile.knowledgePolicy,
    responseStyleConstraints: resolvedProfile.responseStyleConstraints,
  };
};

/**
 * World knowledge builder for actor types.
 * Takes a WorldState and actor ID, returns type-specific world context.
 * Return value is serialized and included in the LLM prompt.
 */
export type ActorTypeWorldKnowledgeBuilder = (
  worldState: WorldState,
  actorId: string,
) => unknown;

/**
 * Registry of world knowledge builders by actor type.
 * Each actor type can declare what world facts it has access to.
 */
export const ACTOR_TYPE_WORLD_KNOWLEDGE_BUILDERS: Record<string, ActorTypeWorldKnowledgeBuilder> = {
  guard: (worldState: WorldState): unknown => {
    // Guards know about other guards, doors, and the player
    const guards = [...worldState.guards]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((guard) => ({
        id: guard.id,
        displayName: guard.displayName,
        position: { x: guard.position.x, y: guard.position.y },
        truth: guard.honestyTrait !== 'liar',
      }));

    const doors = [...worldState.doors]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((door) => ({
        id: door.id,
        displayName: door.displayName,
        position: { x: door.position.x, y: door.position.y },
        safe: door.outcome === 'safe',
      }));

    return {
      player: {
        id: worldState.player.id,
        position: { x: worldState.player.position.x, y: worldState.player.position.y },
      },
      guards,
      doors,
    };
  },

  villager: (worldState: WorldState, actorId: string): unknown => {
    // Villagers know about other NPCs in the world
    const npcs = [...worldState.npcs]
      .filter((npc) => npc.npcType === 'villager' && npc.id !== actorId)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((npc) => ({
        id: npc.id,
        displayName: npc.displayName,
        position: { x: npc.position.x, y: npc.position.y },
        npcType: npc.npcType,
      }));

    return {
      player: {
        id: worldState.player.id,
        position: { x: worldState.player.position.x, y: worldState.player.position.y },
      },
      otherVillagers: npcs,
    };
  },
};

const ACTOR_WORLD_KNOWLEDGE_BUILDER_ALIASES: Record<string, string> = {
  archive_keeper: 'villager',
};

/**
 * Resolve world knowledge for an actor type. Returns a builder function or undefined if not found.
 */
const resolveActorWorldKnowledgeBuilder = (
  actorType: string | null | undefined,
): ActorTypeWorldKnowledgeBuilder | undefined => {
  const normalizedType = normalizeActorType(actorType);
  const actorTypeKey =
    ACTOR_TYPE_WORLD_KNOWLEDGE_BUILDERS[normalizedType] !== undefined
      ? normalizedType
      : ACTOR_WORLD_KNOWLEDGE_BUILDER_ALIASES[normalizedType];

  return actorTypeKey ? ACTOR_TYPE_WORLD_KNOWLEDGE_BUILDERS[actorTypeKey] : undefined;
};

export const buildActorTypeWorldKnowledge = (
  actorType: string | null | undefined,
  worldState: WorldState,
  actorId: string,
): unknown | null => {
  const worldKnowledgeBuilder = resolveActorWorldKnowledgeBuilder(actorType);
  return worldKnowledgeBuilder ? worldKnowledgeBuilder(worldState, actorId) : null;
};

export const buildNpcPromptContext = (npc: Npc, player: Player, worldState: WorldState): string => {
  const resolvedProfile = resolveNpcPromptProfile(npc.npcType);
  const worldKnowledge = buildActorTypeWorldKnowledge(npc.npcType, worldState, npc.id);

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
    ...(worldKnowledge !== null && { typeWorldKnowledge: worldKnowledge }),
    ...(npc.instanceKnowledge !== undefined && { instanceKnowledge: npc.instanceKnowledge }),
    ...(npc.instanceBehavior !== undefined && { instanceBehavior: npc.instanceBehavior }),
    player: {
      id: player.id,
      displayName: player.displayName,
    },
  });
};
