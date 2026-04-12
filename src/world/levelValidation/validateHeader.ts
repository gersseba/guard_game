/**
 * Validates the top-level level header fields:
 * version, name, premise, and goal.
 */
export const validateLevelHeader = (raw: Record<string, unknown>): void => {
  if (raw['version'] === undefined) {
    throw new Error('Level format version is missing. Expected version 2.');
  }

  if (raw['version'] !== 2) {
    throw new Error(`Level format version ${raw['version']} is not supported. Expected version 2.`);
  }

  if (typeof raw['layoutPath'] !== 'string' || raw['layoutPath'].trim() === '') {
    throw new Error('Invalid level data: layoutPath must be a non-empty string');
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
};
