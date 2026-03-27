# Interaction Layer

The interaction layer resolves player-triggered interactions and routes them to the correct handler type.

It now supports both conversational interactions (guards/NPCs) and deterministic object interactions (interactive objects such as supply crates).

## Responsibilities
- Resolve one adjacent interaction target deterministically
- Route target kinds to the correct interaction handler
- Keep deterministic interactions local and synchronous
- Keep LLM-backed chat interactions behind the LLM boundary
- Return immutable world-state updates for world reset/apply

## Target Resolution

`resolveAdjacentTarget()` in `src/interaction/adjacencyResolver.ts` resolves orthogonally adjacent targets in a deterministic order:
1. `guard`
2. `door`
3. `npc`
4. `interactiveObject`

Tie-break inside the same kind is lexical target id order.

This behavior is covered by `src/interaction/adjacencyResolver.test.ts`.

## Routing Contract

Interaction routing is handled in `runInteractionIfRequested()` in `src/main.ts`.

- `guard`: opens chat modal using guard history
- `door`: executes `handleDoorInteraction()` and applies level outcome if present
- `interactiveObject`: executes `handleInteractiveObjectInteraction()` and resets world to returned immutable state
- `npc`: opens chat modal using NPC conversation history

## Interactive Object Type Handling

`src/interaction/objectInteraction.ts` provides object-type dispatch:
- `OBJECT_TYPE_HANDLERS` maps `InteractiveObject['objectType']` to a handler
- Current supported type: `supply-crate`
- Handler reads instance fields (`idleMessage`, `usedMessage`, `firstUseOutcome`) while reusing shared object-type logic

This allows multiple objects to share one behavior implementation while retaining per-instance outcomes/messages from level JSON.

## LLM Boundary

Only conversational flows route to the LLM layer (guard/NPC chat services). Object and door interactions are deterministic and do not call the LLM client.

See `src/interaction/guardInteraction.ts`, `src/interaction/npcInteraction.ts`, and `src/llm/client.ts`.

## Tests

- `src/interaction/objectInteraction.test.ts`: object-type dispatcher behavior, first-use outcomes, repeat interactions
- `src/integration/starterLevel.test.ts`: end-to-end adjacent object resolution and state updates
- `src/interaction/adjacencyResolver.test.ts`: deterministic target resolution with interactive objects
