import { describe, expect, it } from 'vitest';
import threeSagesJson from '../../public/levels/three-sages-fork.json';
import manifestJson from '../../public/levels/manifest.json';
import { buildNpcPromptContext } from '../interaction/npcPromptContext';
import { deserializeLevel, validateLevelData } from '../world/level';
import type { WorldState } from '../world/types';

const createThreeSagesState = (): WorldState => {
  const validated = validateLevelData(threeSagesJson);
  return deserializeLevel(validated);
};

describe('three sages level integration pipeline', () => {
  it('loads three sages level into a valid WorldState with expected entity positions', () => {
    const validated = validateLevelData(threeSagesJson);
    const worldState = deserializeLevel(validated);

    expect(worldState).toBeDefined();
    expect(worldState.player.position).toEqual({ x: 10, y: 16 });
    expect(worldState.player.facingDirection).toBe('front');

    expect(worldState.guards).toHaveLength(0);

    expect(worldState.doors).toHaveLength(2);
    expect(worldState.doors.find((door) => door.id === 'door-west-arch')?.position).toEqual({ x: 8, y: 3 });
    expect(worldState.doors.find((door) => door.id === 'door-east-gate')?.position).toEqual({ x: 12, y: 3 });

    expect(worldState.npcs).toHaveLength(3);
    expect(worldState.npcs.find((npc) => npc.id === 'archivist')?.position).toEqual({ x: 8, y: 9 });
    expect(worldState.npcs.find((npc) => npc.id === 'mechanic')?.position).toEqual({ x: 10, y: 9 });
    expect(worldState.npcs.find((npc) => npc.id === 'gossip')?.position).toEqual({ x: 12, y: 9 });
  });

  it('wires medieval sprite sets for player and doors', () => {
    const worldState = createThreeSagesState();

    expect(worldState.player.spriteSet).toEqual({
      default: '/assets/medieval_player_farmer_front.svg',
      front: '/assets/medieval_player_farmer_front.svg',
      away: '/assets/medieval_player_farmer_away.svg',
      left: '/assets/medieval_player_farmer_left.svg',
      right: '/assets/medieval_player_farmer_right.svg',
    });

    expect(worldState.doors[0].spriteSet).toEqual({
      default: '/assets/medieval_door_wooden_closed.svg',
    });
  });

  it('has doors with correct outcome values', () => {
    const worldState = createThreeSagesState();

    const westDoor = worldState.doors.find((door) => door.id === 'door-west-arch');
    expect(westDoor).toBeDefined();
    expect(westDoor?.outcome).toBe('safe');

    const eastDoor = worldState.doors.find((door) => door.id === 'door-east-gate');
    expect(eastDoor).toBeDefined();
    expect(eastDoor?.outcome).toBe('danger');
  });

  it('initializes with levelOutcome as null', () => {
    const worldState = createThreeSagesState();

    expect(worldState.levelOutcome).toBeNull();
  });

  describe('NPC riddleClue contracts', () => {
    it('archivist has truthful clue about safe door (west-arch)', () => {
      const worldState = createThreeSagesState();
      const archivist = worldState.npcs.find((npc) => npc.id === 'archivist');

      expect(archivist).toBeDefined();
      expect(archivist?.riddleClue).toBeDefined();
      if (!archivist?.riddleClue) throw new Error('Expected riddleClue');

      expect(archivist.riddleClue.clueId).toBe('clue-west-truthful');
      expect(archivist.riddleClue.doorId).toBe('door-west-arch');
      expect(archivist.riddleClue.truthBehavior).toBe('truthful');
      expect(archivist.riddleClue.mustStateDoorAs).toBe('safe');
    });

    it('mechanic has inverse clue about danger door (east-gate)', () => {
      const worldState = createThreeSagesState();
      const mechanic = worldState.npcs.find((npc) => npc.id === 'mechanic');

      expect(mechanic).toBeDefined();
      expect(mechanic?.riddleClue).toBeDefined();
      if (!mechanic?.riddleClue) throw new Error('Expected riddleClue');

      expect(mechanic.riddleClue.clueId).toBe('clue-east-inverse');
      expect(mechanic.riddleClue.doorId).toBe('door-east-gate');
      expect(mechanic.riddleClue.truthBehavior).toBe('inverse');
      // Inverse of danger is safe
      expect(mechanic.riddleClue.mustStateDoorAs).toBe('safe');
    });

    it('gossip has truthful clue about danger door (east-gate)', () => {
      const worldState = createThreeSagesState();
      const gossip = worldState.npcs.find((npc) => npc.id === 'gossip');

      expect(gossip).toBeDefined();
      expect(gossip?.riddleClue).toBeDefined();
      if (!gossip?.riddleClue) throw new Error('Expected riddleClue');

      expect(gossip.riddleClue.clueId).toBe('clue-east-truthful');
      expect(gossip.riddleClue.doorId).toBe('door-east-gate');
      expect(gossip.riddleClue.truthBehavior).toBe('truthful');
      expect(gossip.riddleClue.mustStateDoorAs).toBe('danger');
    });
  });

  describe('NPC prompt context with riddleClue injection', () => {
    it('archivist context includes riddleClueConstraint stating door-west-arch is safe', () => {
      const worldState = createThreeSagesState();
      const archivist = worldState.npcs.find((npc) => npc.id === 'archivist');

      if (!archivist) throw new Error('Archivist not found');

      const contextJson = buildNpcPromptContext(archivist, worldState.player, worldState);
      const context = JSON.parse(contextJson);

      expect(context.riddleClueConstraint).toBeDefined();
      expect(context.riddleClueConstraint.doorId).toBe('door-west-arch');
      expect(context.riddleClueConstraint.mustStateDoorAs).toBe('safe');
      expect(context.riddleClueConstraint.constraint).toContain(
        'You must claim this door is "safe"'
      );
    });

    it('mechanic context includes riddleClueConstraint stating door-east-gate is safe (inverse)', () => {
      const worldState = createThreeSagesState();
      const mechanic = worldState.npcs.find((npc) => npc.id === 'mechanic');

      if (!mechanic) throw new Error('Mechanic not found');

      const contextJson = buildNpcPromptContext(mechanic, worldState.player, worldState);
      const context = JSON.parse(contextJson);

      expect(context.riddleClueConstraint).toBeDefined();
      expect(context.riddleClueConstraint.doorId).toBe('door-east-gate');
      expect(context.riddleClueConstraint.mustStateDoorAs).toBe('safe');
      expect(context.riddleClueConstraint.constraint).toContain(
        'You must claim this door is "safe"'
      );
    });

    it('gossip context includes riddleClueConstraint stating door-east-gate is danger', () => {
      const worldState = createThreeSagesState();
      const gossip = worldState.npcs.find((npc) => npc.id === 'gossip');

      if (!gossip) throw new Error('Gossip not found');

      const contextJson = buildNpcPromptContext(gossip, worldState.player, worldState);
      const context = JSON.parse(contextJson);

      expect(context.riddleClueConstraint).toBeDefined();
      expect(context.riddleClueConstraint.doorId).toBe('door-east-gate');
      expect(context.riddleClueConstraint.mustStateDoorAs).toBe('danger');
      expect(context.riddleClueConstraint.constraint).toContain(
        'You must claim this door is "danger"'
      );
    });

    it('includes instanceKnowledge in NPC context', () => {
      const worldState = createThreeSagesState();
      const archivist = worldState.npcs.find((npc) => npc.id === 'archivist');

      if (!archivist) throw new Error('Archivist not found');

      const contextJson = buildNpcPromptContext(archivist, worldState.player, worldState);
      const context = JSON.parse(contextJson);

      expect(context.instanceKnowledge).toBeDefined();
      expect(context.instanceKnowledge).toContain('keeper of records');
    });

    it('includes instanceBehavior in NPC context', () => {
      const worldState = createThreeSagesState();
      const archivist = worldState.npcs.find((npc) => npc.id === 'archivist');

      if (!archivist) throw new Error('Archivist not found');

      const contextJson = buildNpcPromptContext(archivist, worldState.player, worldState);
      const context = JSON.parse(contextJson);

      expect(context.instanceBehavior).toBeDefined();
      expect(context.instanceBehavior).toContain('scholarly precision');
    });
  });

  describe('NPC types and dialogue context keys', () => {
    it('archivist is of type archive_keeper with correct dialogueContextKey', () => {
      const worldState = createThreeSagesState();
      const archivist = worldState.npcs.find((npc) => npc.id === 'archivist');

      expect(archivist).toBeDefined();
      expect(archivist?.npcType).toBe('archive_keeper');
      expect(archivist?.dialogueContextKey).toBe('npc_archive_keeper');
    });

    it('mechanic is of type engineer with correct dialogueContextKey', () => {
      const worldState = createThreeSagesState();
      const mechanic = worldState.npcs.find((npc) => npc.id === 'mechanic');

      expect(mechanic).toBeDefined();
      expect(mechanic?.npcType).toBe('engineer');
      expect(mechanic?.dialogueContextKey).toBe('npc_engineer');
    });

    it('gossip is of type villager with correct dialogueContextKey', () => {
      const worldState = createThreeSagesState();
      const gossip = worldState.npcs.find((npc) => npc.id === 'gossip');

      expect(gossip).toBeDefined();
      expect(gossip?.npcType).toBe('villager');
      expect(gossip?.dialogueContextKey).toBe('npc_villager');
    });
  });

  describe('Manifest registration', () => {
    it('level appears in manifest with correct id and name', () => {
      const threeSagesEntry = manifestJson.find(
        (entry: { id: string; name: string }) => entry.id === 'three-sages-fork'
      );

      expect(threeSagesEntry).toBeDefined();
      expect(threeSagesEntry?.name).toBe('Three Sages at the Fork');
    });

    it('manifest has three levels including three-sages-fork', () => {
      expect(manifestJson).toHaveLength(3);
      expect(manifestJson.map((e: { id: string }) => e.id)).toContain('three-sages-fork');
    });
  });

  describe('Deterministic door outcomes', () => {
    it('door-west-arch always resolves to safe outcome', () => {
      const worldState = createThreeSagesState();
      const door = worldState.doors.find((d) => d.id === 'door-west-arch');

      expect(door?.outcome).toBe('safe');

      // Test again to verify determinism
      const worldState2 = createThreeSagesState();
      const door2 = worldState2.doors.find((d) => d.id === 'door-west-arch');

      expect(door2?.outcome).toBe('safe');
    });

    it('door-east-gate always resolves to danger outcome', () => {
      const worldState = createThreeSagesState();
      const door = worldState.doors.find((d) => d.id === 'door-east-gate');

      expect(door?.outcome).toBe('danger');

      // Test again to verify determinism
      const worldState2 = createThreeSagesState();
      const door2 = worldState2.doors.find((d) => d.id === 'door-east-gate');

      expect(door2?.outcome).toBe('danger');
    });
  });
});
