import { Entity, type EntityInit } from '../base/Entity';
import type { InteractiveObject, Player, WorldState } from '../../types';

export interface WorldObjectInit extends EntityInit {
  objectType: string;
  interactionType: InteractiveObject['interactionType'];
  state: InteractiveObject['state'];
  pickupItem?: InteractiveObject['pickupItem'];
  idleMessage?: string;
  usedMessage?: string;
  firstUseOutcome?: InteractiveObject['firstUseOutcome'];
  capabilities?: InteractiveObject['capabilities'];
  itemUseRules?: InteractiveObject['itemUseRules'];
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
  public interactionType: InteractiveObject['interactionType'];
  public state: InteractiveObject['state'];
  public pickupItem?: InteractiveObject['pickupItem'];
  public idleMessage?: string;
  public usedMessage?: string;
  public firstUseOutcome?: InteractiveObject['firstUseOutcome'];
  public capabilities?: InteractiveObject['capabilities'];
  public itemUseRules?: InteractiveObject['itemUseRules'];

  protected constructor(init: WorldObjectInit) {
    super(init);
    this.objectType = init.objectType;
    this.interactionType = init.interactionType;
    this.state = init.state;
    this.pickupItem = init.pickupItem;
    this.idleMessage = init.idleMessage;
    this.usedMessage = init.usedMessage;
    this.firstUseOutcome = init.firstUseOutcome;
    this.capabilities = init.capabilities;
    this.itemUseRules = init.itemUseRules;
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
