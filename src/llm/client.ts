import type { NpcActionCall, NpcFunctionDefinition } from '../interaction/npcActionFunctions';

export interface LlmPrompt {
  actorId: string;
  context: string;
  playerMessage: string;
  conversationHistory: LlmConversationMessage[];
  availableFunctions?: ReadonlyArray<NpcFunctionDefinition>;
}

export interface LlmConversationMessage {
  role: 'player' | 'assistant';
  text: string;
}

export interface LlmResponse {
  text?: string;
  actions?: NpcActionCall[];
  outcome?: {
    giveItem?: string;
    takeItem?: string;
    requireKnowledgeTokens?: string[];
    grantKnowledgeTokens?: string[];
    questProgressEvent?: unknown;
  };
}

export interface LlmRequestError {
  kind: 'llm_request_error';
  message: string;
  statusCode?: number;
}

export const isLlmRequestError = (
  result: LlmResponse | LlmRequestError,
): result is LlmRequestError => 'kind' in result && result.kind === 'llm_request_error';

export interface LlmClient {
  complete(prompt: LlmPrompt): Promise<LlmResponse | LlmRequestError>;
}

export interface GeminiLlmClientOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const DEFAULT_TIMEOUT_MS = 20_000;

export const MISSING_API_KEY_FALLBACK_TEXT =
  'I cannot access my briefing network right now. Please try again later.';
export const REQUEST_FAILURE_FALLBACK_TEXT =
  'I cannot process that request right now. Please try again later.';

