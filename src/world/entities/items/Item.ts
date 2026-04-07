import { Entity, type EntityInit } from '../base/Entity';

export interface ItemInit extends EntityInit {
  itemType: string;
}

export class Item extends Entity {
  public itemType: string;

  public constructor(init: ItemInit) {
    super(init);
    this.itemType = init.itemType;
  }
}
