import { describe, expect, it } from 'vitest';
import { createInitialWorldState } from '../world/state';
import {
  buildNpcPromptContext,
  DEFAULT_NPC_PROMPT_PROFILE,
  resolveNpcPromptProfile,
} from './npcPromptContext';

describe('resolveNpcPromptProfile', () => {
  it('returns the same profile contract for different NPCs with the same npcType', () => {
    const firstProfile = resolveNpcPromptProfile('archive_keeper');
    const secondProfile = resolveNpcPromptProfile('archive_keeper');

    expect(firstProfile).toEqual(secondProfile);
    expect(firstProfile.profileKey).toBe('archive_keeper');
  });

  it('resolves different npcTypes to different prompt profiles', () => {
    const archiveKeeperProfile = resolveNpcPromptProfile('archive_keeper');
    const engineerProfile = resolveNpcPromptProfile('engineer');

    expect(archiveKeeperProfile.profileKey).toBe('archive_keeper');
    expect(engineerProfile.profileKey).toBe('engineer');
    expect(archiveKeeperProfile.personaContract).not.toBe(engineerProfile.personaContract);
  });

  it('falls back to a deterministic default profile for unknown or missing npcType', () => {
    expect(resolveNpcPromptProfile('unknown_type')).toEqual({
      profileKey: 'default',
      requestedNpcType: 'unknown_type',
      personaContract: DEFAULT_NPC_PROMPT_PROFILE.personaContract,
      knowledgePolicy: DEFAULT_NPC_PROMPT_PROFILE.knowledgePolicy,
      responseStyleConstraints: DEFAULT_NPC_PROMPT_PROFILE.responseStyleConstraints,
    });

    expect(resolveNpcPromptProfile(undefined)).toEqual({
      profileKey: 'default',
      requestedNpcType: 'default',
      personaContract: DEFAULT_NPC_PROMPT_PROFILE.personaContract,
      knowledgePolicy: DEFAULT_NPC_PROMPT_PROFILE.knowledgePolicy,
      responseStyleConstraints: DEFAULT_NPC_PROMPT_PROFILE.responseStyleConstraints,
    });
  });
});

describe('buildNpcPromptContext', () => {
  it('keeps shared profile data separate from per-instance fields', () => {
    const worldState = createInitialWorldState();
    const firstNpc = worldState.npcs[0];
    const secondNpc = {
      ...firstNpc,
      id: 'npc-2',
      displayName: 'Senior Archivist',
      position: { x: 10, y: 4 },
    };

    const firstContext = JSON.parse(buildNpcPromptContext(firstNpc, worldState.player, worldState)) as {
      npcProfile: { profileKey: string; personaContract: string };
      npcInstance: { displayName: string; position: { x: number; y: number } };
    };
    const secondContext = JSON.parse(buildNpcPromptContext(secondNpc, worldState.player, worldState)) as typeof firstContext;

    expect(firstContext.npcProfile).toEqual(secondContext.npcProfile);
    expect(firstContext.npcInstance).not.toEqual(secondContext.npcInstance);
    expect(firstContext.npcInstance.displayName).toBe('Archivist');
    expect(secondContext.npcInstance.displayName).toBe('Senior Archivist');
  });

  it('includes typeWorldKnowledge in context for known actor types', () => {
    const worldState = createInitialWorldState();
    const archiveKeeperNpc = worldState.npcs[0]; // archive_keeper type

    const context = JSON.parse(buildNpcPromptContext(archiveKeeperNpc, worldState.player, worldState)) as {
      typeWorldKnowledge?: { player: unknown; archives: unknown[] };
    };

    expect(context.typeWorldKnowledge).toBeDefined();
    expect(context.typeWorldKnowledge?.archives).toBeDefined();
  });

  it('produces deterministic serialized output for the same NPC snapshot', () => {
    const worldState = createInitialWorldState();
    const first = buildNpcPromptContext(worldState.npcs[0], worldState.player, worldState);
    const second = buildNpcPromptContext(worldState.npcs[0], worldState.player, worldState);
    const roundTrippedNpc = JSON.parse(JSON.stringify(worldState.npcs[0])) as (typeof worldState.npcs)[number];
    const roundTrippedPlayer = JSON.parse(JSON.stringify(worldState.player)) as typeof worldState.player;
    const roundTrippedWorldState = JSON.parse(JSON.stringify(worldState)) as typeof worldState;
    const third = buildNpcPromptContext(roundTrippedNpc, roundTrippedPlayer, roundTrippedWorldState);

    expect(first).toBe(second);
    expect(first).toBe(third);
  });
});
