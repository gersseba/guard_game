# AI Behavior Ambiguity Log

## Resolved in this update

1. Reviewer label taxonomy mismatch
- Ambiguity: `reviewer-change` and `reviewer-partial-pr` used legacy `CHANGE` labels while agents and PR policy use `ENHANCEMENT`, `BUGS`, `LEVEL`, `DOCUMENTATION`, `REFACTORING`, and `AI_BEHAVIOR`.
- Resolution: Updated reviewer skills to use the active category taxonomy.

2. Partial PR guidance contradicted one-ticket-one-PR policy
- Ambiguity: `reviewer-partial-pr` described partial delivery as normal while coordinator/developer/reviewer enforce full-ticket implementation delivery.
- Resolution: Restricted `reviewer-partial-pr` to explicit non-merge checkpoint reviews and added a policy-blocking outcome for non-merge-ready implementation slices.

3. Missing LEVEL category in self-check workflow
- Ambiguity: `check` skill label policy omitted `LEVEL` even though agents treat `LEVEL` as first-class.
- Resolution: Added `LEVEL` to label policy and explicit readiness expectations.

4. Duplicated clarity section in AI behavior review skill
- Ambiguity: `reviewer-ai-behavior` had two `Clarity` sections with overlapping guidance.
- Resolution: Consolidated into one clarity section with explicit flow completeness checks.

5. PR labeling requirements were underspecified
- Ambiguity: `pr` skill said to add labels but did not define exactly-one primary category rule.
- Resolution: Added exact-one category label rule and explicit `Closes #<issue>` requirement for implementation PRs.

6. Feedback handling end condition was unclear
- Ambiguity: `address-comments` did not define when comment processing is complete.
- Resolution: Added completion rule requiring all must-fix comments resolved or escalated.

7. Developer workflow lacked explicit pass/fail gates
- Ambiguity: sequence existed but no explicit gate criteria for flow completion.
- Resolution: Added ordered phase gates from planning through merge/ticket closure.

## Still intentionally flexible

1. Pragmatic reviewer judgment on minor adjacent improvements
- Reason: Allows low-risk quality improvements without forcing unnecessary follow-up tickets.

2. Manual validation allowance when automated coverage is not practical
- Reason: Some workflow and documentation changes are best validated by consistency and process checks.
