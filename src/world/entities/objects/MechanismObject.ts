import type { InteractiveObject } from '../../types';
import { WorldObject, type WorldObjectInteractionRequest, type WorldObjectInteractionResult } from './WorldObject';

export class MechanismObject extends WorldObject {
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
    const responseText = wasUsed
      ? request.interactiveObject.usedMessage ?? `${request.interactiveObject.displayName} is already activated.`
      : request.interactiveObject.usedMessage ??
        `You activate the ${request.interactiveObject.displayName}.`;

    const updatedObject: InteractiveObject = {
      ...request.interactiveObject,
      state: 'used',
    };

    const updatedWorldState = {
      ...request.worldState,
      interactiveObjects: this.replaceInteractiveObjectInWorld(request.worldState, updatedObject),
      levelOutcome: this.resolveFirstUseOutcome(request.worldState, request.interactiveObject, wasUsed),
    };

    return {
      responseText,
      updatedWorldState,
    };
  }
}
