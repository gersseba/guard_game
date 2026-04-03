# Guard Game Copilot Instructions

## Source of Truth

- Build this repository as a browser-based 2D grid game using TypeScript and PixiJS.
- Follow GitHub Issues as the implementation backlog and task sequencing source.
- If there is any conflict between local assumptions and GitHub issue scope, the issue wins.

## Project Scope

- Implement the full game incrementally while preserving strict layer separation:
  - Deterministic world model
  - Rendering layer
  - Interaction layer
  - LLM integration layer
- Ensure each feature extends these layers without mixing responsibilities.

## Required Project Structure

Implement and preserve this structure:

```text
/src
	/world
	/render
	/interaction
	/input
	/llm
	main.ts
```

## Required Initial Interfaces

Create and use descriptive, serializable TypeScript models for at least:

- `WorldState`
- `World`
- `Player`
- `Npc`
- `InteractiveObject`

All world state should be JSON-serializable and named clearly for future LLM reasoning.

## Core Runtime Requirements

- PixiJS app initialization
- Root render container
- Basic sprite factory utilities
- Grid world rendering
- Player sprite and grid movement
- Input handling for movement and interactions
- NPC interaction pipeline
- LLM API client integration boundary
- Main loop for deterministic world update and rendering

## Architecture Constraints

- Keep game logic out of rendering code.
- Keep world updates deterministic and testable.
- Prefer small modules with explicit interfaces and minimal side effects.
- Keep world data serializable and easy to inspect as JSON for debugging and LLM context creation.
- Add complexity only when required by active Jira tasks.

## Jira Task Execution Rules

- Before implementing, check GitHub Issues for related work items (linked issues, follow-up tasks).
- If additional GitHub issues exist, implement in issue order and keep changes aligned with each issue's scope.
- When uncertain about behavior, consult the GitHub issue first rather than inventing mechanics.
- If GitHub issue details are missing or ambiguous, ask for clarification before proceeding.
- Link your PR to the issue using "Closes #<number>" in the PR description.
- Support ticket category `LEVEL` for level-design delivery authored by the game designer.
- `LEVEL` tickets must include: level idea, a level JSON definition or concrete build directions, required assets, and any functional code changes required to support the level.
- The game designer may collaborate directly with requirement engineer for new feature requests and with tech lead for feasibility and required change analysis.

## Definition of Done (Per Task)

For each implemented Jira task, ensure all of the following are true:

- Project builds and runs in the browser.
- Feature behavior matches GitHub issue acceptance criteria.
- World state remains serializable to JSON.
- Layer boundaries remain intact (no gameplay logic in render code).
- Code is descriptive, modular, and prepared for future LLM-assisted systems.
- Documentation is updated when architecture or workflow changes.
