# Interaction Layer

The interaction layer orchestrates NPC interactions, manages conversation threads, and interfaces with the LLM boundary.

## Responsibilities
- Listen for interaction events from the world layer
- Resolve which NPC the player is attempting to interact with
- Build interaction context (NPC state, player state, conversation history)
- Route interaction to the LLM layer if needed
- Format and display responses to the player
- Maintain conversation threads for multi-turn interactions

## Core Concepts

### InteractionRequest
Encapsulates the context needed to interact with an NPC (player, NPC, current game state, conversation thread).

### NpcThread
Maintains conversation history and context for an ongoing NPC interaction. Enables multi-turn dialogues and memory.

### InteractionResponse
Result of an NPC interaction (dialog text, state changes, suggested actions).

## Extension Pattern: Add NPC interaction logic

See [Add an Interaction](ADD_INTERACTION.md) for the full pattern.

## LLM Integration Point

When an interaction is triggered:
1. Interaction layer builds `InteractionRequest` with prompt context
2. Interaction layer calls the LLM client boundary with the request
3. LLM layer returns `InteractionResponse`
4. Interaction layer formats the response and triggers any side effects

See [LLM Layer](LLM_LAYER.md) for the boundary contract.

---

*Detailed NPC thread management and prompt generation patterns will be documented as interaction features are implemented.*
