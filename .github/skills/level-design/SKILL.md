---
name: level-design
description: "Create levels that fit Guard Game's current systems, with valid level JSON-compatible entity planning and NPC interaction goals that use the LLM without owning game rules."
---

# Level Design Skill

## Purpose
Design practical, buildable levels aligned with current implementation and level JSON schema.

## Use When
- The user asks for a new level concept or concrete level setup.
- A design needs to be translated into level JSON-compatible structure.
- You need to ensure a level is feasible with current world/interaction systems.

## Inputs
- docs/GAME_DESIGN_BASELINE.md (documenter-maintained baseline).
- `docs/` guidance on world, interaction, and level loading.
- Existing `public/levels/*.json` examples.
- Current entity capabilities in `src/world/types.ts` and `src/world/level.ts`.

## Workflow
1. Confirm available entity types, features, LLM behavior boundaries, and knowledge/context contracts from docs/GAME_DESIGN_BASELINE.md.
2. If the snapshot is missing or stale, request a documenter refresh before producing a level proposal.
3. Define level objective and player learning goal.
4. Choose entity placement and conversational beats that support the objective.
5. Validate feasibility against current mechanics.
6. Produce a level spec that maps cleanly to existing level JSON.
7. If required behavior cannot be represented, surface it as a feature gap.

## Level Design Rules
- Keep one clear objective per level.
- Use LLM interactions for NPC dialogue outcomes such as clues, trust shifts, and NPC-triggered interactions.
- Keep objective completion checks, puzzle validation, and progression state changes in deterministic code.
- Match NPC/guard behavior assumptions to currently available prompt context systems.
- Keep asset requirements explicit and reusable where possible.

## Output
- Baseline used (docs/GAME_DESIGN_BASELINE.md)
- Level concept summary
- JSON-compatible entity plan (player, guards, doors, npcs, objects)
- Interaction intent per major actor
- Feasibility notes and known constraints
- Explicit feature-gap list if something is missing
