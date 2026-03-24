# Guard Game

A browser-based 2D grid game about solving puzzles by talking to NPCs using LLMs.

## Development Setup

### Requirements
- Node.js 18+ / npm
- **GitHub CLI** (required for project management and PR operations)

### Install GitHub CLI

GitHub CLI (`gh`) is required for managing GitHub Projects, adding PRs to projects, and automating workflow tasks.

**macOS (Homebrew):**
```bash
brew install gh
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt-get install gh
```

**Windows (Chocolatey):**
```bash
choco install gh
```

**Or download from:** https://cli.github.com/

**Authenticate after installation:**
```bash
gh auth login
```

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
  /world          — Deterministic world model (entities, state, commands)
  /render         — PixiJS rendering layer (display only)
  /interaction    — NPC interaction pipeline
  /input          — Player input handling and command mapping
  /llm            — LLM API integration boundary
  main.ts         — Application entry point and main loop
```

### Key Principles
- **Deterministic world updates:** All game state changes are command-based and deterministic
- **JSON-serializable state:** World state must be serializable for LLM context creation
- **Layer isolation:** No game logic in rendering; no rendering in world model
- **Descriptive naming:** Types and interfaces use clear names for LLM reasoning

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

```bash
# Using GitHub CLI
gh pr edit <number> --add-label AI_BEHAVIOR
# or CHANGE or REFACTORING

# Using GitHub Web UI
# Go to PR → Labels section → select category label
```

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
- Project board assignment

### GitHub Projects
Use GitHub Projects for task board visibility:

```bash
# View projects
gh project list --owner gersseba

# Add PR to project
gh pr edit <number> --projects "Project Name"

# Add issue to project
gh issue edit <number> --projects "Project Name"
```

## Testing & Validation

Before opening a PR, ensure:
- `npm run build` completes without errors
- `npm run lint` passes without warnings
- `npm run test` passes
- Manual testing confirms the change works as intended
- Logs or screenshots are included in PR description for verification

## Resources

- **Repository:** https://github.com/gersseba/guard_game
- **Main branch:** main
- **Development branch template:** feature/<issue>-<summary>
- **Project board:** GitHub Projects (accessible from repository)

## Troubleshooting

### GitHub CLI Authentication
If `gh` commands fail with authentication errors:
```bash
gh auth logout
gh auth login
```

### Build Issues
```bash
# Clean rebuild
rm -rf node_modules dist
npm install
npm run build
```

## License

See [LICENSE](LICENSE) file for details.
