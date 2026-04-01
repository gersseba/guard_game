# LLM Layer

The LLM layer provides the API boundary for model calls and deterministic fallback behavior when API execution fails.

## Responsibilities
- Provide `LlmClient` with a single `complete(request)` method
- Accept structured request payloads from interaction services
- Invoke external chat-completion APIs when configured
- Return normalized text responses to the interaction layer
- Return deterministic fallback text when configuration or network calls fail

## Core Interface

Defined in `src/llm/client.ts`.

### LlmClient
- Method: `complete(request: LlmRequest): Promise<LlmResponse>`
- Response shape: `{ text: string }`

### LlmRequest
Current request payload fields:
- `actorId: string`
- `context: string`
- `playerMessage: string`
- `conversationHistory: ConversationMessage[]`

The interaction layer is responsible for building `context` and maintaining conversation history.

## NPC Prompt Context Flow

For NPC conversational turns:
1. `createNpcInteractionService()` in `src/interaction/npcInteraction.ts` builds context with `buildNpcPromptContext(npc, player, worldState)`.
2. The service passes actor id, context, player message, and history into `llmClient.complete(...)`.
3. The LLM response text is appended to actor-scoped history.

`buildNpcPromptContext()` includes:
- shared profile information (`npcProfile`) resolved from `npcType`
- per-instance NPC data (`npcInstance`) from world state
- actor-type world context (`typeWorldKnowledge`) when a builder resolves for the `npcType`

## Deterministic Fallbacks

`src/llm/client.ts` exports deterministic fallback constants:
- `MISSING_API_KEY_FALLBACK_TEXT`
- `REQUEST_FAILURE_FALLBACK_TEXT`

When API key configuration is missing or request execution fails, `complete()` returns fallback text rather than throwing. This keeps interaction flows stable and serializable.

NPC interaction also guards its call site by mapping thrown completion errors to `REQUEST_FAILURE_FALLBACK_TEXT` before appending the assistant turn.

## Constraints and Guidelines

- LLM layer does not mutate world state directly
- LLM calls are asynchronous; world updates occur in interaction services when promises resolve
- Prompt context remains JSON-serializable
- Deterministic fallback behavior is required for predictable tests and runtime behavior

## Tests

- `src/llm/client.test.ts`: API request mapping and fallback behavior
- `src/interaction/npcInteraction.test.ts`: NPC LLM request payload and conversation history updates
- `src/interaction/npcPromptContext.test.ts`: prompt profile resolution and deterministic context serialization
