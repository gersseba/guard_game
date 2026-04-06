import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type LevelManifestEntry = {
  id: string;
  name: string;
};

type LevelEntity = {
  id: string;
  displayName: string;
  spriteAssetPath?: string;
  spriteSet?: {
    default?: string;
    front?: string;
    away?: string;
    left?: string;
    right?: string;
  };
};

type LevelFile = {
  guards?: LevelEntity[];
  doors?: LevelEntity[];
  npcs?: LevelEntity[];
  interactiveObjects?: LevelEntity[];
};

const repoRoot = resolve(__dirname, '../../');

const assetPathExists = (assetPath: string): boolean => {
  if (!assetPath.startsWith('/assets/')) {
    return false;
  }

  const relativePath = assetPath.replace(/^\//, '');
  return existsSync(resolve(repoRoot, 'public', relativePath.replace(/^assets\//, 'assets/')));
};

const collectEntityAssetPaths = (entity: LevelEntity): string[] => {
  const assetPaths: string[] = [];

  if (entity.spriteAssetPath) {
    assetPaths.push(entity.spriteAssetPath);
  }

  if (entity.spriteSet) {
    for (const key of ['default', 'front', 'away', 'left', 'right'] as const) {
      const value = entity.spriteSet[key];
      if (value) {
        assetPaths.push(value);
      }
    }
  }

  return assetPaths;
};

describe('level NPC/object asset coverage', () => {
  it('ensures every guard, door, NPC, and interactive object has at least one valid existing asset path', () => {
    const manifestPath = resolve(repoRoot, 'public/levels/manifest.json');
    const manifest: LevelManifestEntry[] = JSON.parse(readFileSync(manifestPath, 'utf8'));

    const missingCoverage: string[] = [];
    const missingFiles: string[] = [];

    for (const entry of manifest) {
      const levelPath = resolve(repoRoot, `public/levels/${entry.id}.json`);
      const level: LevelFile = JSON.parse(readFileSync(levelPath, 'utf8'));

      for (const guard of level.guards ?? []) {
        const paths = collectEntityAssetPaths(guard);
        if (paths.length === 0) {
          missingCoverage.push(`level=${entry.id} guard=${guard.id}`);
          continue;
        }

        for (const assetPath of paths) {
          if (!assetPathExists(assetPath)) {
            missingFiles.push(`level=${entry.id} guard=${guard.id} asset=${assetPath}`);
          }
        }
      }

      for (const door of level.doors ?? []) {
        const paths = collectEntityAssetPaths(door);
        if (paths.length === 0) {
          missingCoverage.push(`level=${entry.id} door=${door.id}`);
          continue;
        }

        for (const assetPath of paths) {
          if (!assetPathExists(assetPath)) {
            missingFiles.push(`level=${entry.id} door=${door.id} asset=${assetPath}`);
          }
        }
      }

      for (const npc of level.npcs ?? []) {
        const paths = collectEntityAssetPaths(npc);
        if (paths.length === 0) {
          missingCoverage.push(`level=${entry.id} npc=${npc.id}`);
          continue;
        }

        for (const assetPath of paths) {
          if (!assetPathExists(assetPath)) {
            missingFiles.push(`level=${entry.id} npc=${npc.id} asset=${assetPath}`);
          }
        }
      }

      for (const object of level.interactiveObjects ?? []) {
        const paths = collectEntityAssetPaths(object);
        if (paths.length === 0) {
          missingCoverage.push(`level=${entry.id} object=${object.id}`);
          continue;
        }

        for (const assetPath of paths) {
          if (!assetPathExists(assetPath)) {
            missingFiles.push(`level=${entry.id} object=${object.id} asset=${assetPath}`);
          }
        }
      }
    }

    expect(missingCoverage).toEqual([]);
    expect(missingFiles).toEqual([]);
  });
});
