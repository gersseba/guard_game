---
name: reviewer-change
description: "Use when reviewing a PR labeled CHANGE for AC alignment, correctness, and completeness."
---

# Reviewer Change

## Purpose
Review PRs labeled `CHANGE` that implement feature, logic, or content changes to the game. Verify that changes align with ticket acceptance criteria, are functionally correct, and are complete within their scope.

## Review Checklist

### Acceptance Criteria (AC) Alignment
- Does this PR advance at least one acceptance criterion from the ticket?
- Are all ACs that this PR claims to address actually implemented?
- List which ACs are met and which are deferred to future PRs.
- If AC is deferred, is that deferral called out explicitly and reasonable?

### Correctness
- Does the implementation match the stated behavior in the ticket?
- Are there obvious logic errors, off-by-one bugs, or boundary cases not handled?
- Do changes respect world/render/interaction/input/llm layer boundaries?
- Are there any regressions in existing functionality?

### Completeness
- Is the change complete in itself (not a half-feature that can't work standalone)?
- Are all functions/methods that the PR adds or modifies fully implemented (no TODO/FIXME)?
- Are error cases handled?
- Are there any dangling references or missing dependencies?

### Testing & Validation
- Are there tests, manual validation steps, or screenshots documenting the change works?
- Does the PR build and run without errors?

## Decision Labels
- `VALID_PARTIAL_SLICE` — AC progress is clear, implementation is correct and complete, ready to merge
- `INCOMPLETE` — Feature is half-implemented or lacks critical functionality for the stated scope
- `AC_NOT_MET` — PR claims to meet ACs but implementation gaps remain
- `CORRECT_BUT_DEFERRED` — Implementation is correct but intentionally defers some AC; used when deferral is explicit and acceptable
- `MISLABELED` — Changes are only AI customization or refactoring work (should use AI_BEHAVIOR/REFACTORING label)

## Output Template
- PR:
- Label: CHANGE
- Related ACs: (which ticket ACs does this advance?)
- AC alignment: (which ACs met, which deferred and why?)
- Correctness check: (any logic errors or regressions?)
- Completeness check: (is the feature fully implemented within its scope?)
- Layer boundaries: (are architecture layers respected?)
- Findings: (list by severity)
- Decision: VALID_PARTIAL_SLICE / INCOMPLETE / AC_NOT_MET / CORRECT_BUT_DEFERRED / MISLABELED
- Required follow-up:
