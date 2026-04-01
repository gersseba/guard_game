---
name: feature-gap-ticketing
description: "Define missing features discovered during design work and hand off implementation-ready requirement briefs to the requirement engineer for GitHub ticket creation."
---

# Feature Gap Ticketing Skill

## Purpose
Turn design gaps into concrete requirement briefs for the `requirement engineer`.

## Use When
- A desired mechanic is not supported by current systems.
- Level design requires new data fields, behaviors, or interaction flow.
- You need clear ticket-ready scope for implementation planning.

## Inputs
- Gap identified from game direction or level design.
- Current architecture boundaries and existing APIs/types.
- Priority and dependency context.

## Workflow
1. Describe the player-facing problem caused by the gap.
2. Define minimum viable feature scope and non-goals.
3. Write testable acceptance criteria.
4. Identify dependencies and sequencing.
5. Produce a handoff instruction for `requirement engineer`.

## Scope Rules
- 1 missing feature = 1 focused requirement brief when possible.
- Separate foundational architecture work from content-level additions.
- Call out migration/compatibility constraints for level JSON where relevant.
- Avoid implementation details beyond what is needed to make requirements testable.

## Output
- Feature gap title
- Context/problem statement
- Scope and non-goals
- Acceptance criteria (numbered, testable)
- Dependencies/ordering notes
- Handoff prompt for `requirement engineer`
