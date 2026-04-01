---
name: feature-gap-ticketing
description: "Define missing features discovered during design work and hand off implementation-ready requirement briefs to the requirement engineer for GitHub ticket creation."
---

# Feature Gap Ticketing Skill

## Purpose
Turn design gaps into concrete requirement briefs for the `requirement engineer`, with deterministic game logic in code and LLM scope limited to NPC interaction.

## Use When
- A desired mechanic is not supported by current systems.
- Level design requires new data fields, behaviors, or interaction flow.
- You need clear ticket-ready scope for implementation planning.

## Inputs
- Gap identified from game direction or level design.
- Current Game State Snapshot in docs/README.md (documenter-maintained baseline).
- Current architecture boundaries and existing APIs/types.
- Priority and dependency context.

## Workflow
1. Verify the gap against the Current Game State Snapshot in docs/README.md.
2. If the snapshot is missing or stale, request a documenter refresh before writing requirement briefs.
3. Describe the player-facing problem caused by the gap.
4. Define minimum viable feature scope and non-goals.
5. Write testable acceptance criteria.
6. Identify dependencies and sequencing.
7. Produce a handoff instruction for `requirement engineer`.

## Scope Rules
- 1 missing feature = 1 focused requirement brief when possible.
- Separate foundational architecture work from content-level additions.
- Call out migration/compatibility constraints for level JSON where relevant.
- Avoid implementation details beyond what is needed to make requirements testable.
- Explicitly state that game rules, objective checks, and outcome logic are code-owned.
- If LLM is included, restrict it to NPC interaction effects (information, behavior influence, NPC-triggered interactions).

## Output
- Snapshot basis used (docs/README.md Current Game State Snapshot)
- Feature gap title
- Context/problem statement
- Scope and non-goals
- Acceptance criteria (numbered, testable)
- Dependencies/ordering notes
- Handoff prompt for `requirement engineer`
