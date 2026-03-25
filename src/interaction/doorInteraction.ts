import type { Door, Player } from '../world/types';

export interface DoorInteractionRequest {
  door: Door;
  player: Player;
}

export interface DoorInteractionResult {
  doorId: string;
  responseText: string;
}

const DOOR_STATE_RESPONSES: Record<Door['doorState'], string> = {
  open: 'The door is open.',
  closed: 'The door is closed.',
  locked: 'The door is locked.',
};

export const handleDoorInteraction = (request: DoorInteractionRequest): DoorInteractionResult => ({
  doorId: request.door.id,
  responseText: DOOR_STATE_RESPONSES[request.door.doorState],
});
