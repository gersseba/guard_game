/**
 * Validates the top-level level header fields:
 * version, name, premise, goal, width, height.
 * Returns parsed grid dimensions for use by subsequent validators.
 */
export const validateLevelHeader = (
  raw: Record<string, unknown>,
): { levelWidth: number; levelHeight: number } => {
  if (raw['version'] === undefined) {
    throw new Error('Level format version is missing. Expected version 2.');
  }

  if (raw['version'] !== 2) {
    throw new Error(`Level format version ${raw['version']} is not supported. Expected version 2.`);
  }

  if (typeof raw['name'] !== 'string' || raw['name'].trim() === '') {
    throw new Error('Invalid level data: name must be a non-empty string');
  }

  if (typeof raw['premise'] !== 'string' || raw['premise'].trim() === '') {
    throw new Error('Invalid level data: premise must be a non-empty string');
  }

  if (typeof raw['goal'] !== 'string' || raw['goal'].trim() === '') {
    throw new Error('Invalid level data: goal must be a non-empty string');
  }

  if (typeof raw['width'] !== 'number' || raw['width'] <= 0) {
    throw new Error('Invalid level data: width must be a positive number');
  }

  if (typeof raw['height'] !== 'number' || raw['height'] <= 0) {
    throw new Error('Invalid level data: height must be a positive number');
  }

  return { levelWidth: raw['width'] as number, levelHeight: raw['height'] as number };
};
