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

test('buildStylesheet escapes backslashes in CSS URLs and rejects invalid wallpaperPos injection', () => {
  const css = buildStylesheet(
    {
      ...DEFAULT_CONFIG,
      enabled: true,
      wallpaperId: 'custom',
      wallpaperPos: 'center; background: red; /*'
    },
    {
      wallpaper: 'data:image/webp;base64,ABC\\"</style><script>alert(1)</script>'
    }
  );
  assertBalancedCssBraces(css);
  assert.ok(!/<\/style/i.test(css));
  assert.ok(!css.includes('background: red'));
  assert.ok(css.includes('\\\\\\"'), 'Trailing backslash + quote inside url(...) must both be escaped');
});

test('SurfaceEngine observes late-opened [data-browser-hole] elements and notifies onHoleChange', () => {
  const origDoc = globalThis.document;
  const origWin = globalThis.window;
  const origResizeObserver = globalThis.ResizeObserver;
  const origMutationObserver = globalThis.MutationObserver;
  const origRaf = globalThis.requestAnimationFrame;

  const observed = [];
  const unobserved = [];
  let hasHoleAttr = 'false';
  let holeEl = null;

  const makeStyle = () => ({
    setProperty() {},
    removeProperty() {}
  });
  const shellEl = {
    style: makeStyle(),
    attributes: {},
    setAttribute(k, v) {
      this.attributes[k] = v;
    },
    removeAttribute(k) {
      delete this.attributes[k];
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1400, height: 900, right: 1400, bottom: 900 }),
    querySelector: (sel) => (sel.includes('data-browser-hole') ? holeEl : null)
  };
  const bodyEl = {
    classList: { add() {}, remove() {} },
    getAttribute: (k) => (k === 'data-has-browser-hole' ? hasHoleAttr : null),
    prepend() {},
    appendChild() {}
  };

  globalThis.ResizeObserver = class {
    observe(el) {
      observed.push(el);
    }
    unobserve(el) {
      unobserved.push(el);
    }
    disconnect() {}
  };
  globalThis.MutationObserver = class {
    observe() {}
    disconnect() {}
  };
  globalThis.requestAnimationFrame = () => 1;
  globalThis.window = {
    addEventListener() {},
    removeEventListener() {}
  };
  globalThis.document = {
    documentElement: { classList: { add() {}, remove() {} }, style: makeStyle() },
    body: bodyEl,
    head: { appendChild() {} },
    getElementById: () => ({ style: makeStyle(), textContent: '' }),
    querySelector: (sel) => (sel.includes('.agy-shell') ? shellEl : null),
    querySelectorAll: () => []
  };

  try {
    const holeEvents = [];
    const engine = new SurfaceEngine({
      getConfig: () => DEFAULT_CONFIG,
      getCustomMedia: () => ({}),
      onHoleChange: (hs) => holeEvents.push(hs)
    });
    engine.mount();
    assert.equal(observed.includes(holeEl), false);

    // Late-open Split-Browser hole
    hasHoleAttr = 'true';
    holeEl = {
      getBoundingClientRect: () => ({ left: 700, top: 40, width: 700, height: 860, right: 1400, bottom: 900 })
    };
    engine.syncShellAndHoleMetrics(DEFAULT_CONFIG);
    assert.equal(observed.includes(holeEl), true, 'ResizeObserver must observe late-opened [data-browser-hole]');
    assert.ok(holeEvents.some((ev) => ev.active === true), 'onHoleChange must fire when hole activates');
  } finally {
    globalThis.document = origDoc;
    globalThis.window = origWin;
    globalThis.ResizeObserver = origResizeObserver;
    globalThis.MutationObserver = origMutationObserver;
    globalThis.requestAnimationFrame = origRaf;
  }
});

test('buildStylesheet neutralizes Monokai bottom/header fades, nested sidebar bands, inner composer/bubble cards, and worked-for/row-actions overlays', () => {
  const css = buildStylesheet({ ...DEFAULT_CONFIG, enabled: true }, {});
  assertBalancedCssBraces(css);
  assert.ok(!/backdrop-filter:\s*blur\(/i.test(css));

  assert.ok(css.includes('.pointer-events-none.bottom-0[style*="linear-gradient"]'));
  assert.ok(css.includes('[data-testid="right-cluster-fade"]'));
  assert.ok(css.includes('.agy-ct-input-styled .surface-composer-card'));
  assert.ok(css.includes('.agy-ct-bubble-styled [data-testid="user-message-bubble"]'));
  assert.ok(css.includes('.agy-shell .agy-row-actions'));
  assert.ok(css.includes('.agy-row-actions::before'));
  assert.ok(css.includes('content: none !important'));
  assert.ok(css.includes('mask-image: linear-gradient(to right, #000'));
  assert.ok(css.includes('[data-tiling-pane]::after'));
  assert.ok(css.includes('.agy-shell .bg-sidebar .bg-sidebar'));
  assert.ok(css.includes('[data-testid="worked-for-collapsible"]:hover'));
});

