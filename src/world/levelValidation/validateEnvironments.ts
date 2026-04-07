/**
 * Validates the environments array of a raw level DTO.
 * DTO-only: does not instantiate runtime classes.
 */
export const validateEnvironments = (raw: Record<string, unknown>): void => {
  if (raw['environments'] === undefined) {
    return;
  }

  if (!Array.isArray(raw['environments'])) {
    throw new Error('Invalid level data: environments must be an array');
  }

  for (let i = 0; i < (raw['environments'] as unknown[]).length; i++) {
    const environment = (raw['environments'] as unknown[])[i] as Record<string, unknown>;

    if (
      typeof environment !== 'object' ||
      environment === null ||
      typeof environment['id'] !== 'string' ||
      typeof environment['displayName'] !== 'string' ||
      typeof environment['x'] !== 'number' ||
      typeof environment['y'] !== 'number' ||
      typeof environment['isBlocking'] !== 'boolean'
    ) {
      throw new Error(
        `Invalid level data: environment at index ${i} must have id, displayName, x, y, and isBlocking`,
      );
    }
  }
};
