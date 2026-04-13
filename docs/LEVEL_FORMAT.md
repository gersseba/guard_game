# Level Format v2 (Layout + JSON Cutover)

Guard Game levels now use a two-file package:

1. Plain-text layout file (`.layout.txt`) for grid geometry
2. Level JSON (`.json`) for metadata + entities

## Layout File Contract

- One row per line
- Required symbols only:
  - `#` = blocking wall tile
  - `.` = walkable tile
- Layout must be:
  - non-empty
  - rectangular (all rows equal width)
- Grid dimensions are derived from layout only:
  - `width = row length`
  - `height = row count`

## Level JSON Contract

Required top-level fields:

- `version: 2`
- `layoutPath: string` (required relative path to layout file, resolved from level JSON location)
- `name: string`
- `premise: string`
- `goal: string`
- `player`
- `guards`
- `doors`

Optional top-level fields:

- `objective`
- `npcs`
- `interactiveObjects`
- `environments`

Notes:

- Runtime loads layout first using deterministic filename convention:
  - `<level-id>.json` -> `<level-id>.layout.txt` in the same directory.
- After JSON loads, `layoutPath` is required and must resolve (relative to the level JSON URL) to the same layout resource already loaded.
- Example: `/levels/riddle.json` loads `/levels/riddle.layout.txt` first, and JSON must contain `"layoutPath": "riddle.layout.txt"`.
- `width`/`height` are no longer part of runtime level authoring.

## Door Unlock Requirements

Doors support two deterministic key schemas:

- Legacy single-key: `requiredItemId: string`
- Multi-key: `requiredItemIds: string[]`

Rules:

- `requiredItemIds` must be a non-empty array of unique, non-empty strings.
- A door must not define both `requiredItemId` and `requiredItemIds`.
- For `requiredItemIds`, item-use unlock succeeds only when:
  - selected inventory item is one of the listed required key IDs, and
  - player inventory contains the full required key set.
- Keys are not consumed by door unlock.

## Deterministic Load Order

Runtime composition order is fixed:

1. Resolve and parse layout text.
2. Parse/validate level JSON metadata and entities.
3. Validate entity placement against layout bounds + blocking cells.
4. Compose `WorldState`.

## Level Catalog Registration

After adding a new `<level-id>.layout.txt` + `<level-id>.json` package under `public/levels/`,
register it in `public/levels/manifest.json`.

- `id` must match the `<level-id>` filename stem.
- `name` should be the player-facing title shown in the level selector.
- Keep IDs stable once published so saved links and test fixtures remain deterministic.

## Placement Validation Rules

For placeable entities (`player`, `guards`, `doors`, `npcs`, `interactiveObjects`):

- Placement must be in bounds.
- Placement must not be on a `#` cell.

## Authoring Example

### `public/levels/example.layout.txt`

```text
####################
#..............#...#
#..##...........#..#
#...............#..#
####################
```

### `public/levels/example.json`

```json
{
  "version": 2,
  "layoutPath": "example.layout.txt",
  "name": "Example",
  "premise": "A compact layout + entity sample.",
  "goal": "Reach the safe door.",
  "player": { "x": 2, "y": 1 },
  "guards": [
    {
      "id": "guard-1",
      "displayName": "Gate Guard",
      "x": 5,
      "y": 2,
      "guardState": "idle"
    }
  ],
  "doors": [
    {
      "id": "door-safe",
      "displayName": "Safe Door",
      "x": 17,
      "y": 1,
      "isOpen": false,
      "isLocked": false,
      "isSafe": true
    }
  ]
}
```

## Migration Guidance (Hard Cutover)

To migrate an old single-JSON level:

1. Create `<level-id>.layout.txt` and encode geometry using only `#` and `.`.
2. Add `layoutPath` to level JSON with a relative path (for example, `"riddle.layout.txt"`).
3. Remove `width` and `height` from level JSON.
4. Ensure level JSON filename and layout filename share the same `<level-id>` stem.
5. Ensure all placeable entities are inside bounds and not on `#`.
6. Run tests and fix any placement/layout validation errors.

There is no runtime compatibility path for legacy no-layout levels.
