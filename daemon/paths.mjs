import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const PACKAGE_NAME = 'antigravity-custom-theme';

/**
 * Resolves the canonical user-data home directory for Antigravity Custom Theme.
 * Honors AGY_THEME_HOME first, then LOCALAPPDATA on Windows.
 */
export function resolveThemeHome({ env = process.env, platform = process.platform, homedir = os.homedir() } = {}) {
  const override = typeof env?.AGY_THEME_HOME === 'string' ? env.AGY_THEME_HOME.trim() : '';
  if (override) return override;

  if (platform === 'win32') {
    const localAppData =
      typeof env?.LOCALAPPDATA === 'string' && env.LOCALAPPDATA.trim()
        ? env.LOCALAPPDATA.trim()
        : path.join(homedir, 'AppData', 'Local');
    return path.join(localAppData, 'AntigravityCustomTheme');
  }

  return path.join(homedir, '.agy-custom-theme');
}

/**
 * Maps canonical filenames and subdirectories inside a theme home directory.
 */
export function homePaths(home) {
  return {
    config: path.join(home, 'config.json'),
    mediaDir: path.join(home, 'media'),
    packsDir: path.join(home, 'packs'),
    pid: path.join(home, 'daemon.pid'),
    log: path.join(home, 'daemon.log'),
    cmd: path.join(home, 'daemon-cmd.json'),
    cmdAck: path.join(home, 'daemon-cmd-ack.json'),
    health: path.join(home, 'health.json'),
    hostState: path.join(home, 'host-state.json'),
    updateState: path.join(home, 'update-state.json'),
    hostVersion: path.join(home, 'host-version.json'),
    legacyMigration: path.join(home, 'legacy-migration.json'),
    updatesDir: path.join(home, 'updates'),
    backupsDir: path.join(home, 'backups')
  };
}

/**
 * Reads the package version directly from <rootDir>/package.json.
 */
export function readPackageVersion(rootDir) {
  const pkgPath = path.join(rootDir, 'package.json');
  const raw = fs.readFileSync(pkgPath, 'utf8');
  const parsed = JSON.parse(raw);
  const version = typeof parsed?.version === 'string' ? parsed.version.trim() : '';
  if (!version) {
    throw new Error(`Missing version in ${pkgPath}`);
  }
  return version;
}

function safeRealpath(targetPath, realpath) {
  try {
    return realpath(targetPath);
  } catch {
    return null;
  }
}

function normalizeComparePath(targetPath) {
  const normalized = String(targetPath || '').replace(/\\/g, '/').replace(/\/+$/, '');
  if (/^[a-z]:\//i.test(normalized) || process.platform === 'win32') {
    return normalized.toLowerCase();
  }
  return normalized;
}

/**
 * Detects whether execution is from a source checkout, global npm install, or unmanaged node_modules.
 */
export function detectRunMode({
  rootDir,
  npmGlobalPrefix,
  realpath = fs.realpathSync,
  exists = fs.existsSync
} = {}) {
  if (!rootDir) return 'source';
  if (exists(path.join(rootDir, '.git'))) {
    return 'source';
  }

  const realRoot = safeRealpath(rootDir, realpath) || path.resolve(rootDir);
  const normRealRoot = normalizeComparePath(realRoot);

  if (typeof npmGlobalPrefix === 'string' && npmGlobalPrefix.trim()) {
    const prefix = npmGlobalPrefix.trim();
    const candidates = [path.join(prefix, 'node_modules', PACKAGE_NAME)];
    if (process.platform !== 'win32') {
      candidates.push(path.join(prefix, 'lib', 'node_modules', PACKAGE_NAME));
    }
    for (const candidate of candidates) {
      const realCandidate = safeRealpath(candidate, realpath) || candidate;
      if (normRealRoot === normalizeComparePath(realCandidate)) {
        return 'installed';
      }
    }
  }

  if (
    /(?:^|[\\/])node_modules(?:[\\/]|$)/i.test(realRoot) ||
    /(?:^|[\\/])node_modules(?:[\\/]|$)/i.test(String(rootDir))
  ) {
    return 'unmanaged';
  }

  return 'source';
}
