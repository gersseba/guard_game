# Game Design Baseline

This document is the canonical, documenter-maintained baseline for game design decisions and feature-gap analysis.

Use this file to capture only current, implemented behavior.

## Runtime Status

Document the current playable loop and implemented objectives.

## Feature Inventory

List implemented systems and notable missing feature pillars.

## LLM Integration Boundaries

Document where the LLM is used and where it is explicitly not used.

Guard Game rule:
- LLM is used for NPC interaction only (information sharing, behavior influence, and NPC-triggered interactions).
- Game rules, objective checks, win/loss conditions, and authoritative state transitions are deterministic and code-owned.

## Entity Knowledge Model

Document what prompt context can expose for:
- Player
- Guards
- NPCs
- Interactive objects

Include both type-level and instance-level knowledge/behavior contracts when applicable.

## Known Constraints

Document current technical and design constraints that affect proposals.

## Maintenance Rules

- Keep this file concise, factual, and derived from code plus tests.
- Do not include speculative or planned behavior unless clearly marked as not implemented.
- Update this file whenever gameplay capabilities, interaction contracts, or prompt-context data models change.