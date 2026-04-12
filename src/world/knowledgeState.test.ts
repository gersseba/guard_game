import { describe, expect, it } from 'vitest';
import {
  applyKnowledgeTokenOutcome,
  applyKnowledgeTokenOutcomeIfValid,
  createKnowledgeState,
  ensureKnowledgeState,
  validateKnowledgeTokenRequirements,
} from './knowledgeState';

describe('knowledgeState', () => {
  it('creates JSON-serializable deterministic default state', () => {
    const knowledgeState = createKnowledgeState();

    expect(knowledgeState).toEqual({
      version: 1,
      tokensById: {},
    });

    const roundTrip = JSON.parse(JSON.stringify(knowledgeState));
    expect(roundTrip).toEqual(knowledgeState);
  });

  it('grants knowledge tokens deterministically from a validated outcome', () => {
    const initial = createKnowledgeState();

    const first = applyKnowledgeTokenOutcome(
      initial,
      {
        grantKnowledgeTokens: ['seal-b', 'seal-a', 'seal-b'],
      },
      {
        tick: 14,
        grantedByActorId: 'npc-archivist',
      },
    );

    const second = applyKnowledgeTokenOutcome(
      initial,
      {
        grantKnowledgeTokens: ['seal-b', 'seal-a', 'seal-b'],
      },
      {
        tick: 14,
        grantedByActorId: 'npc-archivist',
      },
    );

    expect(first).toEqual(second);
    expect(Object.keys(first.knowledgeState.tokensById)).toEqual(['seal-a', 'seal-b']);
    expect(first.knowledgeState.tokensById['seal-a']).toEqual({
      tokenId: 'seal-a',
      grantedAtTick: 14,
      grantedByActorId: 'npc-archivist',
    });
  });

  it('validates requirements successfully when all tokens are present', () => {
    const seeded = applyKnowledgeTokenOutcome(
      createKnowledgeState(),
      {
        grantKnowledgeTokens: ['seal-a', 'seal-b'],
      },
      {
        tick: 3,
      },
    ).knowledgeState;

    const validation = validateKnowledgeTokenRequirements(seeded, ['seal-b', 'seal-a']);

    expect(validation).toEqual({
      isValid: true,
      missingKnowledgeTokens: [],
    });
  });

  it('fails validation with deterministic sorted missing token ids', () => {
    const validation = validateKnowledgeTokenRequirements(createKnowledgeState(), [
      'seal-c',
      'seal-a',
      'seal-b',
    ]);

    expect(validation).toEqual({
      isValid: false,
      missingKnowledgeTokens: ['seal-a', 'seal-b', 'seal-c'],
    });
  });

  it('keeps token requirements persistent and non-consuming across repeated validation', () => {
    const seeded = applyKnowledgeTokenOutcome(
      createKnowledgeState(),
      {
        grantKnowledgeTokens: ['seal-a'],
      },
      {
        tick: 9,
      },
    ).knowledgeState;

    const firstValidation = validateKnowledgeTokenRequirements(seeded, ['seal-a']);
    const secondValidation = validateKnowledgeTokenRequirements(seeded, ['seal-a']);

    expect(firstValidation).toEqual({
      isValid: true,
      missingKnowledgeTokens: [],
    });
    expect(secondValidation).toEqual(firstValidation);
    expect(seeded.tokensById['seal-a']).toBeDefined();
  });

  it('blocks grants when required tokens are missing', () => {
    const result = applyKnowledgeTokenOutcome(
      createKnowledgeState(),
      {
        requireKnowledgeTokens: ['seal-a'],
        grantKnowledgeTokens: ['seal-b'],
      },
      {
        tick: 22,
      },
    );

    expect(result.isValid).toBe(false);
    expect(result.missingKnowledgeTokens).toEqual(['seal-a']);
    expect(result.knowledgeState.tokensById['seal-b']).toBeUndefined();
  });

  it('ignores malformed unknown outcomes in safe apply API', () => {
    const initial = createKnowledgeState();

    const result = applyKnowledgeTokenOutcomeIfValid(initial, { grantKnowledgeTokens: [42] }, { tick: 1 });

    expect(result).toEqual({
      isValid: false,
      missingKnowledgeTokens: [],
      knowledgeState: initial,
    });
  });

  it('ensures backward-compatible defaults for undefined state', () => {
    const ensured = ensureKnowledgeState(undefined);

    expect(ensured).toEqual(createKnowledgeState());
  });
});
