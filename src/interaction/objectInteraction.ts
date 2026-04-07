import type { InteractiveObject, Player, WorldState } from '../world/types';
import { mapInteractiveObjectDtoToRuntime } from '../world/entities/dtoRuntimeSeams';

export interface InteractiveObjectInteractionRequest {
	interactiveObject: InteractiveObject;
	player: Player;
	worldState: WorldState;
}

export interface InteractiveObjectInteractionResult {
	objectId: string;
	responseText: string;
	updatedWorldState: WorldState;
}

export const handleObjectInteraction = (
	request: InteractiveObjectInteractionRequest,
): InteractiveObjectInteractionResult => {
	const worldObject = mapInteractiveObjectDtoToRuntime(request.interactiveObject);

	if (worldObject !== null) {
		const result = worldObject.interact(request);
		return {
			objectId: request.interactiveObject.id,
			responseText: result.responseText,
			updatedWorldState: result.updatedWorldState,
		};
	}

	// No recognized capabilities: inert object
	return {
		objectId: request.interactiveObject.id,
		responseText: `${request.interactiveObject.displayName} cannot be interacted with.`,
		updatedWorldState: request.worldState,
	};
};

/**
 * Deprecated: use handleObjectInteraction instead.
 * Kept for temporary backward compatibility.
 */
export const handleInteractiveObjectInteraction = (
	request: InteractiveObjectInteractionRequest,
): InteractiveObjectInteractionResult => {
	return handleObjectInteraction(request);
};
