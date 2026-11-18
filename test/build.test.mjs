import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

import {
  MODULE_ORDER,
  stripModuleSyntax,
  stripDeletedWallpapers,
  buildBundle
} from '../scripts/build.mjs';

test('MODULE_ORDER defines the full ordered src pipeline', () => {
  assert.ok(Array.isArray(MODULE_ORDER));
  assert.ok(MODULE_ORDER.includes('assets/wallpapers-manifest.js'));
  assert.ok(MODULE_ORDER.includes('core/config-store.js'));
  assert.ok(MODULE_ORDER.includes('core/surface-engine.js'));
  assert.ok(MODULE_ORDER.includes('fx/ambient-canvas.js'));
  assert.ok(MODULE_ORDER.includes('ui/theme-studio.js'));
  assert.equal(MODULE_ORDER.at(-1), 'index.js');
});

test('stripModuleSyntax removes multi-line imports and export keywords cleanly', () => {
  const sample = `
import {
  alpha,
  beta
} from './other.js';
import single from './single.js';

export const KEEPER = "import { fake } from './nope';";
export async function runAsync(x) { return x; }
export class DemoBox {}
export { KEEPER };
`;
  const stripped = stripModuleSyntax(sample);
  assert.ok(!/^\s*import\s+/m.test(stripped));
  assert.ok(!/^\s*export\s+/m.test(stripped));
  assert.ok(stripped.includes('const KEEPER = "import { fake } from \'./nope\';";'));
  assert.ok(stripped.includes('async function runAsync(x)'));
  assert.ok(stripped.includes('class DemoBox'));
});

test('stripDeletedWallpapers clears only hidden wallpaper data URIs', () => {
  const fakeBundle = `
    const WALLPAPERS = [
      { id: 'thunder-samurai', embeddedDataUri: 'data:image/svg+xml;base64,KEEPME' },
      { id: 'obsidian-nebula', embeddedDataUri: 'data:image/svg+xml;base64,REMOVEME' }
    ];
  `;
  const cleaned = stripDeletedWallpapers(fakeBundle, { hiddenWallpapers: ['obsidian-nebula', '../bad'] });
  assert.ok(cleaned.includes('KEEPME'));
  assert.ok(!cleaned.includes('REMOVEME'));
});

