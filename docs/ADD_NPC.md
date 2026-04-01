# Add an NPC

This pattern describes how to introduce a new NPC to Guard Game.

## Overview

NPCs are actors with a type and position. Their conversation thread is stored in the shared actor-scoped history map keyed by actor id.

For LLM prompts, NPC behavior is now driven by `npcType` through the profile registry in `src/interaction/npcPromptContext.ts`.
- Shared prompt policy comes from the resolved profile for the normalized `npcType`
- Per-instance details (name/position/dialogueContextKey) come from the specific NPC entry

## Steps

### 1. Define the NPC in a Level File
Add the NPC to the `npcs` array in `public/levels/*.json`:

```json
{
  "npcs": [
    {
      "id": "archivist-1",
      "displayName": "The Archivist",
      "x": 8,
      "y": 5,
      "npcType": "archive_keeper"
    }
  ]
}
```

Required fields:
- `id`: unique identifier for the NPC
- `displayName`: display name shown in the UI
- `x`, `y`: grid coordinates
- `npcType`: string categorizing the NPC role (for prompt profile lookup)

Deserialization behavior:
- `deserializeLevel()` maps level JSON entries to runtime `Npc` objects
- `dialogueContextKey` is derived as `npc_${npcType.toLowerCase()}`

At runtime, the NPC's conversation history is read and written through `actorConversationHistoryByActorId[npc.id]`.

### 2. Handle Rendering (if needed)
NPCs are rendered in `src/render/scene.ts`. Custom rendering can branch on `npcType`, but this is optional and independent from prompt profile behavior.

### 3. Configure Prompt Profile Behavior
Prompt persona/policy is resolved by `resolveNpcPromptProfile(npc.npcType)` in `src/interaction/npcPromptContext.ts`.

How it works:
- `npcType` is normalized to lowercase and trimmed
- if present in `ACTOR_PROMPT_PROFILE_REGISTRY`, that profile is used
- `NPC_PROMPT_PROFILE_REGISTRY` remains a legacy alias to the same shared registry
- otherwise the deterministic `DEFAULT_NPC_PROMPT_PROFILE` is used
- fallback sets `profileKey` to `default`

To introduce a new NPC type with custom prompt behavior, add a registry entry:

```typescript
export const ACTOR_PROMPT_PROFILE_REGISTRY: Record<string, ActorPromptProfile> = {
  archive_keeper: { ... },
  engineer: {
    personaContract: 'You are a practical engineer focused on mechanisms and routes.',
    knowledgePolicy: 'Discuss machinery and access points only when supported by context.',
    responseStyleConstraints: 'Respond directly with a pragmatic tone.',
  },
};
```

If no registry entry exists for the NPC's type, behavior remains valid via default fallback.

**World knowledge builders are separate from prompt profiles.** If the new NPC type needs type-specific world facts in its prompt context (e.g., knowledge of other nearby actors), add a builder entry to `ACTOR_TYPE_WORLD_KNOWLEDGE_BUILDERS` in `src/interaction/npcPromptContext.ts`. If the new type should share world knowledge with an existing type, add an alias entry to `ACTOR_WORLD_KNOWLEDGE_BUILDER_ALIASES` instead (e.g., `new_type: 'villager'`). NPC types without a builder or alias receive no `typeWorldKnowledge` in their prompt context, which is valid default behavior.

### 4. Understand Prompt Context Construction
`buildNpcPromptContext(npc, player, worldState)` returns deterministic JSON with this shape:

```json
{
  "actor": { "id": "archivist-1", "npcType": "archive_keeper" },
  "npcProfile": {
    "profileKey": "archive_keeper",
    "requestedNpcType": "archive_keeper",
    "personaContract": "...",
    "knowledgePolicy": "...",
    "responseStyleConstraints": "..."
  },
  "npcInstance": {
    "displayName": "The Archivist",
    "position": { "x": 8, "y": 5 },
    "dialogueContextKey": "npc_archive_keeper"
  },
  "typeWorldKnowledge": {
    "player": { "id": "player", "position": { "x": 1, "y": 1 } },
    "otherVillagers": []
  },
  "player": { "id": "player", "displayName": "Player" }
}
```

`typeWorldKnowledge` is present here because `archive_keeper` is aliased to the `villager` builder via `ACTOR_WORLD_KNOWLEDGE_BUILDER_ALIASES`. The `villager` builder provides a `{ player, otherVillagers[] }` payload, excluding the requesting actor from `otherVillagers`.

This keeps shared type-level prompt behavior (`npcProfile`) separate from per-instance fields (`npcInstance`) and type-scoped world context (`typeWorldKnowledge`).

### 5. Add Tests
Cover both world loading and prompt resolution behavior:
- `src/world/level.test.ts`: NPC deserialization and derived `dialogueContextKey`
- `src/interaction/npcPromptContext.test.ts`: same-type reuse, cross-type differentiation, deterministic fallback, and deterministic serialized context
- `src/interaction/npcInteraction.test.ts`: context passed to LLM includes expected actor/profile/instance/typeWorldKnowledge/player sections

## Checklist

- [ ] NPC added to level JSON (`public/levels/*.json`) with `id`, `displayName`, `x`, `y`, `npcType`
- [ ] `npcType` follows registry naming style (normalized lowercase tokens such as `archive_keeper`)
- [ ] Prompt profile entry added to `ACTOR_PROMPT_PROFILE_REGISTRY` when custom behavior is required
- [ ] Fallback behavior is acceptable if no custom profile entry is added
- [ ] World knowledge builder added to `ACTOR_TYPE_WORLD_KNOWLEDGE_BUILDERS`, or alias added to `ACTOR_WORLD_KNOWLEDGE_BUILDER_ALIASES`, when type-specific world context is required; omitting both is valid when no world context is needed
- [ ] Tests cover profile resolution and prompt context serialization (`src/interaction/npcPromptContext.test.ts`)
- [ ] Level passes `validateLevelData()` and `deserializeLevel()` without errors
- [ ] NPC position does not overlap with other entities (validated by `validateSpatialLayout()`)

---

See [WORLD_LAYER.md](WORLD_LAYER.md), [TYPES_REFERENCE.md](TYPES_REFERENCE.md), and [INTERACTION_LAYER.md](INTERACTION_LAYER.md) for more context.
