---
name: reviewer-ai-behavior
description: "Legacy skill for reviewing older PRs labeled AI_BEHAVIOR; current AI customization PRs should use reviewer-ai-behaviour-adjustments instead."
---

# Reviewer AI Behavior

Legacy note: this skill exists for older `AI_BEHAVIOR` PRs. Current AI customization PRs should use `reviewer-ai-behaviour-adjustments` with the `AI_BEHAVIOUR` label.

## Purpose
Review PRs labeled `AI_BEHAVIOR` that change agent, skill, instruction, or workflow customization files. Verify consistency across related agents/skills and clarity of the changes.

## Review Checklist

### Consistency
- **Cross-agent alignment**: If one agent is updated, are related agents also updated appropriately?
  - Example: If developer agent adds guidance, does reviewer agent reflect the same workflow?
- **Skill alignment**: Do skill definitions match the agent behavior they document?
- **Instruction completeness**: Are all agent files that handle the same concern updated together?
- **Example criteria**:
  - If a new review mode is added to reviewer agent, are skills updated to support it?
  - If developer agent changes PR conventions, does reviewer agent recognize the new convention?

### Clarity
- **Ambiguous wording**: Check for vague terms like "probably," "might," "often" in agent instructions.
- **Complete examples**: Do code examples or workflow steps show full, concrete scenarios?
- **Testability**: Can another person follow the instructions without guessing about intent?
- **Consistency in terminology**: Are the same concepts referred to with consistent names throughout?

### No Runtime Changes
- Verify that ONLY files in these paths are changed:
  - `.github/agents/*.md`
  - `.github/skills/**/*.md`
  - `.github/*-instructions.md`
  - `.vscode/` workflow config
- Flag if any `src/`, `tests/`, or other runtime files are included (should be CHANGE or REFACTORING, not AI_BEHAVIOR)

## Decision Labels
- `VALID_PARTIAL_SLICE` — Changes are consistent, clear, and focused on agent/skill behavior
- `NEEDS_CLARIFICATION` — Instructions are ambiguous or incomplete
- `INCONSISTENT` — Related agents/skills were not updated together
- `MISLABELED` — Changes include runtime or content (should use CHANGE/REFACTORING label)

## Output Template
- PR:
- Label: AI_BEHAVIOR
- Files changed: (list agent/skill files)
- Consistency check: (any gaps in cross-agent updates?)
- Clarity check: (ambiguous wording or incomplete instructions?)
- Findings: (list by severity)
- Decision: VALID_PARTIAL_SLICE / NEEDS_CLARIFICATION / INCONSISTENT / MISLABELED
- Required follow-up:
