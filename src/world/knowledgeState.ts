import type {
  KnowledgeState,
  KnowledgeTokenOutcome,
  KnowledgeTokenOutcomeResolution,
  KnowledgeTokenValidationResult,
} from './types';

const INITIAL_KNOWLEDGE_STATE_VERSION = 1 as const;

const normalizeTokenIds = (tokenIds: readonly string[]): string[] => {
  const normalized = tokenIds
    .filter((tokenId) => typeof tokenId === 'string')
    .map((tokenId) => tokenId.trim())
    .filter((tokenId) => tokenId.length > 0);

  return [...new Set(normalized)].sort();
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const createKnowledgeState = (): KnowledgeState => ({
  version: INITIAL_KNOWLEDGE_STATE_VERSION,
  tokensById: {},
});

export const ensureKnowledgeState = (knowledgeState: KnowledgeState | undefined): KnowledgeState => {
  return knowledgeState ?? createKnowledgeState();
};

export const validateKnowledgeTokenRequirements = (
  knowledgeState: KnowledgeState | undefined,
  requiredTokenIds: readonly string[] = [],
): KnowledgeTokenValidationResult => {
  const stableKnowledgeState = ensureKnowledgeState(knowledgeState);
  const required = normalizeTokenIds(requiredTokenIds);
  const missingKnowledgeTokens = required.filter(
    (tokenId) => stableKnowledgeState.tokensById[tokenId] === undefined,
  );

  return {
    isValid: missingKnowledgeTokens.length === 0,
    missingKnowledgeTokens,
  };
};

export interface ApplyKnowledgeTokenOutcomeOptions {
  tick: number;
  grantedByActorId?: string;
}

export const applyKnowledgeTokenOutcome = (
  knowledgeState: KnowledgeState | undefined,
  outcome: KnowledgeTokenOutcome | undefined,
  options: ApplyKnowledgeTokenOutcomeOptions,
): KnowledgeTokenOutcomeResolution => {
  const stableKnowledgeState = ensureKnowledgeState(knowledgeState);
  if (!outcome) {
    return {
      isValid: true,
      missingKnowledgeTokens: [],
      knowledgeState: stableKnowledgeState,
    };
  }

  const validation = validateKnowledgeTokenRequirements(
    stableKnowledgeState,
    outcome.requireKnowledgeTokens ?? [],
  );
  if (!validation.isValid) {
    return {
      ...validation,
      knowledgeState: stableKnowledgeState,
    };
  }

  const grantKnowledgeTokens = normalizeTokenIds(outcome.grantKnowledgeTokens ?? []);
  if (grantKnowledgeTokens.length === 0) {
    return {
      isValid: true,
      missingKnowledgeTokens: [],
      knowledgeState: stableKnowledgeState,
    };
  }

  let didChange = false;
  const nextTokensById = { ...stableKnowledgeState.tokensById };

  for (const tokenId of grantKnowledgeTokens) {
    if (nextTokensById[tokenId] !== undefined) {
      continue;
    }

    nextTokensById[tokenId] = {
      tokenId,
      grantedAtTick: options.tick,
      ...(options.grantedByActorId ? { grantedByActorId: options.grantedByActorId } : {}),
    };
    didChange = true;
  }

  return {
    isValid: true,
    missingKnowledgeTokens: [],
    knowledgeState: didChange
      ? {
          ...stableKnowledgeState,
          tokensById: nextTokensById,
        }
      : stableKnowledgeState,
  };
};

const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
};

export const isKnowledgeTokenOutcome = (value: unknown): value is KnowledgeTokenOutcome => {
  if (!isRecord(value)) {
    return false;
  }

  if (
    'requireKnowledgeTokens' in value &&
    value.requireKnowledgeTokens !== undefined &&
    !isStringArray(value.requireKnowledgeTokens)
  ) {
    return false;
  }

  if (
    'grantKnowledgeTokens' in value &&
    value.grantKnowledgeTokens !== undefined &&
    !isStringArray(value.grantKnowledgeTokens)
  ) {
    return false;
  }

  return true;
};

export const applyKnowledgeTokenOutcomeIfValid = (
  knowledgeState: KnowledgeState | undefined,
  outcome: unknown,
  options: ApplyKnowledgeTokenOutcomeOptions,
): KnowledgeTokenOutcomeResolution => {
  const stableKnowledgeState = ensureKnowledgeState(knowledgeState);
  if (!isKnowledgeTokenOutcome(outcome)) {
    return {
      isValid: false,
      missingKnowledgeTokens: [],
      knowledgeState: stableKnowledgeState,
    };
  }

  return applyKnowledgeTokenOutcome(stableKnowledgeState, outcome, options);
};
