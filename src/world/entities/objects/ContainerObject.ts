import type { InteractiveObject, InventoryItem } from '../../types';
import { Item } from '../items/Item';
import { WorldObject, type WorldObjectInteractionRequest, type WorldObjectInteractionResult } from './WorldObject';

export class ContainerObject extends WorldObject {
  public constructor(interactiveObject: InteractiveObject) {
    super({
      id: interactiveObject.id,
      position: interactiveObject.position,
      displayName: interactiveObject.displayName,
      spriteAssetPath: interactiveObject.spriteAssetPath,
      spriteSet: interactiveObject.spriteSet,
      traits: interactiveObject.traits,
      facts: interactiveObject.facts,
      objectType: interactiveObject.objectType,
    });
  }

  public interact(request: WorldObjectInteractionRequest): WorldObjectInteractionResult {
    const wasUsed = request.interactiveObject.state === 'used';
    const pickupItem = request.interactiveObject.pickupItem;
    const inventoryItems = request.worldState.player.inventory.items;
    const inventoryAlreadyContainsObjectPickup = inventoryItems.some(
      (item) => item.sourceObjectId === request.interactiveObject.id,
    );
    const canPickup = !wasUsed && pickupItem !== undefined && !inventoryAlreadyContainsObjectPickup;
    const responseText = wasUsed
      ? request.interactiveObject.usedMessage ?? `${request.interactiveObject.displayName} is already open.`
      : request.interactiveObject.idleMessage ??
        `You inspect ${request.interactiveObject.displayName}.`;

    const updatedObject: InteractiveObject = {
      ...request.interactiveObject,
      state: 'used',
    };

    const nextInventoryItems: InventoryItem[] = canPickup
      ? [
          ...inventoryItems,
          Item.fromPickup({
            pickupItem,
            sourceObjectId: request.interactiveObject.id,
            pickedUpAtTick: request.worldState.tick,
          }).toInventoryItem(),
        ]
      : inventoryItems;

    const updatedWorldState = {
      ...request.worldState,
      player: {
        ...request.worldState.player,
        inventory: {
          ...request.worldState.player.inventory,
          items: nextInventoryItems,
        },
      },
      interactiveObjects: this.replaceInteractiveObjectInWorld(request.worldState, updatedObject),
      levelOutcome: this.resolveFirstUseOutcome(request.worldState, request.interactiveObject, wasUsed),
    };

    return {
      responseText,
      updatedWorldState,
    };
  }
}
