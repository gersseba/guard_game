---
name: game-direction
description: "Set the gameplay direction for Guard Game with deterministic code-owned mechanics, level progression patterns, and feature priorities that fit existing architecture."
---

# Game Direction Skill

## Purpose
Define strategic gameplay direction where core mechanics are deterministic and the LLM is limited to NPC interaction.

## Use When
- The user asks what kind of game loop should be built next.
- You need to evaluate which mechanics make sense with LLMs.
- You need a direction for level themes and progression.

## Inputs
- Current project architecture and docs.
- Current Game State Snapshot in docs/README.md (documenter-maintained baseline).
- Existing implemented mechanics and constraints.
- Product goals (player fantasy, pacing, replayability).

## Workflow
1. Identify current capability baseline from the Current Game State Snapshot in docs/README.md.
2. If the snapshot is missing or stale, request a documenter refresh before proposing direction options.
3. Propose 2-3 viable gameplay direction options with code-owned rules and explicit NPC interaction touchpoints.
4. Compare trade-offs: complexity, implementation risk, content demand, replay value.
5. Recommend one direction with a phased adoption path.
6. List required supporting features (must-have vs later).

## LLM-Gameplay Heuristics
- Prefer LLM usage only where NPC language adds value: interrogation, negotiation, inference, misdirection, witness recall.
- Keep core game state deterministic and inspectable.
- Ensure every LLM exchange can be grounded in explicit context from world state.
- Keep win/loss logic, objective checks, rule enforcement, and progression gates in deterministic code.
- Avoid relying on unconstrained open-ended generation for authoritative game logic.

## Output
- Snapshot basis used (docs/README.md Current Game State Snapshot)
- Direction options and recommended choice
- Why the recommended path fits current game architecture
- Required feature pillars
- Suggested next design step
