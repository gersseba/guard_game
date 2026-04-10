---
name: address-comments
description: "Use when PR feedback arrives; process comments one by one, decide whether to apply each change, and update the PR accordingly."
---

# Address Comments Skill

## Purpose
Handle review feedback methodically and transparently.

## Workflow
1. Read comments in review order.
2. For each comment:
- classify as must-fix, optional improvement, or declined with rationale
- apply change if accepted
- document rationale if not accepted
3. Re-run validations for impacted areas.
4. Respond to each comment with clear resolution.
5. Push updates and summarize what changed.

## Completion Rule
- Do not mark feedback handling complete while unresolved must-fix comments remain.
- If a must-fix request cannot be addressed within scope, escalate to the user with explicit options.

## Output
- Comment-by-comment resolution log
- Code/validation updates made
- Remaining open feedback
