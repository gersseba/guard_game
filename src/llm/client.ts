export interface LlmPrompt {
  actorId: string;
  context: string;
  playerMessage: string;
  conversationHistory: LlmConversationMessage[];
}

export interface LlmConversationMessage {
  role: 'player' | 'assistant';
  text: string;
}

export interface LlmResponse {
  text: string;
  outcome?: {
    giveItem?: string;
    takeItem?: string;
  };
}

export interface LlmClient {
  complete(prompt: LlmPrompt): Promise<LlmResponse>;
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

const extractGeminiText = (payload: unknown): string | null => {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }

  const candidates = (payload as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }

  const firstCandidate = candidates[0] as { content?: { parts?: Array<{ text?: unknown }> } };
  const parts = firstCandidate.content?.parts;
  if (!Array.isArray(parts)) {
    return null;
  }

  const text = parts
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim();

  return text.length > 0 ? text : null;
};

export const createGeminiLlmClient = (options: GeminiLlmClientOptions = {}): LlmClient => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const apiKey = options.apiKey ?? import.meta.env.VITE_GEMINI_API_KEY;
  const model = options.model ?? DEFAULT_GEMINI_MODEL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    complete: async (prompt: LlmPrompt): Promise<LlmResponse> => {
      if (!apiKey) {
        return { text: MISSING_API_KEY_FALLBACK_TEXT };
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
            body: JSON.stringify({
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
            }),
            signal: abortController.signal,
          },
        );

        if (!response.ok) {
          return { text: REQUEST_FAILURE_FALLBACK_TEXT };
        }

        const payload = (await response.json()) as unknown;
        const text = extractGeminiText(payload);
        if (!text) {
          return { text: REQUEST_FAILURE_FALLBACK_TEXT };
        }

        return { text };
      } catch {
        return { text: REQUEST_FAILURE_FALLBACK_TEXT };
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
