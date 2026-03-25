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
  main.ts         — Runtime bootstrap and frame/tick loop
```

### Key Principles
- **Deterministic world updates:** All game state changes are command-based and deterministic
- **JSON-serializable state:** World state must be serializable for LLM context creation
- **Layer isolation:** No game logic in rendering; no rendering in world model
- **Descriptive naming:** Types and interfaces use clear names for LLM reasoning

### Baseline Runtime Loop

The current baseline runtime in `src/main.ts` follows this loop:

1. Keyboard input maps to `WorldCommand` values and is enqueued into `CommandBuffer`.
2. A fixed simulation tick of 100ms drains buffered commands.
3. `world.applyCommands(commands)` updates deterministic state and advances `tick`.
4. If an `interact` command was issued, nearby NPC interaction is resolved through the interaction service and LLM client boundary.
5. Every animation frame renders the latest world state through the Pixi render port and prints JSON state in the debug panel.

## Development Workflow

### Branch Naming
Feature branches use the format: `feature/<github-issue-number>-<kebab-case-summary>`

Example: `feature/1-setup-basic-structure`

### PR Workflow

1. **Create a feature branch** from `main`
2. **Categorize work** as one of:
   - `AI_BEHAVIOR` — Copilot agent/skill customization changes
   - `CHANGE` — Feature/game logic/rendering implementation
   - `REFACTORING` — Code reorganization without behavior change
3. **Add the appropriate GitHub label** to your PR
4. **Open a PR** with a clear description of changes and validation performed
5. **Request review** using the reviewer agent (see below)

### Adding PR Labels

Labels are added automatically via GitHub API during PR creation or review. The category labels are:
- `AI_BEHAVIOR` — Copilot agent/skill changes
- `CHANGE` — Feature/gameplay/rendering changes  
- `REFACTORING` — Code reorganization without behavior change

## Agents & Skills

The project uses Copilot agents and skills for automated code review and task management:

### Agents
- **developer** — Implements GitHub issues for the project
- **reviewer** — Reviews PRs against issue acceptance criteria
- **requirement engineer** — Creates and refines GitHub issues

### Locating Agents & Skills
- Agents: [.github/agents/](/.github/agents/)
- Skills: [.github/skills/](/.github/skills/)
- Project instructions: [.github/copilot-instructions.md](/.github/copilot-instructions.md)

## Project Management

### GitHub Issues
Issues are tracked as GitHub issues instead of Jira. Each issue includes:
- Clear summary and description
- Acceptance criteria (testable outcomes)
- Labels for categorization

## Testing & Validation

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
4. Press `E` when not adjacent to an NPC and confirm the interaction panel says no NPC is nearby.

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
