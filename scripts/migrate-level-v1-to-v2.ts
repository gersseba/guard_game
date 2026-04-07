import { readFileSync, writeFileSync } from 'node:fs';

type JsonObject = Record<string, unknown>;

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath) {
  throw new Error('Usage: ts-node scripts/migrate-level-v1-to-v2.ts <input.json> [output.json]');
}

const rawText = readFileSync(inputPath, 'utf8');
const parsed = JSON.parse(rawText) as JsonObject;

const interactiveObjects = Array.isArray(parsed.interactiveObjects) ? parsed.interactiveObjects : [];
const guards = Array.isArray(parsed.guards) ? parsed.guards : [];

parsed.version = 2;

parsed.interactiveObjects = interactiveObjects.map((entry) => {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return entry;
  }

  const objectEntry = { ...(entry as JsonObject) };
  if (
    objectEntry.capabilities === undefined ||
    typeof objectEntry.capabilities !== 'object' ||
    objectEntry.capabilities === null ||
    Array.isArray(objectEntry.capabilities)
  ) {
    objectEntry.capabilities = {};
  }

  return objectEntry;
});

parsed.guards = guards.map((entry) => {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return entry;
  }

  const guardEntry = { ...(entry as JsonObject) };
  const traits =
    typeof guardEntry.traits === 'object' && guardEntry.traits !== null && !Array.isArray(guardEntry.traits)
      ? ({ ...(guardEntry.traits as JsonObject) } as JsonObject)
      : {};

  if (typeof traits.truthMode !== 'string') {
    traits.truthMode = 'truth-teller';
  }

  guardEntry.traits = traits;
  return guardEntry;
});

const migrated = `${JSON.stringify(parsed, null, 2)}\n`;

if (outputPath) {
  writeFileSync(outputPath, migrated, 'utf8');
} else {
  process.stdout.write(migrated);
}
