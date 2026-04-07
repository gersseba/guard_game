import { describe, expect, it } from 'vitest';
import {
  validateGridPositionInBounds,
  validateInventoryItems,
  validateItemUseRules,
  validateNpcTriggers,
  validateObjectCapabilities,
  validateSpriteSet,
  validateTriggerEffect,
} from './shared';

describe('validateSpriteSet', () => {
  it('accepts a spriteSet with at least one valid path', () => {
    expect(() => validateSpriteSet({ default: '/assets/sprite.svg' }, 'player')).not.toThrow();
  });

  it('throws when spriteSet is not an object', () => {
    expect(() => validateSpriteSet('bad', 'player')).toThrowError(
      'player spriteSet must be an object when provided',
    );
  });

  it('throws when spriteSet has no configured paths', () => {
    expect(() => validateSpriteSet({}, 'npc at index 0')).toThrowError(
      'npc at index 0 spriteSet must provide at least one sprite path',
    );
  });

  it('throws when a spriteSet key value is not a string', () => {
    expect(() => validateSpriteSet({ front: 42 }, 'guard at index 0')).toThrowError(
      'guard at index 0 spriteSet.front must be a string when provided',
    );
  });
});

describe('validateItemUseRules', () => {
  it('accepts a valid itemUseRules map', () => {
    expect(() =>
      validateItemUseRules({ token: { allowed: true, responseText: 'You may pass.' } }, 'guard at index 0'),
    ).not.toThrow();
  });

  it('throws when itemUseRules is not an object', () => {
    expect(() => validateItemUseRules('bad', 'guard at index 0')).toThrowError(
      'itemUseRules must be an object when provided',
    );
  });

  it('throws when a rule is missing allowed boolean', () => {
    expect(() =>
      validateItemUseRules({ key: { allowed: 'yes', responseText: 'ok' } }, 'guard at index 0'),
    ).toThrowError('key.allowed must be a boolean');
  });

  it('throws when a rule is missing responseText string', () => {
    expect(() =>
      validateItemUseRules({ key: { allowed: true, responseText: 42 } }, 'guard at index 0'),
    ).toThrowError('key.responseText must be a string');
  });
});

describe('validateObjectCapabilities', () => {
  it('does nothing when value is undefined', () => {
    expect(() => validateObjectCapabilities(undefined, 'obj')).not.toThrow();
  });

  it('accepts valid capability flags', () => {
    expect(() =>
      validateObjectCapabilities({ containsItems: true, isActivatable: false }, 'obj'),
    ).not.toThrow();
  });

  it('throws when an unknown capability key is present', () => {
    expect(() =>
      validateObjectCapabilities({ containsItems: true, unknown: false }, 'obj'),
    ).toThrowError("capabilities has unknown key 'unknown'");
  });

  it('throws when a capability value is not a boolean', () => {
    expect(() =>
      validateObjectCapabilities({ containsItems: 'yes' }, 'obj'),
    ).toThrowError('capabilities.containsItems must be a boolean when provided');
  });
});

describe('validateGridPositionInBounds', () => {
  it('accepts a position within grid bounds', () => {
    expect(() => validateGridPositionInBounds({ x: 5, y: 5 }, 'npc patrol', 20, 20)).not.toThrow();
  });

  it('throws when position is not an object', () => {
    expect(() => validateGridPositionInBounds('bad', 'label', 20, 20)).toThrowError(
      'must be an object with numeric x and y',
    );
  });

  it('throws when position is missing numeric x or y', () => {
    expect(() => validateGridPositionInBounds({ x: 1 }, 'label', 20, 20)).toThrowError(
      'must include numeric x and y',
    );
  });

  it('throws when position x is out of bounds', () => {
    expect(() => validateGridPositionInBounds({ x: 20, y: 5 }, 'label', 20, 20)).toThrowError(
      'is out of bounds at (20, 5)',
    );
  });

  it('throws when position y is out of bounds', () => {
    expect(() => validateGridPositionInBounds({ x: 5, y: -1 }, 'label', 20, 20)).toThrowError(
      'is out of bounds at (5, -1)',
    );
  });
});

describe('validateTriggerEffect', () => {
  it('accepts a valid trigger effect', () => {
    expect(() =>
      validateTriggerEffect({ setFact: 'approached', value: true }, 'label'),
    ).not.toThrow();
  });

  it('throws when setFact is empty', () => {
    expect(() =>
      validateTriggerEffect({ setFact: '  ', value: true }, 'label'),
    ).toThrowError('.setFact must be a non-empty string');
  });

  it('throws when value is not a string, boolean, or number', () => {
    expect(() =>
      validateTriggerEffect({ setFact: 'key', value: {} }, 'label'),
    ).toThrowError('.value must be a string, boolean, or number');
  });
});

describe('validateNpcTriggers', () => {
  it('accepts valid triggers object', () => {
    expect(() =>
      validateNpcTriggers(
        { onApproach: { setFact: 'approached', value: true } },
        'npc at index 0 triggers',
      ),
    ).not.toThrow();
  });

  it('throws when triggers contains unknown key', () => {
    expect(() =>
      validateNpcTriggers({ onSomething: {} }, 'npc triggers'),
    ).toThrowError("has unknown key 'onSomething'");
  });
});

describe('validateInventoryItems', () => {
  it('accepts a valid inventory array', () => {
    expect(() =>
      validateInventoryItems(
        [{ itemId: 'key', displayName: 'Key', sourceObjectId: 'chest-1', pickedUpAtTick: 5 }],
        'npc at index 0 inventory',
      ),
    ).not.toThrow();
  });

  it('throws when inventory is not an array', () => {
    expect(() => validateInventoryItems({}, 'label')).toThrowError('must be an array when provided');
  });

  it('throws when an inventory item is missing required fields', () => {
    expect(() =>
      validateInventoryItems([{ itemId: 'key', displayName: 'Key' }], 'label'),
    ).toThrowError('must include itemId, displayName, sourceObjectId, and pickedUpAtTick');
  });
});
