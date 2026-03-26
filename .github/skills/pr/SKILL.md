---
name: pr
description: "Use when preparing and opening a pull request for completed ticket steps, including summary, validation, and issue linkage."
---

# PR Skill

## Purpose
Open a high-quality PR that is easy to review.

## Workflow
1. Confirm branch is pushed and up to date.
2. Prepare concise PR title and summary.
3. Include validation evidence.
4. Enforce one-ticket-one-PR linkage:
- Use `Closes #<issue>` for the implementation ticket handled by this PR.
- Do not use `Refs #<issue>` for slice implementation delivery.
- If this is a sub ticket, include one parent link line (for example: `Parent: #<parent-issue>`).
5. Add required labels.

## Output
- PR title and body
- Labels applied
- PR link
