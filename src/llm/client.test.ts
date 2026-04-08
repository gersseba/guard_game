import { describe, expect, it, vi } from 'vitest';
import {
  createGeminiLlmClient,
  isLlmRequestError,
} from './client';

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
