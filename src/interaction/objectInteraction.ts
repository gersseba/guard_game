import type { InteractiveObject, Player, WorldState } from '../world/types';

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

type InteractiveObjectTypeHandler = (
	request: InteractiveObjectInteractionRequest,
) => InteractiveObjectInteractionResult;

const replaceInteractiveObjectInWorld = (
	worldState: WorldState,
	updatedObject: InteractiveObject,
): InteractiveObject[] =>
	worldState.interactiveObjects.map((interactiveObject) =>
		interactiveObject.id === updatedObject.id ? updatedObject : interactiveObject,
	);

const handleSupplyCrateInteraction: InteractiveObjectTypeHandler = (
	request,
): InteractiveObjectInteractionResult => {
	const wasUsed = request.interactiveObject.state === 'used';
	const responseText = wasUsed
		? request.interactiveObject.usedMessage ?? `${request.interactiveObject.displayName} is already open.`
		: request.interactiveObject.idleMessage ??
			`You inspect ${request.interactiveObject.displayName}.`;

	const updatedObject: InteractiveObject = {
		...request.interactiveObject,
		state: 'used',
	};

	const nextLevelOutcome =
		request.worldState.levelOutcome ??
		(!wasUsed ? (request.interactiveObject.firstUseOutcome ?? null) : null);

	const updatedWorldState: WorldState = {
		...request.worldState,
		interactiveObjects: replaceInteractiveObjectInWorld(request.worldState, updatedObject),
		levelOutcome: nextLevelOutcome,
	};

	return {
		objectId: request.interactiveObject.id,
		responseText,
		updatedWorldState,
	};
};

const OBJECT_TYPE_HANDLERS: Record<InteractiveObject['objectType'], InteractiveObjectTypeHandler> = {
	'supply-crate': handleSupplyCrateInteraction,
};

export const handleInteractiveObjectInteraction = (
	request: InteractiveObjectInteractionRequest,
): InteractiveObjectInteractionResult => {
	const objectTypeHandler = OBJECT_TYPE_HANDLERS[request.interactiveObject.objectType];
	return objectTypeHandler(request);
};
