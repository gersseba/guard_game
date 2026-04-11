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

- Runtime resolves layout by filename convention from the selected JSON URL:
  - `<level-id>.json` -> `<level-id>.layout.txt` in the same directory.
- Example: `/levels/riddle.json` loads `/levels/riddle.layout.txt` first.
- `width`/`height` are no longer part of runtime level authoring.

## Deterministic Load Order

Runtime composition order is fixed:

1. Resolve and parse layout text.
2. Parse/validate level JSON metadata and entities.
3. Validate entity placement against layout bounds + blocking cells.
4. Compose `WorldState`.

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
2. Remove `width` and `height` from level JSON.
3. Ensure level JSON filename and layout filename share the same `<level-id>` stem.
4. Ensure all placeable entities are inside bounds and not on `#`.
5. Run tests and fix any placement/layout validation errors.

There is no runtime compatibility path for legacy no-layout levels.
