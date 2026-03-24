---
name: reviewer-ticket-completeness
description: "Use when checking whether all PRs for a Jira ticket are collectively feature complete and satisfy all acceptance criteria."
---

# Reviewer Ticket Completeness

## Purpose
Use this skill to perform an aggregate completion review across all PRs for a ticket.

## Workflow
1. Read Jira ticket summary, scope, and acceptance criteria.
2. Gather all related PRs by branch naming (`feature/<jira-key>-...`) and ticket mentions.
3. Build an acceptance-criteria matrix with explicit evidence per PR.
4. Identify uncovered criteria, partial implementations, and contradictory behavior.
5. Evaluate architecture constraints and cross-PR integration quality.
6. Conclude complete/not complete and list exact remaining work.

## Acceptance Criteria Matrix
For each AC:
- Status: `PASS` | `PARTIAL` | `FAIL`
- Evidence: file, behavior, and PR reference
- Gap: what is still missing

## Review Checks
- All ACs covered by combined PR set.
- No requirement implemented only partially without follow-up task.
- Deterministic world logic remains outside render layer.
- Serializable world state is preserved.
- Build/test evidence exists for integration state.

## Decision Labels
- `TICKET_COMPLETE`
- `TICKET_INCOMPLETE`
- `TICKET_COMPLETE_WITH_RISKS`

## Output Template
- Ticket:
- PRs reviewed:
- AC matrix:
- Findings:
- Decision label:
- Remaining work:
