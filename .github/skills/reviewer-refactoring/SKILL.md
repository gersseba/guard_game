---
name: reviewer-refactoring
description: "Use when reviewing a PR labeled REFACTORING to verify no functional changes are introduced."
---

# Reviewer Refactoring

## Purpose
Review PRs labeled `REFACTORING` that reorganize or improve code without changing observable behavior. Verify that the refactoring is purely structural or stylistic and introduces no functional changes.

## Review Checklist

### No Functional Changes
- Does the refactored code produce identical output given the same input?
- Are algorithm behaviors preserved (same sorting, filtering, caching logic)?
- Are API signatures preserved, or are breaking changes called out explicitly in the PR?
- Test assertions should pass without modification (or changes to assertions should only reflect style/clarity, not logic)

### Code Quality Improvement
- Is the refactoring clearly improving readability, performance, or maintainability?
- Does it reduce duplication or technical debt?
- Does it improve type safety or error handling without changing behavior?

### No Side Effects
- Are there any new dependencies or imports that could introduce behavior changes?
- Are there any environment or configuration changes?
- Does the refactoring avoid modifying unrelated code (scope creep)?

### Testing Validation
- Do existing tests pass without modification (or with only expect-value updates that reflect re-formatting)?
- Is there evidence that the build succeeds and tests run?

## Decision Labels
- `VALID_PARTIAL_SLICE` — Refactoring is purely structural, code quality improves, no functional changes
- `BEHAVIOR_CHANGED` — Changes alter observable behavior (should be labeled CHANGE instead)
- `SCOPE_CREEP` — Refactoring mixes unrelated changes or introduces new features
- `MISLABELED` — PR has functional changes or new feature work (should use CHANGE label)

## Output Template
- PR:
- Label: REFACTORING
- Files refactored: (list files changed)
- Refactoring purpose: (readability, performance, deduplication, etc.)
- Functional preservation: (is behavior identical before/after?)
- Test status: (do existing tests pass?)
- Code quality impact: (how is codebase improved?)
- Findings: (list by severity)
- Decision: VALID_PARTIAL_SLICE / BEHAVIOR_CHANGED / SCOPE_CREEP / MISLABELED
- Required follow-up:
