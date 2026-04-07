import type { LevelDoorDto, LevelNpcDto, Npc } from '../types';
import { mapNpcDtoToRuntime } from '../entities/dtoRuntimeSeams';

/**
 * Maps a LevelNpcDto to a runtime Npc, resolving the riddleClue when present.
 * Requires the doors array to resolve the mustStateDoorAs claim for riddleClue NPCs.
 * Pure function — same input always produces the same output.
 *
 * riddleClue resolution logic:
 * - door is safe  + NPC is truthful  → mustStateDoorAs = 'safe'
 * - door is safe  + NPC is inverse   → mustStateDoorAs = 'danger'
 * - door is danger + NPC is truthful → mustStateDoorAs = 'danger'
 * - door is danger + NPC is inverse  → mustStateDoorAs = 'safe'
 */
export const mapNpcWithRiddleClue = (dto: LevelNpcDto, doors: LevelDoorDto[]): Npc => {
  const npc: Npc = mapNpcDtoToRuntime(dto);

  if (dto.riddleClue !== undefined) {
    const door = doors.find((d) => d.id === dto.riddleClue!.doorId);
    if (!door) {
      throw new Error(
        `Invalid level data: npc ${dto.id} references non-existent door ${dto.riddleClue.doorId}`,
      );
    }

    const mustStateDoorAs: 'safe' | 'danger' =
      (door.outcome === 'safe') === (dto.riddleClue.truthBehavior === 'truthful')
        ? 'safe'
        : 'danger';

    npc.riddleClue = {
      clueId: dto.riddleClue.clueId,
      doorId: dto.riddleClue.doorId,
      truthBehavior: dto.riddleClue.truthBehavior,
      mustStateDoorAs,
    };
  }

  return npc;
};
