import { describe, expect, it } from 'vitest';
import { createInitialWorldState } from '../world/state';
import {
  ACTOR_TYPE_WORLD_KNOWLEDGE_BUILDERS,
  ACTOR_PROMPT_PROFILE_REGISTRY,
  buildActorTypeWorldKnowledge,
  buildNpcPromptContext,
  DEFAULT_NPC_PROMPT_PROFILE,
  resolveNpcPromptProfile,
} from './npcPromptContext';
import { buildGuardPromptContext } from './guardPromptContext';

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

  it('resolves NPC prompt profiles from the shared actor profile registry', () => {
    const archiveKeeperProfile = resolveNpcPromptProfile('archive_keeper');

    expect(archiveKeeperProfile.personaContract).toBe(
      ACTOR_PROMPT_PROFILE_REGISTRY.archive_keeper.personaContract,
    );
    expect(archiveKeeperProfile.knowledgePolicy).toBe(
      ACTOR_PROMPT_PROFILE_REGISTRY.archive_keeper.knowledgePolicy,
    );
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
    const villagerNpc = {
      ...worldState.npcs[0],
      id: 'npc-villager-1',
      displayName: 'Local Villager',
      npcType: 'villager',
      dialogueContextKey: 'villager_intro',
    };
    worldState.npcs = [
      villagerNpc,
      {
        ...villagerNpc,
        id: 'npc-villager-2',
        displayName: 'Neighbor Villager',
        position: { x: 3, y: 2 },
      },
    ];

    const context = JSON.parse(buildNpcPromptContext(villagerNpc, worldState.player, worldState)) as {
      typeWorldKnowledge?: { player: unknown; otherVillagers: unknown[] };
    };

    expect(context.typeWorldKnowledge).toBeDefined();
    expect(context.typeWorldKnowledge?.otherVillagers).toBeDefined();
    expect(context.typeWorldKnowledge?.otherVillagers).toHaveLength(1);
  });

  it('reuses the non-guard world-knowledge builder for active runtime archive_keeper NPCs', () => {
    const worldState = createInitialWorldState();
    const archiveKeeper = worldState.npcs[0];

    const context = JSON.parse(buildNpcPromptContext(archiveKeeper, worldState.player, worldState)) as {
      actor: { npcType: string };
      typeWorldKnowledge?: { player: unknown; otherVillagers: unknown[] };
    };

    expect(context.actor.npcType).toBe('archive_keeper');
    expect(context.typeWorldKnowledge).toBeDefined();
    expect(context.typeWorldKnowledge?.otherVillagers).toEqual([]);
  });

  it('uses a deterministic unknown-type fallback with no typeWorldKnowledge payload', () => {
    const worldState = createInitialWorldState();
    const unknownNpc = {
      ...worldState.npcs[0],
      id: 'npc-unknown-1',
      npcType: 'mystery_type',
    };

    const first = buildNpcPromptContext(unknownNpc, worldState.player, worldState);
    const second = buildNpcPromptContext(unknownNpc, worldState.player, worldState);
    const parsed = JSON.parse(first) as { typeWorldKnowledge?: unknown };

    expect(first).toBe(second);
    expect(parsed.typeWorldKnowledge).toBeUndefined();
    expect(buildActorTypeWorldKnowledge('mystery_type', worldState, unknownNpc.id)).toBeNull();
  });

  it('provides different world payload shapes for guard and villager actor types', () => {
    const worldState = createInitialWorldState();
    worldState.guards = [
      {
        id: 'guard-1',
        displayName: 'City Guard',
        position: { x: 1, y: 1 },
        guardState: 'idle',
      },
    ];
    worldState.doors = [
      {
        id: 'door-1',
        displayName: 'North Door',
        position: { x: 2, y: 1 },
        doorState: 'closed',
        outcome: 'safe',
      },
    ];

    const villagerNpc = {
      ...worldState.npcs[0],
      id: 'npc-villager-1',
      npcType: 'villager',
    };
    worldState.npcs = [villagerNpc];

    const guardContext = JSON.parse(buildGuardPromptContext(worldState.guards[0], worldState)) as {
      world: { guards?: unknown[]; doors?: unknown[]; otherVillagers?: unknown[] };
    };
    const villagerContext = JSON.parse(buildNpcPromptContext(villagerNpc, worldState.player, worldState)) as {
      typeWorldKnowledge?: { guards?: unknown[]; doors?: unknown[]; otherVillagers?: unknown[] };
    };

    expect(guardContext.world.guards).toBeDefined();
    expect(guardContext.world.doors).toBeDefined();
    expect(guardContext.world.otherVillagers).toBeUndefined();

    expect(villagerContext.typeWorldKnowledge?.otherVillagers).toBeDefined();
    expect(villagerContext.typeWorldKnowledge?.guards).toBeUndefined();
    expect(villagerContext.typeWorldKnowledge?.doors).toBeUndefined();
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

  it('contains exactly guard and one non-guard builder in the actor-type world-knowledge registry', () => {
    expect(Object.keys(ACTOR_TYPE_WORLD_KNOWLEDGE_BUILDERS).sort()).toEqual(['guard', 'villager']);
  });

  it('excludes the requesting villager from otherVillagers world knowledge', () => {
    const worldState = createInitialWorldState();
    const requestingVillager = {
      ...worldState.npcs[0],
      id: 'npc-villager-1',
      npcType: 'villager',
    };
    const otherVillager = {
      ...requestingVillager,
      id: 'npc-villager-2',
      displayName: 'Neighbor Villager',
      position: { x: 3, y: 2 },
    };
    worldState.npcs = [requestingVillager, otherVillager];

    const worldKnowledge = buildActorTypeWorldKnowledge(
      requestingVillager.npcType,
      worldState,
      requestingVillager.id,
    ) as { otherVillagers: Array<{ id: string }> };

    expect(worldKnowledge.otherVillagers).toHaveLength(1);
    expect(worldKnowledge.otherVillagers[0].id).toBe('npc-villager-2');
  });
});

