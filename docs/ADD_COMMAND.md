# Add a Command

This pattern describes how to add a new player action (`WorldCommand`) in the current runtime architecture.

## Overview

Commands represent player actions that are buffered and then applied deterministically during the world tick.

## Steps

### 1. Define the Command
Add a new command variant to `WorldCommand` in `src/world/types.ts`:

```typescript
export type WorldCommand =
  | { type: 'move'; dx: number; dy: number }
  | { type: 'interact' }
  | { type: 'yourNewCommand'; payload?: string };
```

### 2. Map Input to Command
Update keyboard mapping in `src/input/keyboard.ts` to emit your new command:

```typescript
const keyToCommandMap: Record<string, WorldCommand> = {
  e: { type: 'interact' },
  f: { type: 'useSelectedItem' },
};

export const mapKeyboardEventToWorldCommand = (key: string): WorldCommand | null => {
  if (/^[1-9]$/.test(key)) {
    return { type: 'selectInventorySlot', slotIndex: Number(key) - 1 };
  }

  return keyToCommandMap[key] ?? null;
};
```

### 3. Apply Command in World
Update `src/world/world.ts` to handle the command in world application logic:

```typescript
const applyCommand = (worldState: WorldState, command: WorldCommand): WorldState => {
  if (command.type === 'selectInventorySlot') {
    const selectedCandidate = worldState.player.inventory.items[command.slotIndex];
    const selectedItem = selectedCandidate
      ? { slotIndex: command.slotIndex, itemId: selectedCandidate.itemId }
      : null;

    return {
      ...worldState,
      player: {
        ...worldState.player,
        inventory: { ...worldState.player.inventory, selectedItem },
      },
    };
  }

  return worldState;
};
```

### 4. (Optional) Add Rendering
If your command produces an event consumed by runtime orchestration (without direct world mutation):
- add a deterministic resolver boundary in `src/interaction/*`
- wire it through `src/runtimeController.ts` dependency callbacks
- commit the resulting serializable event/state from the callback wiring in `src/runtime/createRuntimeApp.ts`

If your command needs new runtime UI handoff behavior (for example, a modal or bridge callback):
- keep command draining/gating in `src/runtimeController.ts`
- keep interaction/result routing in `src/runtime/interactionResultBridge.ts`
- keep modal lifecycle behavior in `src/runtime/modalCoordinator.ts`

If your command changes visual appearance through world state:
- Update `src/render/scene.ts` to render any new state
- Ensure render reflects world state after command is applied

### 5. Write Tests
Add focused tests:
- input mapping tests in `src/input/keyboard.test.ts`
- world command determinism tests in `src/world/world.test.ts`
- runtime orchestration tests in `src/runtimeController.test.ts` when command effects route through runtime callbacks
- runtime bridge or modal-coordinator tests in `src/runtime/*.test.ts` when the command changes runtime handoff behavior

```typescript
test('selects valid inventory slot deterministically', () => {
  // Arrange inventory with known item order
  // Apply { type: 'selectInventorySlot', slotIndex: 1 }
  // Assert selectedItem reflects slot 1 item id
});

test('emits deterministic item-use event for each useSelectedItem command', () => {
  // Enqueue multiple commands in one tick
  // Step runtime controller
  // Assert callback events include stable tick and commandIndex values
});
```

## Checklist

- [ ] Command type added to `WorldCommand` union in `src/world/types.ts`
- [ ] Input mapping added to `src/input/keyboard.ts`
- [ ] Command application logic added to `src/world/world.ts`
- [ ] Unit tests written in `src/world/world.test.ts`
- [ ] Runtime-controller tests added in `src/runtimeController.test.ts` when command uses callback/resolver boundaries
- [ ] (Optional) Render updates in `src/render/scene.ts`
- [ ] Input layer tests in `src/input/keyboard.test.ts`
- [ ] State remains JSON-serializable
- [ ] Command behavior is deterministic

---

See [Input Layer](INPUT_LAYER.md) and [World Layer](WORLD_LAYER.md) for architectural context.
