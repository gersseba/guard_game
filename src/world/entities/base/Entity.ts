import type { GridPosition, SpriteSet } from '../../types';

export interface EntityInit {
  id: string;
  position: GridPosition;
  displayName: string;
  spriteAssetPath?: string;
  spriteSet?: SpriteSet;
  traits?: Record<string, string>;
  facts?: Record<string, string | number | boolean>;
}

export class Entity {
  public readonly id: string;
  public position: GridPosition;
  public displayName: string;
  public spriteAssetPath?: string;
  public spriteSet?: SpriteSet;
  public traits?: Record<string, string>;
  public facts?: Record<string, string | number | boolean>;

  public constructor(init: EntityInit) {
    this.id = init.id;
    this.position = { ...init.position };
    this.displayName = init.displayName;
    this.spriteAssetPath = init.spriteAssetPath;
    this.spriteSet = init.spriteSet;
    this.traits = init.traits;
    this.facts = init.facts;
  }
}
