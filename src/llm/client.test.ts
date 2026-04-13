import { describe, expect, it, vi } from 'vitest';
import {
  createGeminiLlmClient,
  isLlmRequestError,
} from './client';
import { createDefaultNpcFunctionRegistry } from '../interaction/npcActionFunctions';

const prompt = {
  actorId: 'npc-1',
  context: 'npc:npc-1|npcName:Archivist',
  playerMessage: 'Hello there',
  conversationHistory: [{ role: 'player' as const, text: 'Hello there' }],
};

describe('createGeminiLlmClient', () => {
  it('returns model text on successful Gemini response', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'Welcome, traveler.' }],
            },
          },
        ],
      }),
    }));

    const client = createGeminiLlmClient({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await client.complete(prompt);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(response).toEqual({ text: 'Welcome, traveler.' });
  });

  it('returns one normalized function call when Gemini responds with a single tool call', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: 'move',
                    args: { x: 5, y: 2 },
                  },
                },
              ],
            },
          },
        ],
      }),
    }));

    const client = createGeminiLlmClient({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await client.complete(prompt);

    expect(response).toEqual({
      actions: [
        {
          name: 'move',
          arguments: { x: 5, y: 2 },
        },
      ],
    });
  });

  it('preserves multiple function calls in Gemini part order', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: 'interact',
                    args: { targetId: 'lever-1' },
                  },
                },
                {
                  functionCall: {
                    name: 'end_chat',
                    args: { reason: 'interaction complete' },
                  },
                },
              ],
            },
          },
        ],
      }),
    }));

    const client = createGeminiLlmClient({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await client.complete(prompt);

    expect(response).toEqual({
      actions: [
        {
          name: 'interact',
          arguments: { targetId: 'lever-1' },
        },
        {
          name: 'end_chat',
          arguments: { reason: 'interaction complete' },
        },
      ],
    });
  });

  it('returns mixed text and normalized function calls from Gemini parts', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                { text: 'I can open the way. ' },
                {
                  functionCall: {
                    name: 'use_item',
                    args: { itemId: 'seal-key', targetId: 'gate-1' },
                  },
                },
                { text: 'Stand back.' },
              ],
            },
          },
        ],
      }),
    }));

    const client = createGeminiLlmClient({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await client.complete(prompt);

    expect(response).toEqual({
      text: 'I can open the way. Stand back.',
      actions: [
        {
          name: 'use_item',
          arguments: { itemId: 'seal-key', targetId: 'gate-1' },
        },
      ],
    });
  });

  it('maps production structured text payload outcome into LlmResponse.outcome', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    responseText: 'The exchange is done.',
                    outcome: {
                      takeItem: 'seal-token',
                      giveItem: 'archive-pass',
                    },
                  }),
                },
              ],
            },
          },
        ],
      }),
    }));

    const client = createGeminiLlmClient({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await client.complete(prompt);

    expect(response).toEqual({
      text: 'The exchange is done.',
      outcome: {
        takeItem: 'seal-token',
        giveItem: 'archive-pass',
      },
    });
  });

  it('does not infer outcome when production payload is plain text only', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'No consequence attached.' }],
            },
          },
        ],
      }),
    }));

    const client = createGeminiLlmClient({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await client.complete(prompt);

    expect(response).toEqual({ text: 'No consequence attached.' });
  });

  it('marks malformed structured payloads with deterministic invalid outcome marker', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"responseText":"Offer accepted","outcome":',
                },
              ],
            },
          },
        ],
      }),
    }));

    const client = createGeminiLlmClient({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await client.complete(prompt);

    expect(response).toEqual({
      outcome: {
        questProgressEvent: '__malformed_outcome_payload__',
      },
    });
  });

  it('returns deterministic structured error for malformed function payloads', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: 'move',
                    args: { x: 'east', y: 2 },
                  },
                },
              ],
            },
          },
        ],
      }),
    }));

    const client = createGeminiLlmClient({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await client.complete(prompt);

    expect(isLlmRequestError(response)).toBe(true);
    if (isLlmRequestError(response)) {
      expect(response).toEqual({
        kind: 'llm_request_error',
        message: 'Malformed function call payload from LLM.',
      });
    }
  });

  it('includes Gemini tool declarations when available functions are supplied', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'Acknowledged.' }],
            },
          },
        ],
      }),
    }));

    const client = createGeminiLlmClient({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const availableFunctions = createDefaultNpcFunctionRegistry().resolveFunctions({
      id: 'npc-1',
      displayName: 'Archivist',
      position: { x: 1, y: 1 },
      npcType: 'archivist',
      dialogueContextKey: 'archivist_default',
    });

    await client.complete({
      ...prompt,
      availableFunctions,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const firstCall = fetchImpl.mock.calls.at(0) as unknown[] | undefined;
    expect(firstCall).toBeDefined();
    const requestInitCandidate = firstCall && firstCall.length > 1 ? firstCall[1] : {};
    const requestInit =
      typeof requestInitCandidate === 'object' && requestInitCandidate !== null
        ? (requestInitCandidate as { body?: unknown })
        : {};
    const requestBody = JSON.parse(String(requestInit.body)) as {
      tools?: Array<{ functionDeclarations?: Array<{ name: string }> }>;
      toolConfig?: { functionCallingConfig?: { mode?: string } };
    };

    expect(requestBody.toolConfig).toEqual({
      functionCallingConfig: {
        mode: 'AUTO',
      },
    });
    expect(requestBody.tools?.[0]?.functionDeclarations?.map((definition) => definition.name)).toEqual([
      'end_chat',
      'move',
      'interact',
      'use_item',
    ]);
  });

  it('returns deterministic fallback when API key is missing', async () => {
    const fetchImpl = vi.fn();
    const client = createGeminiLlmClient({
      apiKey: '',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await client.complete(prompt);

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(isLlmRequestError(response)).toBe(true);
    if (isLlmRequestError(response)) {
      expect(response.kind).toBe('llm_request_error');
      expect(typeof response.message).toBe('string');
      expect(response.statusCode).toBeUndefined();
    }
  });

  it('returns structured error when request returns non-ok status', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    }));

    const client = createGeminiLlmClient({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await client.complete(prompt);

    expect(isLlmRequestError(response)).toBe(true);
    if (isLlmRequestError(response)) {
      expect(response.kind).toBe('llm_request_error');
      expect(response.statusCode).toBe(503);
    }
  });

  it('returns structured error when fetch throws (network failure)', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down');
    });

    const client = createGeminiLlmClient({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await client.complete(prompt);

    expect(isLlmRequestError(response)).toBe(true);
    if (isLlmRequestError(response)) {
      expect(response.kind).toBe('llm_request_error');
      expect(response.statusCode).toBeUndefined();
    }
  });

  it('does not append assistant fallback text on failure (no text property on error)', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    }));

    const client = createGeminiLlmClient({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await client.complete(prompt);

    expect('text' in response).toBe(false);
  });
});
