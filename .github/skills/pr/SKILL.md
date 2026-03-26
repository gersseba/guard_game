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
4. Declare explicit issue-closure intent in the PR body:
- Use `Closes #<issue>` only when this PR is intended to complete the issue.
- Use `Refs #<issue>` when this is a partial slice.
- If using `Refs`, include one line naming who closes the parent issue and when (for example: `Parent closure: after AC-complete review in completion stage`).
5. Add required labels.

## Output
- PR title and body
- Labels applied
- PR link