test('buildBundle compiles ordered modules and optional wallpaper files into a valid IIFE', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-build-test-'));
  try {
    const srcDir = path.join(tmpDir, 'src');
    const wpDir = path.join(tmpDir, 'assets', 'wallpapers');
    fs.mkdirSync(path.join(srcDir, 'assets'), { recursive: true });
    fs.mkdirSync(wpDir, { recursive: true });

    fs.writeFileSync(path.join(wpDir, 'thunder-samurai.webp'), Buffer.from('FAKEWEBP'));
    fs.writeFileSync(
      path.join(srcDir, 'assets', 'wallpapers-manifest.js'),
      `export const WALLPAPERS = [{ id: 'thunder-samurai', embeddedDataUri: '' }];\n`
    );
    fs.writeFileSync(
      path.join(srcDir, 'index.js'),
      `import { WALLPAPERS } from './assets/wallpapers-manifest.js';\nglobalThis.__BUILT_WP__ = WALLPAPERS[0].embeddedDataUri;\n`
    );

    const outFile = path.join(tmpDir, 'dist', 'bundle.js');
    const result = buildBundle({
      rootDir: tmpDir,
      outFile,
      moduleFiles: ['assets/wallpapers-manifest.js', 'index.js']
    });

    assert.equal(result.outFile, outFile);
    assert.ok(fs.existsSync(outFile));
    assert.ok(result.sizeBytes > 50);

    const sandbox = { globalThis: {} };
    sandbox.globalThis = sandbox;
    new vm.Script(result.code).runInNewContext(sandbox);
    assert.match(sandbox.__BUILT_WP__, /^data:image\/webp;base64,/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('real repo bundle compiles cleanly and aborts mounting on non-shell pages', async () => {
  const repoRoot = path.resolve(import.meta.dirname, '..');
  const tmpOut = path.join(os.tmpdir(), `agy-real-bundle-${Date.now()}.js`);
  try {
    const res = buildBundle({ rootDir: repoRoot, outFile: tmpOut });
    assert.ok(res.sizeBytes > 10_000, 'Expected substantial compiled bundle');

    const listeners = {};
    const mockDoc = {
      readyState: 'complete',
      body: {
        classList: { add() {}, remove() {} },
        prepend() {},
        appendChild() {},
        contains: () => false
      },
      documentElement: {
        classList: { add() {}, remove() {} },
        style: { setProperty() {}, removeProperty() {} }
      },
      head: { appendChild() {} },
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      addEventListener: (k, fn) => {
        listeners[k] = fn;
      },
      removeEventListener: () => {}
    };
    const mockWin = {
      innerWidth: 1280,
      innerHeight: 720,
      devicePixelRatio: 1,
      addEventListener: () => {},
      removeEventListener: () => {},
      document: mockDoc
    };
    mockWin.window = mockWin;
    mockWin.globalThis = mockWin;

    new vm.Script(res.code).runInNewContext(mockWin);
    assert.equal(typeof mockWin.__AGY_CUSTOM_THEME__, 'object');
    assert.equal(mockWin.__AGY_CUSTOM_THEME__.isMounted, false);
  } finally {
    fs.rmSync(tmpOut, { force: true });
  }
});

test('buildBundle overrides real wpSvgUri entries cleanly and stripDeletedWallpapers removes them from compiled bundle', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-real-override-'));
  try {
    fs.cpSync(path.join(repoRoot, 'src'), path.join(tmpDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'assets', 'wallpapers'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'assets', 'wallpapers', 'thunder-samurai.webp'), Buffer.from('DISKWEBP'));

    const res = buildBundle({
      rootDir: tmpDir,
      outFile: path.join(tmpDir, 'dist', 'antigravity-theme.js')
    });

    // Must compile cleanly with zero SyntaxError despite wpSvgUri(`...url(#tsSky)...`)
    new vm.Script(res.code);

    const stripped = stripDeletedWallpapers(res.code, {
      hiddenWallpapers: [
        'thunder-samurai',
        'obsidian-nebula',
        'one-piece-sunny-sunset',
        'one-piece-grand-line-map',
        'one-piece-nika-moon'
      ]
    });
    new vm.Script(stripped);

    const captureCode = stripped.replace(
      'controller.init();',
      'globalThis.__CAPTURED_WPS__ = WALLPAPERS; controller.init();'
    );
    const sandbox = {
      document: {
        readyState: 'complete',
        body: { classList: { add() {}, remove() {} }, prepend() {}, appendChild() {}, contains: () => false },
        documentElement: { classList: { add() {}, remove() {} }, style: { setProperty() {}, removeProperty() {} } },
        head: { appendChild() {} },
        querySelector: () => null,
        querySelectorAll: () => [],
        getElementById: () => null,
        addEventListener: () => {},
        removeEventListener: () => {}
      },
      innerWidth: 1280,
      innerHeight: 720,
      devicePixelRatio: 1,
      addEventListener: () => {},
      removeEventListener: () => {}
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    new vm.Script(captureCode).runInNewContext(sandbox);

    const wps = Object.fromEntries(sandbox.__CAPTURED_WPS__.map((w) => [w.id, w.embeddedDataUri]));
    assert.equal(wps['thunder-samurai'], '');
    assert.equal(wps['obsidian-nebula'], '');
    assert.equal(wps['one-piece-sunny-sunset'], '');
    assert.equal(wps['one-piece-grand-line-map'], '');
    assert.equal(wps['one-piece-nika-moon'], '');
    assert.match(wps['sakura-shrine-night'], /^data:image\/svg\+xml/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('buildBundle embeds assets/pets/*.webp sprites into MASCOT_TEMPLATES without corrupting IIFE', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-pets-embed-'));
  try {
    fs.cpSync(path.join(repoRoot, 'src'), path.join(tmpDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'assets', 'pets'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'assets', 'pets', 'luffy-anime.webp'), Buffer.from('LUFFYWEBP'));
    fs.writeFileSync(path.join(tmpDir, 'assets', 'pets', 'luffy-gear5-anime.webp'), Buffer.from('GEAR5WEBP'));

    const res = buildBundle({
      rootDir: tmpDir,
      outFile: path.join(tmpDir, 'dist', 'antigravity-theme.js')
    });

    new vm.Script(res.code);
    const captureCode = res.code.replace(
      'controller.init();',
      'globalThis.__CAPTURED_PETS__ = MASCOT_TEMPLATES; controller.init();'
    );
    const sandbox = {
      document: {
        readyState: 'complete',
        body: { classList: { add() {}, remove() {} }, prepend() {}, appendChild() {}, contains: () => false },
        documentElement: { classList: { add() {}, remove() {} }, style: { setProperty() {}, removeProperty() {} } },
        head: { appendChild() {} },
        querySelector: () => null,
        querySelectorAll: () => [],
        getElementById: () => null,
        addEventListener: () => {},
        removeEventListener: () => {}
      },
      innerWidth: 1280,
      innerHeight: 720,
      devicePixelRatio: 1,
      addEventListener: () => {},
      removeEventListener: () => {}
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    new vm.Script(captureCode).runInNewContext(sandbox);

    assert.equal(
      sandbox.__CAPTURED_PETS__['luffy-anime']?.embeddedDataUri,
      `data:image/webp;base64,${Buffer.from('LUFFYWEBP').toString('base64')}`
    );
    assert.equal(
      sandbox.__CAPTURED_PETS__['luffy-gear5-anime']?.embeddedDataUri,
      `data:image/webp;base64,${Buffer.from('GEAR5WEBP').toString('base64')}`
    );

    // Strip hiddenWallpapers containing mascot IDs must NEVER clear MASCOT_TEMPLATES embeddedDataUri
    const strippedWithMascotIds = stripDeletedWallpapers(res.code, {
      hiddenWallpapers: ['luffy-chibi', 'luffy-anime']
    });
    const captureAfterStrip = strippedWithMascotIds.replace(
      'controller.init();',
      'globalThis.__CAPTURED_PETS_AFTER__ = MASCOT_TEMPLATES; controller.init();'
    );
    const sandbox2 = {
      ...sandbox,
      document: { ...sandbox.document },
      __CAPTURED_PETS_AFTER__: null
    };
    sandbox2.window = sandbox2;
    sandbox2.globalThis = sandbox2;
    new vm.Script(captureAfterStrip).runInNewContext(sandbox2);
    assert.equal(
      sandbox2.__CAPTURED_PETS_AFTER__['luffy-anime']?.embeddedDataUri,
      `data:image/webp;base64,${Buffer.from('LUFFYWEBP').toString('base64')}`,
      'stripDeletedWallpapers must stay scoped to WALLPAPERS and never blank mascot sprites'
    );

    // Unannotated mascot file (e.g., luffy-chibi.webp where entry has no embeddedDataUri) must not bleed into luffy-anime
    fs.writeFileSync(path.join(tmpDir, 'assets', 'pets', 'luffy-chibi.webp'), Buffer.from('WRONGCHIBI'));
    const bleedRes = buildBundle({
      rootDir: tmpDir,
      outFile: path.join(tmpDir, 'dist', 'antigravity-theme.js')
    });
    const captureBleed = bleedRes.code.replace(
      'controller.init();',
      'globalThis.__CAPTURED_PETS_BLEED__ = MASCOT_TEMPLATES; controller.init();'
    );
    const sandbox3 = {
      ...sandbox,
      document: { ...sandbox.document },
      __CAPTURED_PETS_BLEED__: null
    };
    sandbox3.window = sandbox3;
    sandbox3.globalThis = sandbox3;
    new vm.Script(captureBleed).runInNewContext(sandbox3);
    assert.equal(
      sandbox3.__CAPTURED_PETS_BLEED__['luffy-anime']?.embeddedDataUri,
      `data:image/webp;base64,${Buffer.from('LUFFYWEBP').toString('base64')}`,
      'injectEmbeddedDataUris must stop at object boundary and not overwrite subsequent mascot'
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});


