import type { Npc, Player } from '../world/types';

export interface NpcPromptProfile {
  personaContract: string;
  knowledgePolicy?: string;
  responseStyleConstraints?: string;
}

export interface ResolvedNpcPromptProfile extends NpcPromptProfile {
  profileKey: string;
  requestedNpcType: string;
}

export const DEFAULT_NPC_PROMPT_PROFILE: NpcPromptProfile = {
  personaContract:
    'You are a grounded world character. Answer using only the provided context and do not invent facts, locations, or events.',
  knowledgePolicy: 'Only speak about details supported by your local context and the current conversation history.',
  responseStyleConstraints: 'Keep responses concise, clear, and in character.',
};

export const NPC_PROMPT_PROFILE_REGISTRY: Record<string, NpcPromptProfile> = {
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
};

const DEFAULT_PROFILE_KEY = 'default';

const normalizeNpcType = (npcType: string | null | undefined): string => {
  if (typeof npcType !== 'string') {
    return DEFAULT_PROFILE_KEY;
  }

  const normalizedType = npcType.trim().toLowerCase();
  return normalizedType === '' ? DEFAULT_PROFILE_KEY : normalizedType;
};

export const resolveNpcPromptProfile = (npcType: string | null | undefined): ResolvedNpcPromptProfile => {
  const normalizedType = normalizeNpcType(npcType);
  const profile = NPC_PROMPT_PROFILE_REGISTRY[normalizedType] ?? DEFAULT_NPC_PROMPT_PROFILE;
  const profileKey = NPC_PROMPT_PROFILE_REGISTRY[normalizedType] ? normalizedType : DEFAULT_PROFILE_KEY;

  return {
    profileKey,
    requestedNpcType: normalizedType,
    personaContract: profile.personaContract,
    knowledgePolicy: profile.knowledgePolicy,
    responseStyleConstraints: profile.responseStyleConstraints,
  };
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