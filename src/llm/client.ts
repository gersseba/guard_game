export interface LlmPrompt {
  actorId: string;
  context: string;
  playerMessage: string;
}

export interface LlmResponse {
  text: string;
}

export interface LlmClient {
  complete(prompt: LlmPrompt): Promise<LlmResponse>;
}

export const createStubLlmClient = (): LlmClient => {
  return {
    complete: async () => ({
      text: 'LLM integration pending.',
    }),
  };
};
