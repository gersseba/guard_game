import type { WorldState } from '../world/types';
import type {
  ConversationalTarget,
  ConversationalTargetResolver,
} from './interactionDispatcherTypes';

export const createConversationalTargetResolvers = (): ConversationalTargetResolver[] => [
  (worldState: WorldState, targetId: string) => {
    const guard = worldState.guards.find((candidate) => candidate.id === targetId);
    if (!guard) {
      return null;
    }

    return {
      kind: 'guard',
      target: guard,
    };
  },
  (worldState: WorldState, targetId: string) => {
    const npc = worldState.npcs.find((candidate) => candidate.id === targetId);
    if (!npc) {
      return null;
    }

    return {
      kind: 'npc',
      target: npc,
    };
  },
];

export const createConversationalTargetResolver = (
  resolvers: ConversationalTargetResolver[] = createConversationalTargetResolvers(),
): ConversationalTargetResolver => {
  return (worldState: WorldState, targetId: string): ConversationalTarget | null => {
    for (const resolveTarget of resolvers) {
      const target = resolveTarget(worldState, targetId);
      if (target) {
        return target;
      }
    }

    return null;
  };
};