import type { InteractiveObject, WorldState } from '../../types';
import { WorldObject, type WorldObjectInteractionRequest, type WorldObjectInteractionResult } from './WorldObject';

const readDoorLikeOutcome = (
  interactiveObject: InteractiveObject,
): WorldState['levelOutcome'] => {
  const factOutcome = interactiveObject.facts?.outcome;
  if (factOutcome === 'safe') {
    return 'win';
  }
  if (factOutcome === 'danger') {
    return 'lose';
  }
  return null;
};

export class DoorObject extends WorldObject {
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
      ? request.interactiveObject.usedMessage ?? `${request.interactiveObject.displayName} is already open.`
      : request.interactiveObject.idleMessage ?? `You open ${request.interactiveObject.displayName}.`;

    const updatedObject: InteractiveObject = {
      ...request.interactiveObject,
      state: 'used',
    };

    const explicitOutcome = this.resolveFirstUseOutcome(request.worldState, request.interactiveObject, wasUsed);
    const doorLikeOutcome = !wasUsed ? readDoorLikeOutcome(request.interactiveObject) : null;

    const updatedWorldState = {
      ...request.worldState,
      interactiveObjects: this.replaceInteractiveObjectInWorld(request.worldState, updatedObject),
      levelOutcome: explicitOutcome ?? doorLikeOutcome,
    };

    return {
      responseText,
      updatedWorldState,
    };
  }
}
