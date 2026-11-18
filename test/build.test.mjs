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
