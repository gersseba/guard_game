import type { InteractiveObject } from '../../types';
import { WorldObject, type WorldObjectInteractionRequest, type WorldObjectInteractionResult } from './WorldObject';

export class InertObject extends WorldObject {
  public constructor(interactiveObject: InteractiveObject) {
    super({
      id: interactiveObject.id,
      position: interactiveObject.position,
      displayName: interactiveObject.displayName,
      interactionType: interactiveObject.interactionType,
      state: interactiveObject.state,
      pickupItem: interactiveObject.pickupItem,
      idleMessage: interactiveObject.idleMessage,
      usedMessage: interactiveObject.usedMessage,
      firstUseOutcome: interactiveObject.firstUseOutcome,
      capabilities: interactiveObject.capabilities,
      itemUseRules: interactiveObject.itemUseRules,
      spriteAssetPath: interactiveObject.spriteAssetPath,
      spriteSet: interactiveObject.spriteSet,
      traits: interactiveObject.traits,
      facts: interactiveObject.facts,
      objectType: interactiveObject.objectType,
    });
  }

  public interact(request: WorldObjectInteractionRequest): WorldObjectInteractionResult {
    return {
      responseText: `${request.interactiveObject.displayName} cannot be interacted with.`,
      updatedWorldState: request.worldState,
    };
  }
}
