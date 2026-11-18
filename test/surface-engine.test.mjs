import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CONFIG } from '../src/core/config-store.js';
import { syncPrebakedGlass } from '../src/core/prebaked-glass.js';
import { computeBrowserHoleClip } from '../src/core/dom-targets.js';
import { buildStylesheet, SurfaceEngine } from '../src/core/surface-engine.js';

function assertBalancedCssBraces(css) {
  const cleaned = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
  let depth = 0;
  for (const ch of cleaned) {
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    assert.ok(depth >= 0, 'Unexpected closing brace } in generated CSS');
  }
  assert.equal(depth, 0, 'Unbalanced { } braces in generated CSS');
}

test('buildStylesheet honors Zero Live Blur, Chromium 2MB CSS variable limit, Light/Dark modes, and customCss sanitization', () => {
  const largeFakeWp = 'data:image/webp;base64,' + 'A'.repeat(2_600_000);
  const darkCfg = {
    ...DEFAULT_CONFIG,
    enabled: true,
    isLight: false,
    wallpaperId: 'custom',
    avatars: { userEnabled: true, agentEnabled: true, agentMode: 'star', size: 38, radius: 24, rotate: -6 },
    customCss: 'body { color: red; }</style><script>evil()</script>'
  };

  const darkCss = buildStylesheet(darkCfg, {
    wallpaper: largeFakeWp,
    userAvatar: 'data:image/webp;base64,USERAV'
  });

  assertBalancedCssBraces(darkCss);
  assert.ok(!/<\/style/i.test(darkCss), 'Sanitizer must strip </style from customCss');
  assert.ok(darkCss.includes('body { color: red; }'));

  const rootMatch = darkCss.match(/:root\s*\{[\s\S]*?\}/);
  assert.ok(rootMatch, 'Expected :root token block');
  assert.ok(!rootMatch[0].includes('data:image/'), ':root must never contain base64 image data URIs');

  // Verify Zero Live Blur across shell, scroll containers, and cards
  assert.ok(!/backdrop-filter:\s*blur\(/i.test(darkCss), 'Zero Live Blur forbids backdrop-filter: blur(...)');
  assert.ok(darkCss.includes('backdrop-filter: none !important'));
  assert.ok(darkCss.includes('rotate(-6deg)'));
  assert.ok(darkCss.includes('width: 38px'));
  assert.ok(darkCss.includes('border-radius: 24%'));

  // Light mode checks
  const lightCfg = {
    ...DEFAULT_CONFIG,
    enabled: true,
    isLight: true,
    wallpaperId: 'kanagawa-lotus',
    bubbleId: 'kanagawa-lotus',
    inputId: 'frosted-lotus-light'
  };
  const lightCss = buildStylesheet(lightCfg, {});
  assertBalancedCssBraces(lightCss);
  assert.ok(lightCss.includes('#0f172a'), 'Light mode should emit dark ink #0f172a');
  assert.ok(lightCss.includes('[data-testid="project-selector-trigger"]'));
});

test('computeBrowserHoleClip produces exact evenodd polygon for active Split-Browser', () => {
  const shellRect = { left: 0, top: 0, width: 1400, height: 900, right: 1400, bottom: 900 };
  const holeRect = { left: 700, top: 40, width: 700, height: 860, right: 1400, bottom: 900 };

  const active = computeBrowserHoleClip(shellRect, holeRect, true);
  assert.equal(active.active, true);
  assert.equal(
    active.clipPath,
    'polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, 700px 40px, 1400px 40px, 1400px 900px, 700px 900px, 700px 40px)'
  );
  assert.deepEqual(active.holeRect, { left: 700, top: 40, right: 1400, bottom: 900 });

  const inactive = computeBrowserHoleClip(shellRect, holeRect, false);
  assert.equal(inactive.active, false);
  assert.equal(inactive.clipPath, 'none');
  assert.equal(inactive.holeRect, null);
});

test('syncPrebakedGlass clears property safely when disabled or running headless', async () => {
  const removed = [];
  const mockShell = {
    style: {
      setProperty() {},
      removeProperty(name) {
        removed.push(name);
      }
    }
  };
  const res = await syncPrebakedGlass(mockShell, { ...DEFAULT_CONFIG, wallpaperId: 'none' }, {});
  assert.equal(res, '');
  assert.ok(removed.includes('--agy-l-glass-bg'));
  assert.equal(typeof SurfaceEngine, 'function');
});
