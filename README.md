# Guard Game

A browser-based 2D grid game baseline with deterministic world updates, PixiJS rendering, and an LLM interaction boundary.

## Development Setup

### Requirements
- Node.js 18+ / npm

### Quick Start

```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Format code
npm run format
```

## Architecture

The game enforces strict layer separation to support LLM-driven gameplay:

```
/src
  /world          — Deterministic world model (state, command application)
  /render         — PixiJS rendering port (grid, player marker, camera)
  /interaction    — NPC interaction flow and response formatting
  /input          — Input command buffering
  /llm            — LLM client boundary and stubs
  /runtime        — Runtime composition (app wiring, fixed tick loop, bridge/coordinator modules)
  main.ts         — Thin browser bootstrap that starts the runtime app
```

### Key Principles
- **Deterministic world updates:** All game state changes are command-based and deterministic
- **JSON-serializable state:** World state must be serializable for LLM context creation
- **Layer isolation:** No game logic in rendering; no rendering in world model
- **Descriptive naming:** Types and interfaces use clear names for LLM reasoning

### Baseline Runtime Loop

The current baseline runtime is composed in `src/runtime/createRuntimeApp.ts` and follows this loop:

1. Keyboard input maps to `WorldCommand` values and is enqueued into `CommandBuffer`.
2. A fixed simulation tick of 100ms drains buffered commands.
3. `world.applyCommands(commands)` updates deterministic state and advances `tick`, including inventory slot selection state.
4. If any `useSelectedItem` commands were issued, runtime orchestration resolves a deterministic item-use attempt event for each command and stores the latest event in serialized world state.
5. If an `interact` command was issued, one adjacent target is resolved through the interaction dispatcher; conversational turns may cross the LLM boundary, while door/object paths stay deterministic.
6. Every animation frame renders the latest world state through the Pixi render port and prints JSON state in the debug panel.

## Architecture Documentation

Full architectural guides and development patterns are in the [docs/](docs/) directory. Start here to understand the system:

**Core Documentation:**
- [Architecture Overview](docs/ARCHITECTURE.md) — System design, layers, contracts, and data flow
- [Type Reference](docs/TYPES_REFERENCE.md) — Complete dictionary of game types and state structures

**Layer Guides:**
- [World Layer](docs/WORLD_LAYER.md) — Deterministic state model and command application
- [Render Layer](docs/RENDER_LAYER.md) — PixiJS rendering and sprite management
- [Interaction Layer](docs/INTERACTION_LAYER.md) — NPC interactions and LLM integration boundary
- [Input Layer](docs/INPUT_LAYER.md) — Keyboard input and command mapping
- [LLM Layer](docs/LLM_LAYER.md) — LLM client boundary and context generation

**Development Patterns:**
- [Add a Command](docs/ADD_COMMAND.md) — How to add a new player action
- [Add an NPC](docs/ADD_NPC.md) — How to introduce a new NPC
- [Add an Interaction](docs/ADD_INTERACTION.md) — How to add NPC interaction logic
- [Extend World State](docs/EXTEND_STATE.md) — How to expand game state safely

**Testing & Debugging:**
- [Testing Patterns](docs/TESTING_PATTERNS.md) — Layer testing strategies and determinism verification

## Development Workflow

### Full Ticket Flow (Recommended)

For new features or significant changes, orchestrate the full workflow:

```bash
@coordinator: Run full flow for ticket #<number>
```

This will automatically:
1. **Refine scope** via requirement engineer if needed
2. **Implement** the feature via developer
3. **Review** the PR via reviewer against acceptance criteria
4. **Document** changes via documenter
5. **Merge** when complete

### Individual Agent Workflows

You can also invoke agents separately for specific tasks:

| Task | Agent | Example |
|------|-------|---------|
| Create/refine a ticket | `@requirement-engineer` | "Design an NPC patrol system" |
| Implement a feature | `@developer` | "Implement ticket #12" |
| Get architecture advice | `@tech-lead` | "How should we handle..." |
| Review a PR | `@reviewer` | "Review PR #42" |
| Update docs for a PR | `@documenter` | "Update docs for PR #42" |

### Branch Naming
Feature branches use the format: `feature/<github-issue-number>-<kebab-case-summary>`

Example: `feature/1-setup-basic-structure`

