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
3. Determine review basis:
	- `ticket-delivery` for product/runtime/test/refactor slices
	- `workflow-reasonableness` for PRs that change only agents, skills, prompts, or review workflow files
4. Verify contribution to the ticket goal even if ACs are not fully met yet.
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

## Output Template
- Ticket:
- PR:
- Review basis:
- Dominant concern:
- Findings:
- AI change classification: (run `reviewer-ai-classification` skill for dedicated validation)
- Decision label:
- Required follow-up:

## Integration with AI Classification Skill
For comprehensive partial PR reviews:
1. Run this skill first for scope and focus validation.
2. Run the `reviewer-ai-classification` skill separately to validate AI behavior markers.
3. Combine results for complete partial review output.
