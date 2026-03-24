---
name: reviewer-partial-pr
description: "Use when reviewing a partial PR for a Jira ticket; verify the PR is a focused incremental slice that contributes to the ticket goal without requiring full feature completion."
---

# Reviewer Partial PR

## Purpose
Use this skill to review a single PR as a partial delivery for a ticket.

## Workflow
1. Read the Jira ticket and identify outcome, scope boundaries, and acceptance criteria.
2. Read the PR diff and summarize its single dominant concern.
3. Verify contribution to the ticket goal even if ACs are not fully met yet.
4. Check that the PR remains focused (one concern) and reviewable.
5. Flag scope creep and cross-layer coupling.
6. Recommend split actions if the PR mixes unrelated concerns.

## Review Checks
- Ticket alignment: PR advances the stated ticket objective.
- Concern focus: one dominant concern (example: refactor only, render scaffold only).
- Layer boundaries: no gameplay logic in render layer.
- Regression risk: no obvious behavior regressions from changed files.
- Test/validation evidence: build, tests, or manual checks documented.

## Decision Labels
- `VALID_PARTIAL_SLICE`
- `NEEDS_SPLIT`
- `OUT_OF_SCOPE`
- `BLOCKED_BY_MISSING_CONTEXT`

## Output Template
- Ticket:
- PR:
- Dominant concern:
- Findings:
- Decision label:
- Required follow-up:
