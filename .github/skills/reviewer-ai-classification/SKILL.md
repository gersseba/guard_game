---
name: reviewer-ai-classification
description: "Use when reviewing a PR for AI behavior classification accuracy; validates that PR-body markers match the actual diff content."
---

# Reviewer AI Classification

## Purpose
Use this skill to validate AI Change Classification declarations on pull requests. Ensures that PRs marked `Type: AI_BEHAVIOR_ONLY` actually contain only AI behavior changes (agent/skill/workflow files) and not content or runtime code.

## Workflow
1. Read the PR body and check for the `AI Change Classification` marker block.
2. If no marker is present, classify as `NONE`.
3. If marker present with `Type: AI_BEHAVIOR_ONLY`:
   - Read the PR diff and file list.
   - Identify which files were changed.
   - Check if ALL changed files are in AI-controlled paths:
     - `.github/agents/**`
     - `.github/skills/**`
     - `.github/*-instructions.md`
     - `.vscode/` workflow config
     - Other non-runtime workspace customization files
   - If all changed files are AI/workflow files: classify as `AI_BEHAVIOR_ONLY` ✓
   - If any runtime/content files changed (src/*, tests/*, assets/*, package.json, etc.): classify as `MISLABELED` ✗
4. Capture the declared behavior surface (e.g., "agent behavior update").
5. Verify behavior surface is coherent with the actual file changes.

## Classification Labels
- `AI_BEHAVIOR_ONLY`: Marker present and diff validates (only agent, skill, instruction, or workflow files changed)
- `NONE`: No marker present in PR body (could be legitimate for content PRs)
- `MISLABELED`: Marker present with `Type: AI_BEHAVIOR_ONLY`, but diff includes non-AI files (this is a violation)

## File Categories

### AI/Workflow Files (Safe for AI_BEHAVIOR_ONLY)
- `.github/agents/*.md` — Agent customizations
- `.github/skills/**/*.md` — Skill definitions
- `.github/*-instructions.md` — Copilot instructions
- `.vscode/launch.json`, `.vscode/tasks.json` — VS Code workflow config
- `.github/AGENTS.md` — Agent registry
- Any documentation about review process or workflow

### Content/Runtime Files (Invalidate AI_BEHAVIOR_ONLY)
- `src/**` — Game logic and rendering code
- `tests/**` — Test implementations
- `assets/**`, `public/**` — Art, audio, narrative content
- `package.json`, `tsconfig.json` — Build and dependency configuration
- `.eslintrc`, `.prettierrc` — Code quality config (not workflow)
- `README.md`, other project docs (unless purely review/workflow focused)

## Output Template
- PR:
- AI Change Classification marker present: `yes` / `no`
- If present, declared type: (text from marker)
- Declared behavior surface: (text from marker)
- Files changed: (list of affected file paths)
- Classification: `AI_BEHAVIOR_ONLY` / `NONE` / `MISLABELED`
- Validation result: `PASS` / `FAIL` (fail only if MISLABELED)
- Notes: (any coherence issues or edge cases)
