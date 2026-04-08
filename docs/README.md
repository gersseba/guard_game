# Guard Game Architecture Documentation

This directory contains architecture guides, layer-specific documentation, and development patterns for Guard Game. New and existing developers should start here to understand system structure and find answers to common implementation questions.

## Fundamentals
- [System Architecture](ARCHITECTURE.md) - Layered architecture overview, design principles, and data flow
- [Type Reference](TYPES_REFERENCE.md) - Complete reference for key interfaces and data structures used throughout the codebase
- [Game Design Baseline](GAME_DESIGN_BASELINE.md) - Current game state, implemented features, LLM boundaries, and entity knowledge contracts used by the game designer
- [Guard Facing Direction (Ticket #93)](GUARD_FACING_DIRECTION.md) - Guard-facing world token, interaction approach-direction mapping, render consumption, and test coverage

## Layer Guides
Deep dives into each architectural layer and its responsibilities:
- [World Layer](WORLD_LAYER.md) - Deterministic world model, commands, state updates, level schema, serialization boundaries, and riddle-level sprite metadata flow
- [Render Layer](RENDER_LAYER.md) - PixiJS rendering, viewport management, character sprite fallback behavior, and asset metadata usage
- [Interaction Layer](INTERACTION_LAYER.md) - Deterministic target resolution, routing, object interactions, and LLM chat boundary
- [Input Layer](INPUT_LAYER.md) - Command buffering, keyboard input mapping, and command creation
- [LLM Layer](LLM_LAYER.md) - LLM client boundary, API stubs, and context serialization

## Development Patterns
Recipes and walkthroughs for common extension tasks:
- [Add a Command](ADD_COMMAND.md) - How to add a new player action
- [Add an NPC](ADD_NPC.md) - How to introduce a new NPC with behavior
- [Add an Interaction](ADD_INTERACTION.md) - How to add conversational and deterministic object interaction flows
- [Extend World State](EXTEND_STATE.md) - How to expand world state while preserving JSON serializability

## Testing & Debugging
- [Testing Patterns](TESTING_PATTERNS.md) - Test architecture, layer testing strategies, determinism verification, and debug tools

## Quick Navigation

**Just getting started?** Read [System Architecture](ARCHITECTURE.md), then choose a layer guide based on what you're building.

**Have a specific task?** Jump to the relevant pattern under "Development Patterns" above.

**Need to understand a type?** Check [Type Reference](TYPES_REFERENCE.md) for the complete data dictionary.

**Stuck on a layer boundary issue?** Each layer guide includes contract documentation and extension points.

See [Game Design Baseline](GAME_DESIGN_BASELINE.md) for the documenter-maintained source used by the game designer for direction, feasibility checks, and feature-gap analysis.

## CI Merge Gate

Pull requests to `main` are expected to pass the required CI status check before merge.

- Required check name: `lint-build-test`
- CI command sequence: `npm ci`, `npm run lint`, `npm run build`, `npm run test`

## Documentation Maintenance

Documentation is maintained alongside code changes. When implementing a feature:
- Update relevant layer docs if implementation details or contracts changed
- Add a pattern doc if a new repeatable workflow emerged
- Keep types in sync with the Type Reference
- Link to actual code files for concrete examples

See the [content manager agent](../.github/agents/content-manager.agent.md) for how documentation updates are handled during code review.
