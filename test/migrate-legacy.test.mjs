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
    const homeDir2 = path.join(tmpDir, 'home-empty');
    fs.mkdirSync(emptyLegacy, { recursive: true });
    assert.deepEqual(migrateLegacyUserData({ legacyDir: emptyLegacy, homeDir: homeDir2 }), {
      migrated: false,
      reason: 'no-legacy'
    });

    const homeSame = path.join(tmpDir, 'home-same');
    fs.mkdirSync(homeSame, { recursive: true });
    assert.deepEqual(migrateLegacyUserData({ legacyDir: homeSame, homeDir: homeSame }), {
      migrated: false,
      reason: 'same-dir'
    });
    assert.equal(fs.existsSync(path.join(homeSame, 'legacy-migration.json')), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('does not resurrect legacy config after reset --wipe', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-migrate-once-'));
  try {
    const legacyDir = path.join(tmpDir, 'legacy');
    const homeDir = path.join(tmpDir, 'home');
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, 'config.json'), JSON.stringify({ enabled: true, dimming: 30 }), 'utf8');

    const first = migrateLegacyUserData({ legacyDir, homeDir });
    assert.deepEqual(first, { migrated: true, reason: 'ok' });
    assert.equal(fs.existsSync(path.join(homeDir, 'config.json')), true);
    assert.equal(fs.existsSync(path.join(homeDir, 'legacy-migration.json')), true);

    // Simulate reset --wipe removing home config.json
    fs.unlinkSync(path.join(homeDir, 'config.json'));

    const second = migrateLegacyUserData({ legacyDir, homeDir });
    assert.deepEqual(second, { migrated: false, reason: 'already-checked' });
    assert.equal(fs.existsSync(path.join(homeDir, 'config.json')), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('writes the marker even when nothing was migrated', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-migrate-marker-'));
  try {
    const missingLegacy = path.join(tmpDir, 'missing-legacy');
    const homeA = path.join(tmpDir, 'home-a');
    const resA = migrateLegacyUserData({ legacyDir: missingLegacy, homeDir: homeA });
    assert.deepEqual(resA, { migrated: false, reason: 'no-legacy' });
    const markerA = JSON.parse(fs.readFileSync(path.join(homeA, 'legacy-migration.json'), 'utf8'));
    assert.equal(typeof markerA.checkedAt, 'number');
    assert.equal(markerA.legacyDir, missingLegacy);
    assert.deepEqual(markerA.result, { migrated: false, reason: 'no-legacy' });

    const legacyDir = path.join(tmpDir, 'legacy');
    const homeB = path.join(tmpDir, 'home-b');
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.mkdirSync(homeB, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, 'config.json'), JSON.stringify({ enabled: true }), 'utf8');
    fs.writeFileSync(path.join(homeB, 'config.json'), JSON.stringify({ enabled: false }), 'utf8');
    const resB = migrateLegacyUserData({ legacyDir, homeDir: homeB });
    assert.deepEqual(resB, { migrated: false, reason: 'home-config-present' });
    const markerB = JSON.parse(fs.readFileSync(path.join(homeB, 'legacy-migration.json'), 'utf8'));
    assert.equal(typeof markerB.checkedAt, 'number');
    assert.equal(markerB.legacyDir, legacyDir);
    assert.deepEqual(markerB.result, { migrated: false, reason: 'home-config-present' });

    const homeC = path.join(tmpDir, 'home-c');
    fs.mkdirSync(homeC, { recursive: true });
    const resC = migrateLegacyUserData({ legacyDir: homeC, homeDir: homeC });
    assert.deepEqual(resC, { migrated: false, reason: 'same-dir' });
    assert.equal(fs.existsSync(path.join(homeC, 'legacy-migration.json')), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('force: true bypasses the marker but still refuses an existing home config', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-migrate-force-'));
  try {
    const legacyDir = path.join(tmpDir, 'legacy');
    const homeDir = path.join(tmpDir, 'home');
    fs.mkdirSync(legacyDir, { recursive: true });
    const legacyCfg = JSON.stringify({ enabled: true, dimming: 15 });
    fs.writeFileSync(path.join(legacyDir, 'config.json'), legacyCfg, 'utf8');

    assert.deepEqual(migrateLegacyUserData({ legacyDir, homeDir }), { migrated: true, reason: 'ok' });
    fs.unlinkSync(path.join(homeDir, 'config.json'));
    assert.deepEqual(migrateLegacyUserData({ legacyDir, homeDir }), {
      migrated: false,
      reason: 'already-checked'
    });

    const forced = migrateLegacyUserData({ legacyDir, homeDir, force: true });
    assert.deepEqual(forced, { migrated: true, reason: 'ok' });
    assert.equal(fs.readFileSync(path.join(homeDir, 'config.json'), 'utf8'), legacyCfg);

    const customCfg = JSON.stringify({ custom: 1 });
    fs.writeFileSync(path.join(homeDir, 'config.json'), customCfg, 'utf8');
    const blocked = migrateLegacyUserData({ legacyDir, homeDir, force: true });
    assert.deepEqual(blocked, { migrated: false, reason: 'home-config-present' });
    assert.equal(fs.readFileSync(path.join(homeDir, 'config.json'), 'utf8'), customCfg);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
