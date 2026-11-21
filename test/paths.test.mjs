import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  PACKAGE_NAME,
  resolveThemeHome,
  homePaths,
  readPackageVersion,
  detectRunMode
} from '../daemon/paths.mjs';

test('resolveThemeHome honors AGY_THEME_HOME, then LOCALAPPDATA on win32', () => {
  assert.equal(resolveThemeHome({ env: { AGY_THEME_HOME: 'X:\\h' }, platform: 'win32' }), 'X:\\h');
  assert.equal(
    resolveThemeHome({ env: { LOCALAPPDATA: 'C:\\L' }, platform: 'win32' }),
    path.join('C:\\L', 'AntigravityCustomTheme')
  );
  assert.equal(
    resolveThemeHome({ env: {}, platform: 'win32', homedir: 'C:\\Users\\Demo' }),
    path.join('C:\\Users\\Demo', 'AppData', 'Local', 'AntigravityCustomTheme')
  );
  assert.equal(
    resolveThemeHome({ env: {}, platform: 'linux', homedir: '/home/u' }),
    path.join('/home/u', '.agy-custom-theme')
  );
});

test('homePaths returns all canonical filenames under theme home', () => {
  const home = path.join('C:\\L', 'AntigravityCustomTheme');
  const paths = homePaths(home);
  assert.deepEqual(paths, {
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
  });
});

test('detectRunMode: .git => source; realpath under npm prefix => installed; other node_modules => unmanaged', () => {
  assert.equal(PACKAGE_NAME, 'antigravity-custom-theme');

  const sourceDir = path.join('D:\\repos', 'theme');
  assert.equal(
    detectRunMode({
      rootDir: sourceDir,
      npmGlobalPrefix: 'C:\\npm-global',
      exists: (p) => p === path.join(sourceDir, '.git'),
      realpath: (p) => p
    }),
    'source'
  );

  const npmPrefix = 'C:\\Users\\Demo\\AppData\\Roaming\\npm';
  const installedDir = path.join(npmPrefix, 'node_modules', PACKAGE_NAME);
  const symlinkedDir = path.join('D:\\links', PACKAGE_NAME);
  assert.equal(
    detectRunMode({
      rootDir: symlinkedDir,
      npmGlobalPrefix: npmPrefix,
      exists: () => false,
      realpath: (p) => {
        if (p === symlinkedDir) return installedDir.toLowerCase();
        return p;
      }
    }),
    'installed'
  );

  const unmanagedDir = path.join('C:\\Users\\Demo\\.volta\\tools\\image\\packages', PACKAGE_NAME, 'node_modules', PACKAGE_NAME);
  assert.equal(
    detectRunMode({
      rootDir: unmanagedDir,
      npmGlobalPrefix: npmPrefix,
      exists: () => false,
      realpath: (p) => p
    }),
    'unmanaged'
  );

  const plainDir = path.join('D:\\extracted', 'theme-copy');
  assert.equal(
    detectRunMode({
      rootDir: plainDir,
      npmGlobalPrefix: npmPrefix,
      exists: () => false,
      realpath: (p) => p
    }),
    'source'
  );
});

test('readPackageVersion returns package.json version', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-pkg-ver-'));
  try {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: PACKAGE_NAME, version: '9.8.7' }), 'utf8');
    assert.equal(readPackageVersion(tmpDir), '9.8.7');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
