---
name: reviewer-partial-pr
description: "Use only when a user explicitly requests a non-merge checkpoint review; verify focus and risk while preserving one-ticket-one-PR merge policy for implementation delivery."
---

# Reviewer Partial PR

## Purpose
Use this skill only for explicit checkpoint feedback requests. It must not approve implementation PRs that are intentionally partial for merge.

## Workflow
1. Read the Jira ticket and identify outcome, scope boundaries, and acceptance criteria.
2. Read the PR diff and summarize its single dominant concern.
3. Determine review basis:
   - `implementation-checkpoint` for non-final implementation progress requested by the user
   - `workflow-reasonableness` for PRs that change only agents, skills, prompts, or review workflow files
4. Verify contribution to the ticket goal, and explicitly state that implementation merge readiness is blocked until full AC completion.
5. For workflow-only PRs, judge the changes on coherence, usefulness, and broader reasonableness instead of runtime AC progress.
6. Check that the PR remains focused (one concern) and reviewable.
7. Flag scope creep and cross-layer coupling.
8. Recommend split actions if the PR mixes unrelated concerns.

## Review Checks
- Ticket alignment: PR advances the stated ticket objective.
- Concern focus: one dominant concern (example: refactor only, render scaffold only).
- Workflow-only exception: if only agent/skill/workflow files are changed, evaluate broad reasonableness and usefulness rather than feature completeness.
- Layer boundaries: no gameplay logic in render layer.
- Regression risk: no obvious behavior regressions from changed files.
- Test/validation evidence: build, tests, or manual checks documented.

## Decision Labels
- `VALID_PARTIAL_SLICE`
- `NEEDS_SPLIT`
- `OUT_OF_SCOPE`
- `BLOCKED_BY_MISSING_CONTEXT`
- `NOT_MERGE_READY_BY_POLICY`

## Integration with Category-Specific Skills
For partial PR reviews, use the appropriate category skill based on the PR label:
1. Verify PR has exactly one primary review label: `ENHANCEMENT`, `BUGS`, `LEVEL`, `DOCUMENTATION`, `REFACTORING`, or `AI_BEHAVIOR`
2. Use the category-specific skill:
   - `reviewer-ai-behavior` for `AI_BEHAVIOR` PRs
   - `reviewer-change` for `ENHANCEMENT`, `BUGS`, `LEVEL`, or implementation-scoped `DOCUMENTATION` PRs
   - `reviewer-refactoring` for `REFACTORING` PRs
3. Follow that skill's review checklist and decision process

## Output Template (Use Category Skill's Template)
This skill ensures label/content alignment; category skills provide the actual partial PR decision via their templates:
- Ticket:
- PR:
- PR label: (verify matches category)
- Category skill used:
- Domain decision: (from category skill)
- Required follow-up:
