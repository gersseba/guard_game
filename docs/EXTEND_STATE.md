# Extend World State

This pattern describes how to expand `WorldState` to include new data while preserving JSON serializability and architectural integrity.

## Overview

As features grow, world state must often expand. This can include:
- New entity types (interactive objects, items, environmental data)
- New fields on existing entities (player stats, NPC memory)
- Level or session metadata

The challenge is expanding state without breaking serialization or coupling layers.

## Principles

1. **Keep state JSON-serializable.** Avoid functions, circular references, or non-primitive types.
2. **Name fields clearly.** Use semantic, LLM-friendly names; avoid abbreviations.
3. **Immutability in world updates.** Create new objects rather than mutating existing state.
4. **Layer isolation.** Render layer reads state but does not modify it.

## Steps

### 1. Design the New State Field

Before coding, answer:
- **What does this represent?** (Be specific for LLM reasoning)
- **Is it JSON-serializable?** (No functions, no circular refs)
- **Where does it logically belong?** (Player? Level? NPC?)
- **How does it change?** (Commands? External events?)

**Example: Adding player stamina**
```typescript
// Good: Clearly named, numeric, bounded
interface Player {
  id: string;
  position: [number, number];
  orientation: number;
  inventory: string[];
  stamina: number; // 0-100, decreases on move, recovers on wait
}

// Bad: Unclear, hard to serialize, unclear semantics
interface Player {
  id: string;
  position: [number, number];
  // ...
  state: unknown; // Too vague
  update: () => void; // Functions not serializable
}
```

### 2. Add Type Definition

Update `src/world/types.ts`:

```typescript
export interface WorldState {
  tick: number;
  player: Player;
  npcs: Npc[];
  interactiveObjects: InteractiveObject[];
  levelId: string;
  playerStamina?: number; // Optional if backward compat needed
  levelStats?: {
    guardsDefeated: number;
    itemsCollected: number;
    timeElapsed: number;
  };
}

export interface Player {
  id: string;
  position: [number, number];
  orientation: number;
  inventory: string[];
  stamina: number; // 0-100
}
```

### 3. Update Command Handling

If the new state changes in response to commands, update `src/world/world.ts`:

```typescript
applyCommands(state: WorldState, commands: WorldCommand[]): WorldState {
  let newState = { ...state };
  
  for (const cmd of commands) {
    if (cmd.type === 'MOVE_FORWARD') {
      const newPos = advancePosition(
        newState.player.position,
        newState.player.orientation,
        1
      );
      
      // Check if move is valid (stamina, obstacles, etc.)
      const staminaCost = calculateStaminaCost('move', newState);
      if (newState.player.stamina < staminaCost) {
        // Silently reject or handle gracefully
        continue;
      }
      
      // Apply move and update stamina
      newState.player = {
        ...newState.player,
        position: newPos,
        stamina: newState.player.stamina - staminaCost,
      };
    } else if (cmd.type === 'WAIT') {
      // Recover stamina
      newState.player = {
        ...newState.player,
        stamina: Math.min(100, newState.player.stamina + 10),
      };
    }
  }
  
  return newState;
}
```

### 4. Update Rendering (if needed)

Update `src/render/scene.ts` to display new state:

```typescript
// If stamina is visual
function renderPlayerStamina(player: Player): PIXI.Graphics {
  const bar = new PIXI.Graphics();
  const staminaPercent = player.stamina / 100;
  
  bar.beginFill(0x00ff00);
  bar.drawRect(0, 0, staminaPercent * 64, 8);
  
  bar.x = player.position[0] * TILE_SIZE;
  bar.y = player.position[1] * TILE_SIZE - 16;
  
  return bar;
}

// In render loop
for (const player of state.players || [state.player]) {
  const staminaBar = renderPlayerStamina(player);
  container.addChild(staminaBar);
}
```

### 5. Test Serialization

Write a test to verify JSON round-trip:

```typescript
test('World state is fully JSON-serializable', () => {
  const state = createWorldState({
    player: { stamina: 50 },
    levelStats: { guardsDefeated: 2 },
  });
  
  // Serialize and deserialize
  const json = JSON.stringify(state);
  const deserialized = JSON.parse(json);
  
  // Assert structure is preserved
  expect(deserialized.player.stamina).toBe(50);
  expect(deserialized.levelStats.guardsDefeated).toBe(2);
});

test('New state field behavior is deterministic', () => {
  const initial = createWorldState({ player: { stamina: 100 } });
  const commands = [MoveForward, MoveForward];
  
  const result1 = world.applyCommands(initial, commands);
  const result2 = world.applyCommands(initial, commands);
  
  expect(result1.player.stamina).toBe(result2.player.stamina);
});
```

### 6. Update Tests and Fixtures

Update test utilities to initialize new fields:

```typescript
function createMockPlayer(overrides?: Partial<Player>): Player {
  return {
    id: 'player_test',
    position: [5, 5],
    orientation: 0,
    inventory: [],
    stamina: 100, // Add here
    ...overrides,
  };
}

function createWorldState(overrides?: Partial<WorldState>): WorldState {
  return {
    tick: 0,
    player: createMockPlayer(),
    npcs: [],
    interactiveObjects: [],
    levelId: 'test',
    playerStamina: 100, // Initialize
    ...overrides,
  };
}
```

## Checklist

- [ ] New field design documented (what it represents, how it changes)
- [ ] Type definition updated in `src/world/types.ts`
- [ ] Command handling updated in `src/world/world.ts` if state changes
- [ ] Rendering updated in `src/render/scene.ts` if visual
- [ ] Serialization test written
- [ ] Determinism test written for new behaviors
- [ ] Test fixtures and mocks updated
- [ ] JSON serialization verified in browser console
- [ ] Documentation updated (this reference, relevant layer guides)
- [ ] No circular references or functions in new fields
- [ ] Field names are semantic for LLM reasoning

## Common Pitfalls

**Circular references:** Avoid storing parent references or bidirectional links in world state. Use IDs instead.

```typescript
// Bad
interface Npc {
  id: string;
  level: WorldState; // Circular!
}

// Good
interface Npc {
  id: string;
  levelId: string; // Reference by ID
}
```

**Functions and class instances:** World state must serialize to JSON.

```typescript
// Bad
interface Player {
  // ...
  update: () => void; // Functions can't serialize
}

// Good
// Logic goes in world.applyCommands(), not in entities
interface Player {
  // ...
  stamina: number;
}
```

**Mutable operations:** Always create new objects in updates.

```typescript
// Bad
state.player.stamina -= 10; // Mutates existing state

// Good
state.player = { ...state.player, stamina: state.player.stamina - 10 };
```

---

See [World Layer](WORLD_LAYER.md) and [Type Reference](TYPES_REFERENCE.md) for context.
