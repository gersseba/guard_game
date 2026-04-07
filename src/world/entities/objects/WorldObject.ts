import { Entity, type EntityInit } from '../base/Entity';

export interface WorldObjectInit extends EntityInit {
  objectType: string;
}

export abstract class WorldObject extends Entity {
  public objectType: string;

  protected constructor(init: WorldObjectInit) {
    super(init);
    this.objectType = init.objectType;
  }
}
