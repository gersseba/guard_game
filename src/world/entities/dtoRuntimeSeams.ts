import type { GameEntity, Npc as NpcDto } from '../types';
import { Entity } from './base/Entity';
import { Npc } from './npcs/Npc';

export type EntityDtoContract = GameEntity;
export type NpcDtoContract = NpcDto;

export interface DtoToRuntimeAdapter<TDto, TRuntime> {
  fromDto(dto: TDto): TRuntime;
}

export const mapEntityDtoToRuntime = (dto: EntityDtoContract): Entity =>
  new Entity({
    id: dto.id,
    position: dto.position,
    displayName: dto.displayName,
    spriteAssetPath: dto.spriteAssetPath,
    spriteSet: dto.spriteSet,
    traits: dto.traits,
    facts: dto.facts,
  });

export const mapNpcDtoToRuntime = (dto: NpcDtoContract): Npc =>
  new Npc({
    id: dto.id,
    position: dto.position,
    displayName: dto.displayName,
    spriteAssetPath: dto.spriteAssetPath,
    spriteSet: dto.spriteSet,
    traits: dto.traits,
    facts: dto.facts,
    npcType: dto.npcType,
    dialogueContextKey: dto.dialogueContextKey,
    patrol: dto.patrol,
    triggers: dto.triggers,
    inventory: dto.inventory,
    instanceKnowledge: dto.instanceKnowledge,
    instanceBehavior: dto.instanceBehavior,
    riddleClue: dto.riddleClue,
  });
