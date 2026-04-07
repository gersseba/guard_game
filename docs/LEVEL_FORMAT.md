# Level Format v2

This document defines the authoring contract for Guard Game level files.

## Versioning

- Every level file must include `"version": 2`.
- Any level with a missing version or a version other than `2` is rejected by runtime validation.

## Top-Level Fields

Required top-level authoring fields:

- `id: string`
  - Stable level identifier used by manifest entries and tooling.
- `name: string`
  - Human-readable level title.
- `version: number`
  - Must be `2`.
- `grid: { width: number, height: number, tileSize?: number }`
  - Grid dimensions for deterministic movement and bounds checks.
- `startPosition: { x: number, y: number }`
  - Initial player tile coordinate.

Runtime JSON compatibility fields currently consumed by the game loader:

- `width: number`
- `height: number`
- `player: { x: number, y: number, spriteAssetPath?: string, spriteSet?: SpriteSet }`

When authoring new levels, keep `grid.width === width`, `grid.height === height`, and `startPosition` equal to `player` coordinates.

## Entity Sections

### guards

```json
{
  "id": "guard-1",
  "displayName": "Gate Guard",
  "x": 10,
  "y": 7,
  "guardState": "idle",
  "traits": {
    "truthMode": "truth-teller"
  },
  "spriteAssetPath": "/assets/medieval_guard_shield_spear_front.svg",
  "spriteSet": {
    "default": "/assets/medieval_guard_shield_spear_front.svg"
  },
  "itemUseRules": {
    "gold-coin": {
      "allowed": true,
      "responseText": "A bribe? Move along."
    }
  }
}
```

- `guardState`: `idle | patrolling | alert`
- `traits.truthMode`: `truth-teller | liar` (required by coverage checks)

### npcs

```json
{
  "id": "npc-1",
  "displayName": "Archivist",
  "x": 8,
  "y": 9,
  "npcType": "archive_keeper"
}
```

- `npcType` must be a non-empty string.
- Optional NPC fields: `patrol`, `triggers`, `inventory`, `instanceKnowledge`, `instanceBehavior`, `riddleClue`.

### doors

```json
{
  "id": "door-safe",
  "displayName": "Left Door",
  "x": 7,
  "y": 8,
  "doorState": "locked",
  "requiredItemId": "armory-key",
  "outcome": "safe"
}
```

- `doorState`: `open | closed | locked`
- `outcome`: `safe | danger` (used for level result)

### interactiveObjects

```json
{
  "id": "tool-chest",
  "displayName": "Tool Chest",
  "x": 5,
  "y": 9,
  "objectType": "supply-crate",
  "interactionType": "inspect",
  "state": "idle",
  "capabilities": {
    "containsItems": true
  }
}
```

- `interactionType`: `inspect | use | talk`
- `state`: `idle | used`
- `capabilities` is required by coverage checks.

### environments

```json
{
  "id": "wall-1",
  "displayName": "Stone Wall",
  "x": 6,
  "y": 7,
  "isBlocking": true
}
```

- `environments` is an optional top-level array.
- Each environment entry requires `id`, `displayName`, `x`, `y`, and `isBlocking`.
- `isBlocking: true` blocks movement into that tile.
- Environments participate in overlap validation with all other world entities.
- Environments are spatial-only and are not valid interaction targets.

### player

Runtime field:

```json
{
  "player": {
    "x": 10,
    "y": 12
  }
}
```

Authoring alias:

```json
{
  "startPosition": {
    "x": 10,
    "y": 12
  }
}
```

## Capability Blocks

Interactive object `capabilities` flags:

- `containsItems: boolean`
  - Object can provide a `pickupItem` during interaction.
- `isActivatable: boolean`
  - Object can trigger an activation flow and state changes.
- `isLockable: boolean`
  - Object participates in lock/unlock style behavior.

These flags are independent and can be combined.

## Trait and Fact Fields

Entity trait/fact bags are string-keyed maps.

- `traits: Record<string, string>`
  - Example: `traits.truthMode = "truth-teller"`.
- `facts: Record<string, string | number | boolean>`
  - Used for deterministic state facts referenced by prompts or interactions.

Guard truth mode allowed values:

- `truth-teller`
- `liar`

Riddle clue truth behavior allowed values:

- `truthful`
- `inverse`

## Item Definitions and Use Rules

Pickup items on objects:

```json
"pickupItem": {
  "itemId": "armory-key",
  "displayName": "Armory Key"
}
```

Item use rules on guards/objects:

```json
"itemUseRules": {
  "armory-key": {
    "allowed": true,
    "responseText": "The lock clicks open."
  }
}
```

- `allowed: boolean` determines whether use succeeds.
- `responseText: string` is shown to the player.

## Annotated Minimal Example

```json
{
  "id": "minimal-v2",
  "name": "Minimal v2",
  "version": 2,
  "grid": {
    "width": 20,
    "height": 20,
    "tileSize": 48
  },
  "startPosition": {
    "x": 10,
    "y": 10
  },
  "width": 20,
  "height": 20,
  "premise": "A compact authoring sample.",
  "goal": "Reach the safe door.",
  "player": {
    "x": 10,
    "y": 10
  },
  "guards": [
    {
      "id": "guard-1",
      "displayName": "Guide Guard",
      "x": 9,
      "y": 10,
      "guardState": "idle",
      "traits": {
        "truthMode": "truth-teller"
      }
    }
  ],
  "doors": [
    {
      "id": "door-safe",
      "displayName": "Safe Door",
      "x": 10,
      "y": 8,
      "doorState": "closed",
      "outcome": "safe"
    }
  ],
  "npcs": [
    {
      "id": "npc-1",
      "displayName": "Archivist",
      "x": 11,
      "y": 10,
      "npcType": "archive_keeper"
    }
  ],
  "interactiveObjects": [
    {
      "id": "supply-crate",
      "displayName": "Supply Crate",
      "x": 10,
      "y": 11,
      "objectType": "supply-crate",
      "interactionType": "inspect",
      "state": "idle",
      "capabilities": {
        "containsItems": true,
        "isActivatable": false,
        "isLockable": false
      },
      "pickupItem": {
        "itemId": "supply-key",
        "displayName": "Supply Key"
      }
    }
  ]
}
```

Notes:

- Include both authoring aliases (`grid`, `startPosition`) and runtime-consumed fields (`width`, `height`, `player`) until loader convergence is complete.
- Keep all world-facing values JSON-serializable.
