# Add a Command

This pattern describes how to add a new player action (WorldCommand).

## Overview

Commands represent player actions or system events that cause world state to change. Each command is applied deterministically during the world tick.

## Steps

### 1. Define the Command
Add a new command variant to `WorldCommand` in `src/world/types.ts`:

```typescript
export type WorldCommand = 
  | MoveForward
  | MoveBackward
  | TurnLeft
  | TurnRight
  | Interact
  | Wait
  | YourNewCommand; // Add here

export interface YourNewCommand {
  type: 'YOUR_NEW_COMMAND';
  // Optional payload
  targetId?: string;
  metadata?: Record<string, unknown>;
}
```

### 2. Map Input to Command
Update the input layer in `src/input/commands.ts` to map keyboard (or other input) to your new command:

```typescript
export function mapKeyboardToCommand(keyCode: string): WorldCommand | null {
  switch (keyCode) {
    case 'ArrowUp': return { type: 'MOVE_FORWARD' };
    case 'ArrowDown': return { type: 'MOVE_BACKWARD' };
    case 'ArrowLeft': return { type: 'TURN_LEFT' };
    case 'ArrowRight': return { type: 'TURN_RIGHT' };
    case 'Space': return { type: 'INTERACT' };
    case 'YourKey': return { type: 'YOUR_NEW_COMMAND' }; // Add here
    default: return null;
  }
}
```

### 3. Apply Command in World
Update `src/world/world.ts` to handle the new command in `applyCommands()`:

```typescript
applyCommands(state: WorldState, commands: WorldCommand[]): WorldState {
  let newState = { ...state };
  
  for (const cmd of commands) {
    if (cmd.type === 'MOVE_FORWARD') {
      newState.player.position = advancePosition(
        newState.player.position,
        newState.player.orientation,
        1
      );
    } else if (cmd.type === 'YOUR_NEW_COMMAND') {
      // Apply your command logic here
      newState = applyYourNewCommand(newState, cmd);
    }
    // ... other commands
  }
  
  return newState;
}
```

### 4. (Optional) Add Rendering
If your command changes the visual appearance:
- Update `src/render/scene.ts` to render any new state
- Ensure render reflects world state after command is applied

### 5. Write Tests
Add unit tests in `src/world/world.test.ts`:

```typescript
test('YOUR_NEW_COMMAND updates state correctly', () => {
  const initial = createWorldState({ player: { /* ... */ } });
  const command: YourNewCommand = { type: 'YOUR_NEW_COMMAND' };
  const result = world.applyCommands(initial, [command]);
  
  expect(result.player.someField).toBe(expectedValue);
});

test('YOUR_NEW_COMMAND is deterministic', () => {
  const initial = createWorldState({});
  const cmd = { type: 'YOUR_NEW_COMMAND' };
  const result1 = world.applyCommands(initial, [cmd]);
  const result2 = world.applyCommands(initial, [cmd]);
  expect(result1).toEqual(result2);
});
```

## Checklist

- [ ] Command type added to `WorldCommand` union in `src/world/types.ts`
- [ ] Input mapping added to `src/input/commands.ts`
- [ ] Command application logic added to `src/world/world.ts` → `applyCommands()`
- [ ] Unit tests written in `src/world/world.test.ts`
- [ ] (Optional) Render updates in `src/render/scene.ts`
- [ ] (Optional) Input layer tests in `src/input/keyboard.test.ts`
- [ ] State remains JSON-serializable
- [ ] Command behavior is deterministic

---

See [Input Layer](INPUT_LAYER.md) and [World Layer](WORLD_LAYER.md) for architectural context.
