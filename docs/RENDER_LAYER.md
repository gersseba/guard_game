# Render Layer

The render layer is responsible for translating world state into visual representation via PixiJS. It reads from world state but does not modify it.

## Responsibilities
- Initialize PixiJS application and root container
- Draw grid, sprites, and UI elements based on world state
- Manage camera/viewport positioning
- Handle sprite lifecycle (create, update transform, destroy)
- Keep rendering code free of game logic

## Core Concepts

### Render Port
A PixiJS-based rendering interface that consumes `WorldState` and produces visual output. No game logic is permitted here.

### Sprite Management
Sprites represent game entities (player, NPCs, interactive objects). Each sprite is updated every frame to reflect world state.

### Camera/Viewport
Manages the visible area of the grid. Follows the player and ensures world coordinates map to screen coordinates correctly.

## Extension Pattern: Add a new sprite type

When adding a new entity type to the world (new NPC type, new interactive object):
1. Define the sprite in the render layer
2. Update the render loop to draw it based on world state
3. Ensure sprite position/rotation/appearance matches world state exactly

See [System Architecture](ARCHITECTURE.md) for the rendering contract.

---

*Detailed extension patterns and sprite factory utilities will be documented as rendering features are implemented.*
