---
name: reviewer-ai-behavior
description: "Use when reviewing a PR labeled AI_BEHAVIOR that changes agents, skills, instructions, prompts, or workflow customization files managed by the ai behavior adjuster."
---

# Reviewer AI Behavior

## Purpose
Review PRs labeled `AI_BEHAVIOR` that change agent, skill, instruction, prompt, or workflow customization files managed by the ai behavior adjuster. Verify the change is focused, internally consistent, and does not mix in runtime gameplay work.

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
- **Ambiguous wording**: Check for vague terms like "probably," "might," "often" in agent instructions.
- **Complete examples**: Do code examples or workflow steps show full, concrete scenarios?
- **Testability**: Can another person follow the instructions without guessing about intent?
- **Consistency in terminology**: Are the same concepts referred to with consistent names throughout?

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
- Label: AI_BEHAVIOR
- Files changed:
- Scope fit:
- Consistency check:
- Clarity check:
- Findings: (list by severity)
- Decision: VALID_PARTIAL_SLICE / NEEDS_CLARIFICATION / INCONSISTENT / MISLABELED
- Required follow-up:
