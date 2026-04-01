---
name: game-direction
description: "Set the gameplay direction for Guard Game by selecting LLM-native mechanics, level progression patterns, and feature priorities that fit existing architecture."
---

# Game Direction Skill

## Purpose
Define strategic gameplay direction that combines deterministic systems with meaningful LLM interaction.

## Use When
- The user asks what kind of game loop should be built next.
- You need to evaluate which mechanics make sense with LLMs.
- You need a direction for level themes and progression.

## Inputs
- Current project architecture and docs.
- Existing implemented mechanics and constraints.
- Product goals (player fantasy, pacing, replayability).

## Workflow
1. Identify current capability baseline from docs and code.
2. Propose 2-3 viable gameplay direction options that use LLMs deliberately.
3. Compare trade-offs: complexity, implementation risk, content demand, replay value.
4. Recommend one direction with a phased adoption path.
5. List required supporting features (must-have vs later).

## LLM-Gameplay Heuristics
- Prefer LLM usage where language adds value: interrogation, negotiation, inference, misdirection, witness recall.
- Keep core game state deterministic and inspectable.
- Ensure every LLM exchange can be grounded in explicit context from world state.
- Avoid relying on unconstrained open-ended generation for win/loss logic.

## Output
- Direction options and recommended choice
- Why the recommended path fits current game architecture
- Required feature pillars
- Suggested next design step
