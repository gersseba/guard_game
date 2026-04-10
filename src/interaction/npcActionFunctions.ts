import type { Npc } from '../world/types';

export type NpcActionName = 'end_chat' | 'move' | 'interact' | 'use_item';

export interface EndChatActionArguments {
  reason?: string;
}

export interface MoveActionArguments {
  x: number;
  y: number;
}

export interface InteractActionArguments {
  targetId: string;
}

export interface UseItemActionArguments {
  itemId: string;
  targetId?: string;
}

export type NpcActionCall =
  | { name: 'end_chat'; arguments: EndChatActionArguments }
  | { name: 'move'; arguments: MoveActionArguments }
  | { name: 'interact'; arguments: InteractActionArguments }
  | { name: 'use_item'; arguments: UseItemActionArguments };

export interface JsonSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface NpcFunctionDefinition {
  name: NpcActionName;
  description: string;
  parameters: JsonSchema;
}

const BASE_NPC_FUNCTION_DEFINITIONS: ReadonlyArray<NpcFunctionDefinition> = [
  {
    name: 'end_chat',
    description: 'End the current conversation with the player.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Optional short reason for ending the conversation.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'move',
    description: 'Move the NPC to a target grid tile.',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'Target x grid coordinate.' },
        y: { type: 'number', description: 'Target y grid coordinate.' },
      },
      required: ['x', 'y'],
      additionalProperties: false,
    },
  },
  {
    name: 'interact',
    description: 'Interact with a target entity by id.',
    parameters: {
      type: 'object',
      properties: {
        targetId: { type: 'string', description: 'ID of the target entity to interact with.' },
      },
      required: ['targetId'],
      additionalProperties: false,
    },
  },
  {
    name: 'use_item',
    description: 'Use an inventory item, optionally on a specific target.',
    parameters: {
      type: 'object',
      properties: {
        itemId: { type: 'string', description: 'ID of the item to use.' },
        targetId: { type: 'string', description: 'Optional target entity id.' },
      },
      required: ['itemId'],
      additionalProperties: false,
    },
  },
] as const;

const NpcFunctionCapabilityFacts: Readonly<Record<NpcActionName, string>> = {
  end_chat: 'canEndChat',
  move: 'canMove',
  interact: 'canInteract',
  use_item: 'canUseItem',
};

const isFunctionEnabledForNpc = (npc: Npc, functionName: NpcActionName): boolean => {
  const factKey = NpcFunctionCapabilityFacts[functionName];
  const factValue = npc.facts?.[factKey];
  if (typeof factValue === 'boolean') {
    return factValue;
  }

  return true;
};

const dedupeByFunctionName = (
  definitions: ReadonlyArray<NpcFunctionDefinition>,
): NpcFunctionDefinition[] => {
  const byName = new Map<NpcActionName, NpcFunctionDefinition>();
  for (const definition of definitions) {
    byName.set(definition.name, definition);
  }

  return [...byName.values()];
};

export interface NpcFunctionRegistry {
  resolveFunctions(npc: Npc): NpcFunctionDefinition[];
}

export interface NpcFunctionRegistryOptions {
  additionalByNpcType?: Readonly<Record<string, ReadonlyArray<NpcFunctionDefinition>>>;
}

export const createNpcFunctionRegistry = (
  options: NpcFunctionRegistryOptions = {},
): NpcFunctionRegistry => {
  return {
    resolveFunctions(npc: Npc): NpcFunctionDefinition[] {
      const additional = options.additionalByNpcType?.[npc.npcType] ?? [];
      const merged = dedupeByFunctionName([...BASE_NPC_FUNCTION_DEFINITIONS, ...additional]);

      return merged.filter((definition) => isFunctionEnabledForNpc(npc, definition.name));
    },
  };
};

export const createDefaultNpcFunctionRegistry = (): NpcFunctionRegistry => {
  return createNpcFunctionRegistry();
};
