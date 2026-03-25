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

## Cleanup Actions
- Make any necessary cleanup commits.
- Update PR description if scope or validation changed.

## Output
- Findings (if any)
- Cleanup changes made
- Final readiness verdict