### PR Workflow

1. **Create a feature branch** from `main`
2. **Implement** the feature (or use `@developer` to automate)
3. **Add tests** to verify functionality
4. **Request review** via `@reviewer`
5. **Update documentation** via `@documenter` (before merge)
6. **Merge** when review passes and docs are updated

### Category Labels

All PRs must have exactly one category label:
- `AI_BEHAVIOR` — Copilot agent/skill customization changes
- `CHANGE` — Feature/game logic/rendering implementation
- `BUGS` — Defect fixes with tests
- `DOCUMENTATION` — Docs/process updates
- `REFACTORING` — Code reorganization without behavior change

## Agents & Skills

Guard Game uses specialized Copilot agents to manage the full development workflow from idea to merge. Each agent has a specific role and is invoked based on the task at hand.

### Core Agents

| Agent | Role | When to Use |
|-------|------|-----------|
| **requirement-engineer** | Designs implementation scope and acceptance criteria | When creating or refining GitHub issues |
| **developer** | Implements features and fixes according to tickets | When starting work on a GitHub issue |
| **tech-lead** | Architecture sparring and technology decisions | When designing solutions or making major architectural choices |
| **reviewer** | Reviews PRs against acceptance criteria and architecture constraints | When a PR is ready for review |
| **documenter** | Synchronizes documentation with code changes | When a PR passes review, before merge (automatic during coordination) |
| **coordinator** | Orchestrates end-to-end ticket flow across agents | When running full ticket workflow (optional; agents work independently by default) |

### How to Use Agents

**Invoke in chat by name or type `/` to see available agents.** Each agent has a description matching its trigger phrase.

**Examples:**
- `@tech-lead: Should we use separate render systems for UI vs game world?`
- `@reviewer: Review PR #42 against the acceptance criteria`
- `@documenter: Update docs for the new interaction layer changes in this branch`
- `@coordinator: Run full flow for ticket #15`

### Locating Agents & Skills
- **Agents:** [.github/agents/](/.github/agents/) — Each agent is an `.agent.md` file with description and behavior
- **Skills:** [.github/skills/](/.github/skills/) — Workflows and best practices for specialized tasks
- **Project Instructions:** [.github/copilot-instructions.md](/.github/copilot-instructions.md) — Baseline requirements and architecture constraints

## Project Management

### GitHub Issues
Issues are tracked as GitHub issues instead of Jira. Each issue includes:
- Clear summary and description
- Acceptance criteria (testable outcomes)
- Labels for categorization

## Testing & Validation

### CI Required Checks

All pull requests targeting `main` must pass the GitHub Actions CI check before merge.

- Required check name: `lint-build-test`
- Required command order in CI: `npm ci`, `npm run lint`, `npm run build`, `npm run test`
- CI runs on pull requests to `main` and on pushes to `main`

Before opening a PR, ensure:
- `npm run build` completes without errors
- `npm run lint` passes without warnings
- `npm run test` passes (`vitest run --passWithNoTests` is configured)
- Manual testing confirms the change works as intended
- Logs or screenshots are included in PR description for verification

## Manual Verification (Baseline)

1. Run `npm install` (first setup only) and `npm run dev`.
2. Open `http://localhost:5173` and confirm the viewport shows:
  - a visible tile grid
  - a player marker framed by the camera, centered when world bounds allow and otherwise clamped near the world edges with the visible edge band
  - a world-state JSON panel that updates over time
3. Press arrow keys or `W/A/S/D` and confirm:
  - player marker moves one tile per input tick
  - movement is clamped within grid bounds
  - `player.position` changes in the JSON panel
4. Press `1` while no inventory item is present and confirm `player.inventory.selectedItem` stays `null` in the JSON panel.
5. Press `F` and confirm `lastItemUseAttemptEvent.result` becomes `no-selection` in the JSON panel.
6. Press `E` when not adjacent to an interactable target and confirm no interaction opens.

## Resources

- **Repository:** https://github.com/gersseba/guard_game
- **Main branch:** main
- **Development branch template:** feature/<issue>-<summary>

## Troubleshooting

### Build Issues
```bash
# Clean rebuild
rm -rf node_modules dist
npm install
npm run build
```

## License

See [LICENSE](LICENSE) file for details.
