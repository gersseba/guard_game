import type { GameEntity, Guard as GuardDto, InteractiveObject, Npc as NpcDto } from '../types';
import { Entity } from './base/Entity';
import { GuardNpc } from './npcs/GuardNpc';
import { Npc } from './npcs/Npc';
import { ContainerObject } from './objects/ContainerObject';
import { DoorObject } from './objects/DoorObject';
import { MechanismObject } from './objects/MechanismObject';
import { WorldObject } from './objects/WorldObject';

export type EntityDtoContract = GameEntity;
export type NpcDtoContract = NpcDto;
export type GuardDtoContract = GuardDto;
export type InteractiveObjectDtoContract = InteractiveObject;

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

export const mapGuardDtoToRuntime = (dto: GuardDtoContract): GuardNpc =>
  new GuardNpc({
    id: dto.id,
    position: dto.position,
    displayName: dto.displayName,
    spriteAssetPath: dto.spriteAssetPath,
    spriteSet: dto.spriteSet,
    traits: dto.traits,
    facts: dto.facts,
    guardState: dto.guardState,
    facingDirection: dto.facingDirection,
    instanceKnowledge: dto.instanceKnowledge,
    instanceBehavior: dto.instanceBehavior,
    itemUseRules: dto.itemUseRules,
  });

const isDoorLikeObjectType = (objectType: string): boolean => {
  return objectType === 'door' || objectType.endsWith('-door') || objectType.includes('door');
};

export const mapInteractiveObjectDtoToRuntime = (
  dto: InteractiveObjectDtoContract,
): WorldObject | null => {
  if (dto.capabilities?.containsItems) {
    return new ContainerObject(dto);
  }

  if (dto.capabilities?.isActivatable || dto.objectType === 'mechanism') {
    return new MechanismObject(dto);
  }

  if (isDoorLikeObjectType(dto.objectType)) {
    return new DoorObject(dto);
  }

  return null;
};
