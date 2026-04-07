import { Entity, type EntityInit } from '../base/Entity';

export interface EnvironmentInit extends EntityInit {
  isBlocking: boolean;
}

export class Environment extends Entity {
  public isBlocking: boolean;

  public constructor(init: EnvironmentInit) {
    super(init);
    this.isBlocking = init.isBlocking;
  }
}
