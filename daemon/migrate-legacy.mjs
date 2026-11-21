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

/**
 * One-time migration of legacy <repo>/user-data/{config.json,media/*.dat} into the theme home.
 * Leaves legacy files intact and refuses to overwrite any existing (even corrupt) home config.
 */
export function migrateLegacyUserData({ legacyDir, homeDir, log } = {}) {
  if (!legacyDir || !homeDir) {
    return { migrated: false, reason: 'no-legacy' };
  }

  if (sameDirectoryPath(legacyDir, homeDir)) {
    return { migrated: false, reason: 'same-dir' };
  }

  if (!fs.existsSync(legacyDir)) {
    return { migrated: false, reason: 'no-legacy' };
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
    return { migrated: false, reason: 'no-legacy' };
  }

  const dest = homePaths(homeDir);
  if (fs.existsSync(dest.config)) {
    return { migrated: false, reason: 'home-config-present' };
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

  return { migrated: true, reason: 'ok' };
}
