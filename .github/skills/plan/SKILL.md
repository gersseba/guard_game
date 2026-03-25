---
name: plan
description: "Use when starting a ticket implementation to create a structured, step-by-step implementation plan before coding."
---

# Plan Skill

## Purpose
Create a concrete, ordered implementation plan for a ticket before editing code.

## Workflow
1. Read ticket scope and acceptance criteria.
2. Identify impacted modules and layer boundaries (`world`, `render`, `interaction`, `input`, `llm`).
3. Break work into small, reviewable steps.
4. Define validation per step (build, tests, or manual checks).
5. List commit checkpoints aligned to each step.

## Output
- Ticket understanding
- Ordered implementation steps
- Per-step validation plan
- Commit plan
