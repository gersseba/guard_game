# Guard Facing Direction (Ticket #93)

This note documents the guard-facing token flow introduced in ticket #93 and referenced by PR #96.

## 1. Guard-facing world state and interaction-derived mapping

Guard orientation is now represented as a world-owned, serializable token on each guard:

- `guards[*].facingDirection?: SpriteDirection`
- `SpriteDirection = 'front' | 'away' | 'left' | 'right'`

The interaction layer derives this token when a guard interaction starts without a player message:

- Mapping function: [src/interaction/guardFacing.ts](../src/interaction/guardFacing.ts)
- Dispatch integration: [src/interaction/interactionDispatcher.ts](../src/interaction/interactionDispatcher.ts)

Deterministic mapping from player approach position relative to the guard:

- player west of guard (`deltaX = -1`, `deltaY = 0`) -> `left`
- player east of guard (`deltaX = 1`, `deltaY = 0`) -> `right`
- player north of guard (`deltaX = 0`, `deltaY = -1`) -> `away`
- player south of guard (`deltaX = 0`, `deltaY = 1`) -> `front`

Fallback behavior for non-orthogonal or unexpected positions:

1. Keep existing `guard.facingDirection` when present.
2. Otherwise default to `front`.

On conversational open, the dispatcher returns `updatedWorldState` with the guard's facing token updated immutably before conversation UI side effects run (through result-dispatch world update ordering).

## 2. Render consumption of guard-facing token

Render now consumes `guard.facingDirection` for both sprite mode selection and sprite load requests.

Primary entry points:

- [src/render/scene.ts](../src/render/scene.ts)

Behavior:

- Guard sprite path resolution calls `resolveCharacterSpriteAssetPath(guard, guard.facingDirection ?? DEFAULT_RENDER_DIRECTION)`.
- If a direction-specific sprite exists in `spriteSet`, that directional sprite is requested/used.
- If directional key is missing, deterministic fallback order still applies in `resolveSpriteAssetPathForDirection(...)`.
- If resolved assets are unavailable or failed, guard rendering falls back to marker mode without mutating world state.

This preserves layer boundaries:

- Interaction/world author the orientation token.
- Render only consumes the token to resolve visual assets.

## 3. Testing coverage updates for guard-facing behavior

New and relevant tests:

- [src/interaction/guardFacing.test.ts](../src/interaction/guardFacing.test.ts)
- [src/interaction/interactionDispatcher.test.ts](../src/interaction/interactionDispatcher.test.ts)
- [src/render/scene.test.ts](../src/render/scene.test.ts)

Coverage highlights:

- Full mapping validation for all four approach directions (`left`, `right`, `away`, `front`).
- Guard facing is written on interaction start (sync chat-open path).
- Guard facing stays stable across active conversational turns.
- Render selects guard directional sprite mode from `guard.facingDirection` when directional assets are available.

## Cross-layer summary

Ticket #93 introduced a deterministic cross-layer contract:

1. Interaction derives and stores guard-facing token in world state.
2. Result dispatcher applies updated world state before opening conversation UI.
3. Render uses the token to choose directional guard sprites.
4. Tests cover mapping correctness, persistence timing, and render consumption.
