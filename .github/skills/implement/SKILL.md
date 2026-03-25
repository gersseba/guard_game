---
name: implement
description: "Use when executing an approved plan; implement step by step and create a commit after each completed step."
---

# Implement Skill

## Purpose
Execute the plan in small increments with clean commit boundaries.

## Workflow
1. Pick the next planned step.
2. Implement only that scope.
3. Validate the change.
4. Commit with a message that maps to the completed step.
5. Repeat until all planned steps are complete.

## Guardrails
- Keep each commit focused and reviewable.
- Avoid mixing unrelated refactors with feature logic.
- Preserve architecture separation and deterministic world logic.

## Output
- Completed step summary
- Validation evidence
- Commit created for the step
