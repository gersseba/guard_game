export interface KnowledgeTokenGrantRecord {
  tokenId: string;
  grantedAtTick: number;
  grantedByActorId?: string;
}

export interface KnowledgeState {
  version: 1;
  tokensById: Record<string, KnowledgeTokenGrantRecord>;
}

export interface KnowledgeTokenOutcome {
  requireKnowledgeTokens?: string[];
  grantKnowledgeTokens?: string[];
}

export interface KnowledgeTokenValidationResult {
  isValid: boolean;
  missingKnowledgeTokens: string[];
}

export interface KnowledgeTokenOutcomeResolution extends KnowledgeTokenValidationResult {
  knowledgeState: KnowledgeState;
}
