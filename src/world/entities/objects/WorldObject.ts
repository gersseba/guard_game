import { Entity, type EntityInit } from '../base/Entity';
import type { InteractiveObject, Player, WorldState } from '../../types';

export interface WorldObjectInit extends EntityInit {
  objectType: string;
}

export interface WorldObjectInteractionRequest {
  interactiveObject: InteractiveObject;
  player: Player;
  worldState: WorldState;
}

export interface WorldObjectInteractionResult {
  responseText: string;
  updatedWorldState: WorldState;
}

export abstract class WorldObject extends Entity {
  public objectType: string;

  protected constructor(init: WorldObjectInit) {
    super(init);
    this.objectType = init.objectType;
  }

  public abstract interact(
    request: WorldObjectInteractionRequest,
  ): WorldObjectInteractionResult;

  protected replaceInteractiveObjectInWorld(
    worldState: WorldState,
    updatedObject: InteractiveObject,
  ): InteractiveObject[] {
    return worldState.interactiveObjects.map((interactiveObject) =>
      interactiveObject.id === updatedObject.id ? updatedObject : interactiveObject,
    );
  }

  protected resolveFirstUseOutcome(
    worldState: WorldState,
    interactiveObject: InteractiveObject,
    wasUsed: boolean,
  ): WorldState['levelOutcome'] {
    return worldState.levelOutcome ?? (!wasUsed ? (interactiveObject.firstUseOutcome ?? null) : null);
  }
}