const toGeminiRole = (role: LlmConversationMessage['role']): 'user' | 'model' => {
  return role === 'player' ? 'user' : 'model';
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const hasOnlyAllowedKeys = (record: Record<string, unknown>, allowedKeys: string[]): boolean => {
  return Object.keys(record).every((key) => allowedKeys.includes(key));
};

const parseEndChatAction = (argumentsValue: unknown): NpcActionCall | null => {
  if (!isRecord(argumentsValue) || !hasOnlyAllowedKeys(argumentsValue, ['reason'])) {
    return null;
  }

  if (
    'reason' in argumentsValue &&
    argumentsValue.reason !== undefined &&
    typeof argumentsValue.reason !== 'string'
  ) {
    return null;
  }

  return {
    name: 'end_chat',
    arguments:
      typeof argumentsValue.reason === 'string' ? { reason: argumentsValue.reason } : {},
  };
};

const parseMoveAction = (argumentsValue: unknown): NpcActionCall | null => {
  if (!isRecord(argumentsValue) || !hasOnlyAllowedKeys(argumentsValue, ['x', 'y'])) {
    return null;
  }

  if (typeof argumentsValue.x !== 'number' || Number.isNaN(argumentsValue.x)) {
    return null;
  }

  if (typeof argumentsValue.y !== 'number' || Number.isNaN(argumentsValue.y)) {
    return null;
  }

  return {
    name: 'move',
    arguments: {
      x: argumentsValue.x,
      y: argumentsValue.y,
    },
  };
};

const parseInteractAction = (argumentsValue: unknown): NpcActionCall | null => {
  if (!isRecord(argumentsValue) || !hasOnlyAllowedKeys(argumentsValue, ['targetId'])) {
    return null;
  }

  if (typeof argumentsValue.targetId !== 'string') {
    return null;
  }

  return {
    name: 'interact',
    arguments: {
      targetId: argumentsValue.targetId,
    },
  };
};

const parseUseItemAction = (argumentsValue: unknown): NpcActionCall | null => {
  if (!isRecord(argumentsValue) || !hasOnlyAllowedKeys(argumentsValue, ['itemId', 'targetId'])) {
    return null;
  }

  if (typeof argumentsValue.itemId !== 'string') {
    return null;
  }

  if (
    'targetId' in argumentsValue &&
    argumentsValue.targetId !== undefined &&
    typeof argumentsValue.targetId !== 'string'
  ) {
    return null;
  }

  return {
    name: 'use_item',
    arguments: {
      itemId: argumentsValue.itemId,
      ...(typeof argumentsValue.targetId === 'string' ? { targetId: argumentsValue.targetId } : {}),
    },
  };
};

const parseNpcActionCall = (functionCall: unknown): NpcActionCall | null => {
  if (!isRecord(functionCall) || typeof functionCall.name !== 'string') {
    return null;
  }

  const argumentsValue = functionCall.args;

  switch (functionCall.name) {
    case 'end_chat':
      return parseEndChatAction(argumentsValue);
    case 'move':
      return parseMoveAction(argumentsValue);
    case 'interact':
      return parseInteractAction(argumentsValue);
    case 'use_item':
      return parseUseItemAction(argumentsValue);
    default:
      return null;
  }
};

const toGeminiFunctionDeclaration = (
  definition: NpcFunctionDefinition,
): {
  name: string;
  description: string;
  parameters: NpcFunctionDefinition['parameters'];
} => {
  return {
    name: definition.name,
    description: definition.description,
    parameters: definition.parameters,
  };
};

const buildGeminiRequestBody = (prompt: LlmPrompt): Record<string, unknown> => {
  const body: Record<string, unknown> = {
    systemInstruction: {
      parts: [{ text: `actorId:${prompt.actorId}|context:${prompt.context}` }],
    },
    contents: prompt.conversationHistory.map((message) => ({
      role: toGeminiRole(message.role),
      parts: [{ text: message.text }],
    })),
    generationConfig: {
      temperature: 0,
    },
  };

  if (prompt.availableFunctions && prompt.availableFunctions.length > 0) {
    body.tools = [
      {
        functionDeclarations: prompt.availableFunctions.map(toGeminiFunctionDeclaration),
      },
    ];
    body.toolConfig = {
      functionCallingConfig: {
        mode: 'AUTO',
      },
    };
  }

  return body;
};

const parseGeminiResponse = (payload: unknown): LlmResponse | LlmRequestError => {
  if (!isRecord(payload) || !Array.isArray(payload.candidates) || payload.candidates.length === 0) {
    return {
      kind: 'llm_request_error',
      message: 'Empty or unparseable response from LLM.',
    };
  }

  const firstCandidate = payload.candidates[0];
  if (!isRecord(firstCandidate) || !isRecord(firstCandidate.content)) {
    return {
      kind: 'llm_request_error',
      message: 'Empty or unparseable response from LLM.',
    };
  }

  const parts = firstCandidate.content.parts;
  if (!Array.isArray(parts)) {
    return {
      kind: 'llm_request_error',
      message: 'Empty or unparseable response from LLM.',
    };
  }

  const textParts: string[] = [];
  const actions: NpcActionCall[] = [];

  for (const part of parts) {
    if (!isRecord(part)) {
      continue;
    }

    if (typeof part.text === 'string') {
      textParts.push(part.text);
    }

    if ('functionCall' in part && part.functionCall !== undefined) {
      const action = parseNpcActionCall(part.functionCall);
      if (!action) {
        return {
          kind: 'llm_request_error',
          message: 'Malformed function call payload from LLM.',
        };
      }

      actions.push(action);
    }
  }

  const text = textParts.join('').trim();
  if (!text && actions.length === 0) {
    return {
      kind: 'llm_request_error',
      message: 'Empty or unparseable response from LLM.',
    };
  }

  return {
    ...(text ? { text } : {}),
    ...(actions.length > 0 ? { actions } : {}),
  };
};

export const createGeminiLlmClient = (options: GeminiLlmClientOptions = {}): LlmClient => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const apiKey = options.apiKey ?? import.meta.env.VITE_GEMINI_API_KEY;
  const model = options.model ?? DEFAULT_GEMINI_MODEL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    complete: async (prompt: LlmPrompt): Promise<LlmResponse | LlmRequestError> => {
      if (!apiKey) {
        return {
          kind: 'llm_request_error' as const,
          message: 'API key is not configured.',
        };
      }

      const abortController = new AbortController();
      const timeout = setTimeout(() => {
        abortController.abort();
      }, timeoutMs);

      try {
        const response = await fetchImpl(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(buildGeminiRequestBody(prompt)),
            signal: abortController.signal,
          },
        );

        if (!response.ok) {
          return {
            kind: 'llm_request_error' as const,
            message: 'LLM request failed.',
            statusCode: response.status,
          };
        }

        const payload = (await response.json()) as unknown;
        return parseGeminiResponse(payload);
      } catch {
        return {
          kind: 'llm_request_error' as const,
          message: 'Network request failed.',
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
};

export const createStubLlmClient = (): LlmClient => {
  return {
    complete: async () => ({
      text: 'LLM integration pending.',
    }),
  };
};
