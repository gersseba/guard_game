---
name: reviewer-ac-matrix
description: "Use when performing a ticket completeness review to collect all related PRs and build an explicit acceptance-criteria evidence matrix."
---

# Reviewer AC Matrix

## Purpose
Use this skill to make complete-mode reviews repeatable by building a strict AC coverage matrix across all PRs for a Jira ticket.

## Inputs
- Jira ticket key (for example: `GG-1`)
- Repository owner/name
- Optional list of known PR numbers

## Workflow
1. Fetch ticket scope and acceptance criteria from Jira.
2. Discover related PRs using both signals:
   - Branch naming convention: `feature/<jira-key>-...`
   - PR title/body references to the ticket key.
3. Build a canonical PR set (deduplicate by PR number).
4. For each acceptance criterion, gather evidence from the PR set:
   - Changed files and behavior impact
   - Validation evidence (build/test/manual)
   - Reviewer notes or unresolved concerns
5. Mark criterion status as `PASS`, `PARTIAL`, or `FAIL`.
6. Produce a remaining-work list mapped to concrete follow-up PR slices.

## Matrix Format
For each acceptance criterion:
- `criterion`: exact AC text
- `status`: `PASS` | `PARTIAL` | `FAIL`
- `evidence`: PR number(s), key file(s), and behavior summary
- `gap`: explicit missing implementation or validation

## Output Template
- Ticket:
- PR set:
- AC matrix:
- Decision: `TICKET_COMPLETE` | `TICKET_INCOMPLETE` | `TICKET_COMPLETE_WITH_RISKS`
- Required follow-up PR packages:

## Guardrails
- Do not infer AC completion without evidence.
- Keep partial implementation separate from complete implementation.
- Treat missing validation as `PARTIAL` unless behavior is unambiguously covered.
