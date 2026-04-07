import type { SpriteDirection } from '../../types';
import { Entity, type EntityInit } from './Entity';

export interface ActorInit extends EntityInit {
  facingDirection?: SpriteDirection;
}

export class Actor extends Entity {
  public facingDirection?: SpriteDirection;

  public constructor(init: ActorInit) {
    super(init);
    this.facingDirection = init.facingDirection;
  }
}