describe('NPC instance fields in prompt context', () => {
  it('includes instanceKnowledge and instanceBehavior in output when present on NPC', () => {
    const worldState = createInitialWorldState();
    const npc = {
      ...worldState.npcs[0],
      id: 'npc-1',
      instanceKnowledge: 'The archives burned in the third age.',
      instanceBehavior: 'Refuses to discuss recent events.',
    };
    worldState.npcs = [npc];

    const parsed = JSON.parse(buildNpcPromptContext(npc, worldState.player, worldState)) as {
      instanceKnowledge?: string;
      instanceBehavior?: string;
    };

    expect(parsed.instanceKnowledge).toBe('The archives burned in the third age.');
    expect(parsed.instanceBehavior).toBe('Refuses to discuss recent events.');
  });

  it('omits instanceKnowledge and instanceBehavior keys when not set on NPC', () => {
    const worldState = createInitialWorldState();
    const npc = worldState.npcs[0];

    const parsed = JSON.parse(buildNpcPromptContext(npc, worldState.player, worldState)) as Record<string, unknown>;

    expect(Object.prototype.hasOwnProperty.call(parsed, 'instanceKnowledge')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(parsed, 'instanceBehavior')).toBe(false);
  });

  it('includes only instanceBehavior when instanceKnowledge is absent', () => {
    const worldState = createInitialWorldState();
    const npc = {
      ...worldState.npcs[0],
      id: 'npc-1',
      instanceBehavior: 'Only behavior provided.',
    };
    worldState.npcs = [npc];

    const parsed = JSON.parse(buildNpcPromptContext(npc, worldState.player, worldState)) as Record<string, unknown>;

    expect(parsed['instanceBehavior']).toBe('Only behavior provided.');
    expect(Object.prototype.hasOwnProperty.call(parsed, 'instanceKnowledge')).toBe(false);
  });

  it('instance fields appear alongside typeWorldKnowledge when actor type is known', () => {
    const worldState = createInitialWorldState();
    const npc = {
      ...worldState.npcs[0],
      id: 'npc-1',
      npcType: 'villager',
      instanceKnowledge: 'Village square floods in spring.',
      instanceBehavior: 'Speaks slowly and carefully.',
    };
    worldState.npcs = [npc];

    const parsed = JSON.parse(buildNpcPromptContext(npc, worldState.player, worldState)) as {
      typeWorldKnowledge?: unknown;
      instanceKnowledge?: string;
      instanceBehavior?: string;
    };

    expect(parsed.typeWorldKnowledge).toBeDefined();
    expect(parsed.instanceKnowledge).toBe('Village square floods in spring.');
    expect(parsed.instanceBehavior).toBe('Speaks slowly and carefully.');
  });

  it('includes patrolStatus metadata when NPC has a patrol path', () => {
    const worldState = createInitialWorldState();
    const npc = {
      ...worldState.npcs[0],
      position: { x: 8, y: 3 },
      patrol: {
        path: [
          { x: 8, y: 3 },
          { x: 9, y: 3 },
        ],
      },
    };

    const parsed = JSON.parse(buildNpcPromptContext(npc, worldState.player, worldState)) as {
      npcInstance: {
        patrolStatus: {
          isPatrolling: boolean;
          pathLength: number;
          currentPathIndex: number;
        };
      };
    };

    expect(parsed.npcInstance.patrolStatus).toEqual({
      isPatrolling: true,
      pathLength: 2,
      currentPathIndex: 0,
    });
  });

  it('includes activeFacts when NPC facts exist', () => {
    const worldState = createInitialWorldState();
    const npc = {
      ...worldState.npcs[0],
      facts: {
        alerted: true,
        trust: 3,
      },
    };

    const parsed = JSON.parse(buildNpcPromptContext(npc, worldState.player, worldState)) as {
      activeFacts?: Record<string, string | boolean | number>;
    };

    expect(parsed.activeFacts).toEqual({
      alerted: true,
      trust: 3,
    });
  });
});
