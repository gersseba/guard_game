# Game Design Baseline

This document is the canonical, documenter-maintained baseline for game design decisions and feature-gap analysis.

Use this file to capture only current, implemented behavior.

## Runtime Status

Current playable loop:
- Runtime runs a fixed-step simulation at 100 ms ticks with a deterministic world update and render pass each frame.
- Player input is keyboard-only and command-buffered.
- Command set currently implemented:
  - move (Arrow keys or WASD)
  - interact (E)
  - select inventory slot (1-9)
  - use selected inventory item (F)
- Movement is deterministic and grid-based:
  - Player facing updates from move direction even when movement is blocked.
  - Movement is blocked by out-of-bounds positions and occupied tiles (guards, doors, NPCs, interactive objects).
- Interaction resolution is deterministic:
  - Interact only checks orthogonally adjacent targets.
  - Priority order when multiple targets are adjacent: guard, then door, then npc, then interactive object.
  - Tie-break inside same kind: lexical by target id.
- Pause and outcome gating:
  - Opening a conversational interaction pauses simulation and clears pending input.
  - While paused, commands are drained and discarded each tick.
  - While the chat modal is open, keyboard commands are suppressed.
  - If levelOutcome is set, movement commands are ignored and interaction dispatch is blocked.

Implemented objective flow:
- Level JSON now requires an objective string and level deserialization stores it as worldState.levelObjective.
- Runtime controls display the active level objective and update it on default load, level switch, and reset.
- Levels still resolve to win/lose through deterministic interaction outcomes (door outcome and optional first-use object outcome).
- Outcome overlay is shown once when levelOutcome becomes non-null.

## Feature Inventory

Implemented systems:
- World model:
  - Serializable WorldState with tick, grid, level metadata/objective, entities, conversation history, last item-use attempt event, and levelOutcome.
  - Deterministic command application and level deserialization.
  - Spatial validation at level load (in-bounds and no overlaps).
  - Deterministic selected inventory slot state in player inventory (`selectedItem`).
- Input:
  - Keyboard mapping to world commands, including inventory-slot selection and selected-item use.
  - Modal-aware command suppression.
- Interaction:
  - Adjacent-target resolver with deterministic priority and tie-break.
  - Door interaction:
    - Returns door state text.
    - Door outcome safe maps to win; danger maps to lose.
  - Interactive object interaction (supply-crate):
    - Sets object state to used.
    - Returns idle/used response text.
    - Can set levelOutcome from firstUseOutcome on first use.
  - Guard and NPC conversation pipeline:
    - First interact opens conversation context.
    - Player message turns call LLM and append actor-scoped conversation history.
  - Item-use attempt resolver boundary:
    - Runtime detects each `useSelectedItem` command in tick order.
    - Resolver emits deterministic per-command result events (`no-selection` or `no-target` currently).
    - Main loop commits latest event to `worldState.lastItemUseAttemptEvent`.
- Runtime UI wiring:
  - Level picker and reset.
  - Level objective panel in runtime controls.
  - World JSON state panel.
  - Chat modal.
  - Pause overlay and level outcome overlay.

Level roster (manifest):
- riddle (Two Guards): demonstrates truth-teller/liar guard setup, two doors with safe/danger outcomes, directional sprite sets, and explicit objective text.
- starter (Starter): demonstrates mixed entity playfield with two guards, two doors, one villager NPC, one supply crate interactive object, and explicit objective text.

## LLM Integration Boundaries

Current LLM boundary:
- LLM is only used in conversational player-message turns for guard and npc interactions.
- Initial conversation open (no player message) is deterministic and handled without LLM.
- All authoritative gameplay rules remain deterministic and code-owned:
  - Movement legality and spatial blocking
  - Interaction target resolution priority
  - Door and interactive-object outcome application
  - Pause/resume behavior
  - levelOutcome gating of further simulation interactions
- LLM output currently affects conversational text and stored conversation history only.
- LLM failures are handled with deterministic fallback text.

## Entity Knowledge Model

Design-level entity model in current implementation:
- Player:
  - Core fields: id, displayName, position, facingDirection, optional spriteAssetPath/spriteSet.
  - Prompt exposure:
    - Included in guard world payload as player id and position.
    - Included in npc prompt context as player id and displayName.
- Guard:
  - Core fields: id, displayName, position, guardState, honestyTrait, facingDirection, optional sprite fields, optional instanceKnowledge/instanceBehavior.
  - Deterministic behavior fields:
    - honestyTrait drives truth boolean in prompt context.
    - facingDirection updates from approach on initial guard interaction open.
  - Prompt model:
    - Type-level profile resolved via actor prompt profile registry (guard persona contract).
    - Type-level world knowledge builder coverage: guard builder includes player position, sorted guards with truth flags, and sorted doors with safe flags.
    - Instance-level augmentation: optional instanceKnowledge and instanceBehavior are injected when present.
- NPC:
  - Core fields: id, displayName, position, npcType, dialogueContextKey, optional sprite fields, optional instanceKnowledge/instanceBehavior.
  - Prompt model:
    - Type-level profile resolved from shared actor profile registry by npcType.
    - Type-level world knowledge builder coverage:
      - villager: includes other villagers, plus player position.
      - archive_keeper: aliased to villager world knowledge builder.
      - engineer and scholar currently have persona profiles but no dedicated world knowledge builder.
    - Instance-level augmentation: optional instanceKnowledge and instanceBehavior are injected when present.
- Door:
  - Core fields: id, displayName, position, doorState, outcome, optional sprite fields.
  - Deterministic outcome contract:
    - outcome safe maps to win.
    - outcome danger maps to lose.
- Interactive object:
  - Core fields: id, displayName, position, objectType (currently supply-crate), interactionType, state, idle/used messages, optional firstUseOutcome, optional sprite fields.
  - Deterministic outcome contract:
    - On first use, may set levelOutcome from firstUseOutcome if no existing outcome.
    - Subsequent uses keep used state and do not overwrite an existing levelOutcome.

## Known Constraints

Current constraints to design against:
- No guard or npc autonomous movement; all non-player entities are static once level is loaded.
- Inventory supports deterministic pickup plus selected-slot state and use-attempt signaling, but no applied use effects on world targets yet.
- No combat, stealth detection, patrol simulation, or line-of-sight system.
- No deterministic dialogue consequence system beyond text history capture.
- Interactive object types are currently limited to supply-crate.
- Selected-item use outcomes are currently placeholder-level (`no-selection` / `no-target`) and do not yet mutate targets.
- Level progression/meta-progression is not implemented; level selection/reset is manual through UI controls.
- Actor world knowledge builder coverage is partial (guard and villager path only).

## Maintenance Rules

- Keep this file concise, factual, and derived from current code plus tests.
- Preserve deterministic-vs-LLM boundary language explicitly on every update.
- When adding a mechanic, document:
  - command surface changes
  - deterministic rule ownership
  - interaction resolution changes (if any)
  - levelOutcome behavior changes (if any)
  - prompt-context schema deltas (type-level and instance-level)
- Do not describe planned behavior as implemented.
