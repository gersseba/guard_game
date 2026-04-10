---
name: check
description: "Use after opening a PR to self-review consistency, correctness, and completeness before considering work done."
---

# Check Skill

## Purpose
Perform a structured self-review of an opened PR.

## Checklist
1. Scope consistency:
- Diff matches ticket and does not include unrelated files.
2. Correctness:
- Behavior matches acceptance criteria.
- Layer boundaries are preserved.
3. Quality:
- Naming, comments, and structure are clear.
- No obvious dead code or leftover debug artifacts.
4. Validation:
- Build/tests/manual checks are documented and recent.
5. Issue linkage and closure intent:
- PR body uses `Closes #<issue>` for the implementation ticket.
- No slice-PR `Refs` usage for implementation delivery.
- If ticket is a sub ticket, parent linkage is present and post-merge parent comment plan is clear.
6. Label policy:
- Exactly one category label is present: `DOCUMENTATION`, `BUGS`, `ENHANCEMENT`, `LEVEL`, `AI_BEHAVIOR`, or `REFACTORING`.
- `AI_BEHAVIOR` is used only for AI workflow customization changes.
- `LEVEL` is required for level-definition delivery from game designer specifications.

## Readiness Rule
- If any checklist item fails, the PR is not ready and must be updated before handoff or merge.

## Cleanup Actions
- Make any necessary cleanup commits.
- Update PR description if scope or validation changed.
- Update PR description if issue linkage/closure intent is unclear.
- Fix missing or incorrect category labels before final readiness.

## Output
- Findings (if any)
- Cleanup changes made
- Final readiness verdict
