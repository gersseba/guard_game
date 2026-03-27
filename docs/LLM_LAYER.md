# LLM Layer

The LLM layer provides the integration boundary for large language model calls. It defines stubs, manages context generation, and serializes game state for prompt construction.

## Responsibilities
- Provide `LlmClient` interface with clear method signatures
- Serialize world state and interaction context to JSON
- Build prompts with relevant game context (actor persona, player state, conversation thread)
- Return structured LLM responses (dialog text, suggested actions)
- Maintain clean separation: LLM reasoning happens outside core game loop
- Support optional LLM integration (game functions without LLM)

## Core Concepts

### LlmClient
Interface that defines how the game communicates with LLM systems. Implemented as stubs initially; can be extended with real API calls.

### Context Serialization
Convert world state and interaction data to JSON suitable for LLM prompts. All data must be clear and semantic.

### Response Parsing
Parse LLM output into structured `InteractionResponse` objects.

## LLM Integration Pattern

LLM calls are initiated by the interaction layer:
1. Interaction layer builds `InteractionRequest` (target actor, player state, conversation thread)
2. Interaction layer calls `llmClient.generateResponse(request)`
3. LLM client serializes context and formats prompt
4. LLM client calls external API (stubbed initially)
5. LLM client parses and returns `InteractionResponse`
6. Interaction layer applies response (dialog, state changes)

## Constraints and Guidelines

- LLM layer does NOT modify world state directly. It returns responses; the interaction layer applies them.
- LLM calls are asynchronous. The game loop must continue while LLM calls are pending.
- All game state in prompts must be JSON-serializable.
- LLM layer stubs allow the game to function without real LLM integration.

---

*Detailed context generation patterns and API client implementation will be documented as LLM features are integrated.*
