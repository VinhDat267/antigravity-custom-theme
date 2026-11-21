import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { migrateLegacyUserData } from '../daemon/migrate-legacy.mjs';

test('migrates config.json and media/*.dat when home has no config', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-migrate-ok-'));
  try {
    const legacyDir = path.join(tmpDir, 'legacy');
    const homeDir = path.join(tmpDir, 'home');
    fs.mkdirSync(path.join(legacyDir, 'media'), { recursive: true });

    const cfgBody = JSON.stringify({ enabled: true, wallpaperId: 'thunder-samurai', __savedAt: 12345 });
    fs.writeFileSync(path.join(legacyDir, 'config.json'), cfgBody, 'utf8');
    fs.writeFileSync(path.join(legacyDir, 'media', 'wallpaper.dat'), 'data:image/webp;base64,ABC', 'utf8');
    fs.writeFileSync(path.join(legacyDir, 'media', 'stray.tmp'), 'ignore-me', 'utf8');

    const logs = [];
    const res = migrateLegacyUserData({
      legacyDir,
      homeDir,
      log: (line) => logs.push(line)
    });

    assert.deepEqual(res, { migrated: true, reason: 'ok' });
    assert.equal(fs.readFileSync(path.join(homeDir, 'config.json'), 'utf8'), cfgBody);
    assert.equal(fs.readFileSync(path.join(homeDir, 'media', 'wallpaper.dat'), 'utf8'), 'data:image/webp;base64,ABC');
    assert.equal(fs.existsSync(path.join(homeDir, 'media', 'stray.tmp')), false);
    // Source remains intact
    assert.equal(fs.readFileSync(path.join(legacyDir, 'config.json'), 'utf8'), cfgBody);
    assert.equal(fs.readFileSync(path.join(legacyDir, 'media', 'wallpaper.dat'), 'utf8'), 'data:image/webp;base64,ABC');
    assert.ok(logs.length > 0);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('does not migrate when home already has config.json, even if corrupt', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-migrate-corrupt-'));
  try {
    const legacyDir = path.join(tmpDir, 'legacy');
    const homeDir = path.join(tmpDir, 'home');
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.mkdirSync(homeDir, { recursive: true });

    fs.writeFileSync(path.join(legacyDir, 'config.json'), JSON.stringify({ enabled: true, dimming: 10 }), 'utf8');
    fs.writeFileSync(path.join(homeDir, 'config.json'), '{corrupt-partial', 'utf8');

    const res = migrateLegacyUserData({ legacyDir, homeDir });
    assert.deepEqual(res, { migrated: false, reason: 'home-config-present' });
    assert.equal(fs.readFileSync(path.join(homeDir, 'config.json'), 'utf8'), '{corrupt-partial');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('no legacy dir => reason no-legacy; same path => same-dir', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-migrate-edge-'));
  try {
    const missingLegacy = path.join(tmpDir, 'missing');
    const homeDir = path.join(tmpDir, 'home');
    assert.deepEqual(migrateLegacyUserData({ legacyDir: missingLegacy, homeDir }), {
      migrated: false,
      reason: 'no-legacy'
    });

    const emptyLegacy = path.join(tmpDir, 'empty-legacy');
    fs.mkdirSync(emptyLegacy, { recursive: true });
    assert.deepEqual(migrateLegacyUserData({ legacyDir: emptyLegacy, homeDir }), {
      migrated: false,
      reason: 'no-legacy'
    });

    fs.mkdirSync(homeDir, { recursive: true });
    assert.deepEqual(migrateLegacyUserData({ legacyDir: homeDir, homeDir }), {
      migrated: false,
      reason: 'same-dir'
    });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
