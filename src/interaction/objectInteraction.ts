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

const replaceInteractiveObjectInWorld = (
	worldState: WorldState,
	updatedObject: InteractiveObject,
): InteractiveObject[] =>
	worldState.interactiveObjects.map((interactiveObject) =>
		interactiveObject.id === updatedObject.id ? updatedObject : interactiveObject,
	);

/**
 * Handles container interaction: reveals items from object.
 * Triggered when object has capabilities.containsItems = true.
 */
const handleContainerInteraction = (
	request: InteractiveObjectInteractionRequest,
): InteractiveObjectInteractionResult => {
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

	const nextLevelOutcome =
		request.worldState.levelOutcome ??
		(!wasUsed ? (request.interactiveObject.firstUseOutcome ?? null) : null);

	const nextInventoryItems = canPickup
		? [
				...inventoryItems,
				{
					itemId: pickupItem.itemId,
					displayName: pickupItem.displayName,
					sourceObjectId: request.interactiveObject.id,
					pickedUpAtTick: request.worldState.tick,
				},
			]
		: inventoryItems;

	const updatedWorldState: WorldState = {
		...request.worldState,
		player: {
			...request.worldState.player,
			inventory: {
				items: nextInventoryItems,
			},
		},
		interactiveObjects: replaceInteractiveObjectInWorld(request.worldState, updatedObject),
		levelOutcome: nextLevelOutcome,
	};

	return {
		objectId: request.interactiveObject.id,
		responseText,
		updatedWorldState,
	};
};

/**
 * Handles activatable object interaction: triggers an effect (e.g., mechanism activation).
 * Triggered when object has capabilities.isActivatable = true.
 */
const handleActivationInteraction = (
	request: InteractiveObjectInteractionRequest,
): InteractiveObjectInteractionResult => {
	const responseText =
		request.interactiveObject.usedMessage ??
		`You activate the ${request.interactiveObject.displayName}.`;

	const updatedObject: InteractiveObject = {
		...request.interactiveObject,
		state: 'used',
	};

	const nextLevelOutcome =
		request.worldState.levelOutcome ?? request.interactiveObject.firstUseOutcome ?? null;

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

/**
 * Main dispatcher: routes object interaction based on declared capabilities.
 * Checks capabilities flags in order and applies the matching handler.
 */
export const handleObjectInteraction = (
	request: InteractiveObjectInteractionRequest,
): InteractiveObjectInteractionResult => {
	const { capabilities } = request.interactiveObject;

	// Check for container capability first
	if (capabilities?.containsItems) {
		return handleContainerInteraction(request);
	}

	// Check for activation capability
	if (capabilities?.isActivatable) {
		return handleActivationInteraction(request);
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
