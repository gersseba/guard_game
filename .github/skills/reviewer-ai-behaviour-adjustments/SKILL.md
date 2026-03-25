---
name: reviewer-ai-behaviour-adjustments
description: "Use when reviewing a PR labeled AI_BEHAVIOUR that changes agents, skills, instructions, prompts, or workflow customization files managed by the ai behavior adjuster."
---

# Reviewer AI Behaviour Adjustments

## Purpose
Review PRs labeled `AI_BEHAVIOUR` that change agent, skill, instruction, prompt, or workflow customization files managed by the ai behavior adjuster. Verify the change is focused, internally consistent, and does not mix in runtime gameplay work.

## Review Checklist

### Scope Fit
- Verify the PR only changes AI customization files such as:
  - `.github/agents/*.md`
  - `.github/skills/**/*.md`
  - `.github/*-instructions.md`
  - related prompt or workflow customization files
- Flag any runtime files such as `src/**`, `public/**`, or build configuration as out of scope.

### Consistency
- Check whether related agents, skills, or instructions were updated together where needed.
- Confirm terminology is consistent across changed customization files.
- Verify the workflow described by the ai behavior adjuster matches the edited instructions.

### Clarity
- Check for ambiguous wording or incomplete workflow steps.
- Ensure branch and PR guidance are explicit and testable.
- Confirm the intended behavior can be followed without guessing.

## Decision Labels
- `VALID_PARTIAL_SLICE` — Focused AI customization change, consistent and clear
- `NEEDS_CLARIFICATION` — Wording or workflow is ambiguous or incomplete
- `INCONSISTENT` — Related customization files are out of sync
- `MISLABELED` — Diff includes runtime or non-customization changes

## Output Template
- PR:
- Label: AI_BEHAVIOUR
- Files changed:
- Scope fit:
- Consistency check:
- Clarity check:
- Findings:
- Decision: VALID_PARTIAL_SLICE / NEEDS_CLARIFICATION / INCONSISTENT / MISLABELED
- Required follow-up: