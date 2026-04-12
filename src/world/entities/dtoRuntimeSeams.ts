import type {
  GameEntity,
  InteractiveObject,
  InventoryItem,
  LevelEnvironmentDto,
  LevelGuardDto,
  LevelInteractiveObjectDto,
  LevelNpcDto,
} from '../types';
import { Entity } from './base/Entity';
import { Environment } from './environment/Environment';
import { Item } from './items/Item';
import { GuardNpc } from './npcs/GuardNpc';
import { Npc } from './npcs/Npc';
import { ContainerObject } from './objects/ContainerObject';
import { DoorObject } from './objects/DoorObject';
import { InertObject } from './objects/InertObject';
import { MechanismObject } from './objects/MechanismObject';
import { WorldObject } from './objects/WorldObject';

export type EntityDtoContract = GameEntity;
export type NpcDtoContract = LevelNpcDto;
export type GuardDtoContract = LevelGuardDto;
export type InteractiveObjectDtoContract = InteractiveObject;
export type LevelInteractiveObjectDtoContract = LevelInteractiveObjectDto;
export type EnvironmentDtoContract = LevelEnvironmentDto;
export type ItemDtoContract = InventoryItem;

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
    position: { x: dto.x, y: dto.y },
    displayName: dto.displayName,
    spriteAssetPath: dto.spriteAssetPath,
    spriteSet: dto.spriteSet,
    npcType: dto.npcType,
    dialogueContextKey: `npc_${dto.npcType.toLowerCase()}`,
    patrol: dto.patrol,
    triggers: dto.triggers,
    inventory: dto.inventory?.map(mapInventoryItemDtoToRuntime),
    tradeRules: dto.tradeRules,
    instanceKnowledge: dto.instanceKnowledge,
    instanceBehavior: dto.instanceBehavior,
  });

export const mapGuardDtoToRuntime = (dto: GuardDtoContract): GuardNpc =>
  new GuardNpc({
    id: dto.id,
    position: { x: dto.x, y: dto.y },
    displayName: dto.displayName,
    spriteAssetPath: dto.spriteAssetPath,
    spriteSet: dto.spriteSet,
    traits: dto.traits,
    guardState: dto.guardState,
    instanceKnowledge: dto.instanceKnowledge,
    instanceBehavior: dto.instanceBehavior,
    itemUseRules: dto.itemUseRules,
  });

export const mapEnvironmentDtoToRuntime = (dto: EnvironmentDtoContract): Environment =>
  new Environment({
    id: dto.id,
    displayName: dto.displayName,
    position: { x: dto.x, y: dto.y },
    isBlocking: dto.isBlocking,
  });

export const mapInventoryItemDtoToRuntime = (dto: ItemDtoContract): Item =>
  Item.fromInventoryItem(dto);

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

export const mapLevelInteractiveObjectDtoToRuntime = (
  dto: LevelInteractiveObjectDtoContract,
): WorldObject => {
  const runtimeShape: InteractiveObject = {
    id: dto.id,
    displayName: dto.displayName,
    position: { x: dto.x, y: dto.y },
    objectType: dto.objectType,
    interactionType: dto.interactionType,
    state: dto.state,
    pickupItem: dto.pickupItem,
    idleMessage: dto.idleMessage,
    usedMessage: dto.usedMessage,
    firstUseOutcome: dto.firstUseOutcome,
    spriteAssetPath: dto.spriteAssetPath,
    spriteSet: dto.spriteSet,
    capabilities: dto.capabilities,
    itemUseRules: dto.itemUseRules,
  };

  const worldObject = mapInteractiveObjectDtoToRuntime(runtimeShape);
  return worldObject ?? new InertObject(runtimeShape);
};
