import { describe, expect, it, vi } from 'vitest';
import {
  createGeminiLlmClient,
  MISSING_API_KEY_FALLBACK_TEXT,
  REQUEST_FAILURE_FALLBACK_TEXT,
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
    expect(response).toEqual({ text: MISSING_API_KEY_FALLBACK_TEXT });
  });

  it('returns deterministic fallback when request fails', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      json: async () => ({}),
    }));

    const client = createGeminiLlmClient({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await client.complete(prompt);

    expect(response).toEqual({ text: REQUEST_FAILURE_FALLBACK_TEXT });
  });

  it('returns deterministic fallback when fetch throws', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down');
    });

    const client = createGeminiLlmClient({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await client.complete(prompt);

    expect(response).toEqual({ text: REQUEST_FAILURE_FALLBACK_TEXT });
  });
});
