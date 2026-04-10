import type { Door, Player } from '../world/types';

export interface DoorInteractionRequest {
  door: Door;
  player: Player;
}

export interface DoorInteractionResult {
  doorId: string;
  responseText: string;
  levelOutcome?: 'win' | 'lose';
}

const getDoorStateResponse = (door: Door): string => {
  if (door.isOpen) {
    return 'The door is open.';
  }

  if (door.isLocked) {
    return 'The door is locked.';
  }

  return 'The door is closed.';
};

export const handleDoorInteraction = (request: DoorInteractionRequest): DoorInteractionResult => {
  const baseResult: DoorInteractionResult = {
    doorId: request.door.id,
    responseText: getDoorStateResponse(request.door),
  };

  if (request.door.isSafe !== undefined) {
    baseResult.levelOutcome = request.door.isSafe ? 'win' : 'lose';
  }

  return baseResult;
};
