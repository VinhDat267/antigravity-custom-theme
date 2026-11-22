import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { homePaths } from './paths.mjs';

function safeRealpath(targetPath) {
  try {
    return fs.realpathSync(targetPath);
  } catch {
    return null;
  }
}

function sameDirectoryPath(a, b) {
  const normA = path.normalize(safeRealpath(a) || path.resolve(a));
  const normB = path.normalize(safeRealpath(b) || path.resolve(b));
  if (process.platform === 'win32') {
    return normA.toLowerCase() === normB.toLowerCase();
  }
  return normA === normB;
}

function writeMigrationMarker(markerPath, payload) {
  const dir = path.dirname(markerPath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = path.join(dir, `${path.basename(markerPath)}.tmp-${process.pid}-${crypto.randomUUID()}`);
  fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tmpPath, markerPath);
}

/**
 * One-time migration of legacy <repo>/user-data/{config.json,media/*.dat} into the theme home.
 * Leaves legacy files intact, records a marker so deleted configs do not resurrect,
 * and refuses to overwrite any existing (even corrupt) home config.
 */
export function migrateLegacyUserData({ legacyDir, homeDir, log, force = false } = {}) {
  if (!homeDir) {
    return { migrated: false, reason: 'no-legacy' };
  }

  if (legacyDir && sameDirectoryPath(legacyDir, homeDir)) {
    return { migrated: false, reason: 'same-dir' };
  }

  const dest = homePaths(homeDir);
  if (!force && fs.existsSync(dest.legacyMigration)) {
    return { migrated: false, reason: 'already-checked' };
  }

  const recordAndReturn = (result) => {
    writeMigrationMarker(dest.legacyMigration, {
      checkedAt: Date.now(),
      legacyDir: legacyDir || null,
      result
    });
    return result;
  };

  if (!legacyDir || !fs.existsSync(legacyDir)) {
    return recordAndReturn({ migrated: false, reason: 'no-legacy' });
  }

  const legacyConfig = path.join(legacyDir, 'config.json');
  const legacyMediaDir = path.join(legacyDir, 'media');
  const hasLegacyConfig = fs.existsSync(legacyConfig);

  let datFiles = [];
  if (fs.existsSync(legacyMediaDir)) {
    try {
      datFiles = fs
        .readdirSync(legacyMediaDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.dat'))
        .map((entry) => entry.name);
    } catch {
      datFiles = [];
    }
  }

  if (!hasLegacyConfig && datFiles.length === 0) {
    return recordAndReturn({ migrated: false, reason: 'no-legacy' });
  }

  if (fs.existsSync(dest.config)) {
    return recordAndReturn({ migrated: false, reason: 'home-config-present' });
  }

  fs.mkdirSync(homeDir, { recursive: true });
  if (hasLegacyConfig) {
    fs.copyFileSync(legacyConfig, dest.config);
  }

  let copiedMedia = 0;
  if (datFiles.length > 0) {
    fs.mkdirSync(dest.mediaDir, { recursive: true });
    for (const fileName of datFiles) {
      const destMedia = path.join(dest.mediaDir, fileName);
      if (!fs.existsSync(destMedia)) {
        fs.copyFileSync(path.join(legacyMediaDir, fileName), destMedia);
        copiedMedia += 1;
      }
    }
  }

  if (typeof log === 'function') {
    log(
      `Migrated legacy user data from ${legacyDir} to ${homeDir} (config=${hasLegacyConfig}, media=${copiedMedia})`
    );
  }

  return recordAndReturn({ migrated: true, reason: 'ok' });
}
