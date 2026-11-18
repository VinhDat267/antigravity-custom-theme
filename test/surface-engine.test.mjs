import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CONFIG, sanitizeImportedConfig } from '../src/core/config-store.js';
import { clearPrebakedGlassMemoryCache, syncPrebakedGlass } from '../src/core/prebaked-glass.js';
import { computeBrowserHoleClip } from '../src/core/dom-targets.js';
import { buildStylesheet, SurfaceEngine } from '../src/core/surface-engine.js';
import { THEME_BUNDLES } from '../src/presets/themes.js';

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

test('buildStylesheet themes Model Selector triggers, portaled .agy-overlay popups, items, and badges in dark and light modes with Zero Live Blur', () => {
  for (const isLight of [false, true]) {
    const css = buildStylesheet({ ...DEFAULT_CONFIG, enabled: true, isLight }, {});
    assertBalancedCssBraces(css);
    assert.ok(!/backdrop-filter:\s*blur\(/i.test(css));

    assert.ok(css.includes('[data-testid="model-selector-trigger"]'));
    assert.ok(css.includes('[data-testid="permissions-selector-trigger"]'));
    assert.ok(css.includes('body.agy-ct-active :is(.agy-overlay'));
    assert.ok(css.includes('[data-testid="model-selector-header"]'));
    assert.ok(css.includes('.agy-overlay .agy-overlay-item:is(:hover, [data-highlighted], :focus-visible)'));
    assert.ok(css.includes('.agy-overlay .agy-overlay-item .bg-secondary.rounded-full'));
    assert.ok(css.includes('.agy-overlay .from-card'));
  }
});

test('buildStylesheet avoids bubble-mascot drop-shadow filters, enables GPU transform hints, and SurfaceEngine.apply memoizes identical CSS', () => {
  const origDoc = globalThis.document;
  const origWin = globalThis.window;
  const css = buildStylesheet({ ...DEFAULT_CONFIG, enabled: true }, {});
  assert.ok(!css.includes('.agy-ct-bubble-mascot {\n        position: absolute;\n        pointer-events: none;\n        z-index: 6;\n        filter:'));
  assert.ok(!/\.agy-ct-bubble-mascot\s*\{[^}]*?filter:\s*drop-shadow/i.test(css));
  assert.ok(/#agy-ct-pet-stage[\s\S]*?will-change:\s*transform/.test(css));
  assert.ok(/\.agy-ct-sticker-node[\s\S]*?will-change:\s*transform/.test(css));

  let cssWrites = 0;
  let storedCss = '';
  const styleEl = {
    id: 'agy-ct-styles',
    get textContent() {
      return storedCss;
    },
    set textContent(val) {
      cssWrites += 1;
      storedCss = val;
    }
  };
  const makeStyle = () => ({ setProperty() {}, removeProperty() {} });
  const shellEl = {
    style: makeStyle(),
    setAttribute() {},
    removeAttribute() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 800, right: 1200, bottom: 800 }),
    querySelector: () => null
  };
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  globalThis.document = {
    documentElement: { classList: { add() {}, remove() {} }, style: makeStyle() },
    body: { classList: { add() {}, remove() {} }, getAttribute: () => null, prepend() {}, appendChild() {} },
    head: { appendChild() {} },
    getElementById: (id) => (id === 'agy-ct-styles' ? styleEl : { style: makeStyle(), setAttribute() {} }),
    querySelector: (sel) => (sel.includes('.agy-shell') ? shellEl : null),
    querySelectorAll: () => []
  };

  try {
    const engine = new SurfaceEngine({ getConfig: () => DEFAULT_CONFIG, getCustomMedia: () => ({}) });
    engine.apply(DEFAULT_CONFIG, {}, { skipPrebake: true });
    engine.apply({ ...DEFAULT_CONFIG, pet: { ...DEFAULT_CONFIG.pet, pos: { xPct: 45, yPct: 50 } } }, {}, { skipPrebake: true });
    assert.equal(cssWrites, 1, 'Identical stylesheet output must not rewrite <style>.textContent');
  } finally {
    globalThis.document = origDoc;
    globalThis.window = origWin;
  }
});

test('buildStylesheet themes Overview Panel card hosts, section headers, count badges, and rows in dark and light modes without matching full-pane overview-panel-host', () => {
  for (const isLight of [false, true]) {
    const css = buildStylesheet({ ...DEFAULT_CONFIG, enabled: true, isLight }, {});
    assertBalancedCssBraces(css);
    assert.ok(!/backdrop-filter:\s*blur\(/i.test(css));

    assert.ok(css.includes('.animate-overview-panel'));
    assert.ok(css.includes('[data-testid="overview-panel-host-overlay"]'));
    assert.ok(css.includes('[data-testid="overview-panel-host-gutter"]'));
    assert.ok(css.includes('[data-testid="overview-panel-host-sibling"]'));
    assert.ok(css.includes('[data-testid="battle-overview-dropdown"]'));

    assert.ok(css.includes('[data-testid="overview-panel"]'));
    assert.ok(css.includes('[data-testid="overview-panel-customize-trigger"]'));
    assert.ok(css.includes('[data-testid^="overview-panel-row-"]'));
    assert.ok(css.includes('.rounded-full:is(.bg-border, .bg-muted, .bg-secondary)'));

    assert.ok(!css.includes('[data-testid="overview-panel-host"]'));
    assert.ok(!css.includes('[data-testid^="overview-panel-host-"]'));
  }
});

test('SurfaceEngine skips rAF on agent-response streaming mutations, eliminates CSS drop-shadow, pauses animations when idle, compacts CSS, and caches L-glass in localStorage', async () => {
  const css = buildStylesheet({ ...DEFAULT_CONFIG, enabled: true }, {});
  assertBalancedCssBraces(css);
  assert.ok(!/drop-shadow\(/i.test(css), 'Zero CSS filter: drop-shadow allowed anywhere in stylesheet');
  assert.ok(css.includes('.agy-ct-sticker-node.has-glow::before'));
  assert.ok(css.includes('html.agy-ct-idle-paused'));
  assert.ok(!css.includes('/* Zero Live Blur Architecture'), 'CSS block comments must be stripped');

  const origDoc = globalThis.document;
  const origWin = globalThis.window;
  const origMutationObserver = globalThis.MutationObserver;
  const origResizeObserver = globalThis.ResizeObserver;
  const origRaf = globalThis.requestAnimationFrame;
  const origCancelRaf = globalThis.cancelAnimationFrame;
  const origImage = globalThis.Image;
  const origStorage = globalThis.localStorage;

  try {
    let observerCb = null;
    const rafQueue = [];
    let domMutateCount = 0;

    const makeStyle = () => ({ setProperty() {}, removeProperty() {}, toggle() {} });
    const shellEl = {
      style: makeStyle(),
      setAttribute() {},
      removeAttribute() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 800, right: 1200, bottom: 800 }),
      querySelector: () => null
    };
    const rootClassList = new Set();
    const docRoot = {
      classList: {
        add: (c) => rootClassList.add(c),
        remove: (c) => rootClassList.delete(c),
        toggle: (c, force) => (force ? rootClassList.add(c) : rootClassList.delete(c)),
        contains: (c) => rootClassList.has(c)
      },
      style: makeStyle()
    };

    const storageMap = new Map();
    globalThis.localStorage = {
      getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
      setItem: (k, v) => storageMap.set(k, String(v)),
      removeItem: (k) => storageMap.delete(k)
    };
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    globalThis.MutationObserver = class {
      constructor(cb) {
        observerCb = cb;
      }
      observe() {}
      disconnect() {}
    };
    globalThis.requestAnimationFrame = (fn) => {
      rafQueue.push(fn);
      return rafQueue.length;
    };
    globalThis.cancelAnimationFrame = () => {};
    globalThis.window = {
      addEventListener() {},
      removeEventListener() {}
    };
    const fakeCanvasCtx = { filter: 'none', drawImage() {}, fillStyle: '', fillRect() {} };
    globalThis.document = {
      hidden: false,
      documentElement: docRoot,
      body: {
        classList: { add() {}, remove() {} },
        getAttribute: () => null,
        prepend() {},
        appendChild() {}
      },
      head: { appendChild() {} },
      createElement: (tag) => {
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: () => fakeCanvasCtx,
            toDataURL: (mime) => (mime === 'image/webp' ? 'data:image/webp;base64,MOCKBAKEDGLASS' : 'data:image/png;base64,MOCKBAKEDGLASS')
          };
        }
        return { style: makeStyle(), setAttribute() {}, appendChild() {} };
      },
      getElementById: () => ({ style: makeStyle(), setAttribute() {}, remove() {} }),
      querySelector: (sel) => (sel.includes('.agy-shell') ? shellEl : null),
      querySelectorAll: () => [],
      addEventListener() {},
      removeEventListener() {}
    };

    const engine = new SurfaceEngine({
      getConfig: () => DEFAULT_CONFIG,
      getCustomMedia: () => ({}),
      onDomMutate: () => {
        domMutateCount += 1;
      }
    });
    engine.mount();

    observerCb([
      {
        type: 'childList',
        target: { closest: (sel) => (sel.includes('[data-testid="agent-response"]') ? {} : null) },
        addedNodes: [],
        removedNodes: []
      }
    ]);
    assert.equal(rafQueue.length, 0, 'Streaming mutations inside agent-response must not schedule rAF');

    observerCb([
      {
        type: 'childList',
        target: { closest: () => null },
        addedNodes: [],
        removedNodes: []
      }
    ]);
    assert.equal(rafQueue.length, 1);
    rafQueue.shift()();
    assert.equal(domMutateCount, 1);
    engine.destroy();

    // Test localStorage cache hit for syncPrebakedGlass
    clearPrebakedGlassMemoryCache();
    globalThis.Image = class {
      constructor() {
        this.naturalWidth = 1600;
        this.naturalHeight = 900;
      }
      set src(_val) {
        this.onload?.();
      }
    };

    const glassProps = {};
    const glassShell = {
      style: {
        setProperty: (k, v) => {
          glassProps[k] = v;
        },
        removeProperty() {}
      }
    };
    const glassCfg = { ...DEFAULT_CONFIG, enabled: true, wallpaperId: 'custom', dimming: 25, glassBlur: 6 };
    const glassMedia = { wallpaper: 'data:image/webp;base64,MOCKSOURCEWP' };

    const firstBaked = await syncPrebakedGlass(glassShell, glassCfg, glassMedia);
    assert.equal(firstBaked, 'data:image/webp;base64,MOCKBAKEDGLASS');
    assert.ok(storageMap.has('agy_ct_glass_cache_v1'), 'syncPrebakedGlass must persist baked URI to localStorage');

    clearPrebakedGlassMemoryCache();
    delete glassProps['--agy-l-glass-bg'];
    globalThis.Image = class {
      constructor() {
        throw new Error('Should not decode Image on localStorage hit');
      }
    };

    const secondBaked = await syncPrebakedGlass(glassShell, glassCfg, glassMedia);
    assert.equal(secondBaked, 'data:image/webp;base64,MOCKBAKEDGLASS');
    assert.equal(glassProps['--agy-l-glass-bg'], 'url("data:image/webp;base64,MOCKBAKEDGLASS")');
  } finally {
    globalThis.document = origDoc;
    globalThis.window = origWin;
    globalThis.MutationObserver = origMutationObserver;
    globalThis.ResizeObserver = origResizeObserver;
    globalThis.requestAnimationFrame = origRaf;
    globalThis.cancelAnimationFrame = origCancelRaf;
    globalThis.Image = origImage;
    globalThis.localStorage = origStorage;
  }
});

test('buildStylesheet styles ancestor [data-split-panes] tiling panes, splitters, narrow pane toolbars, and lifts bottom launcher above split composers', () => {
  for (const isLight of [false, true]) {
    const css = buildStylesheet({ ...DEFAULT_CONFIG, enabled: true, isLight }, {});
    assertBalancedCssBraces(css);
    assert.ok(!css.includes('.agy-shell [data-split-panes]'), 'Must not nest [data-split-panes] under .agy-shell because data-split-panes is an ancestor');
    assert.ok(css.includes('body.agy-ct-active [data-split-panes] .agy-sheet[data-sheet-inset]'));
    assert.ok(css.includes('[data-testid="tiling-splitter"]'));
    assert.ok(css.includes('[data-splitter-band]'));
    assert.ok(css.includes('[data-testid="pane-titlebar-toolbar"][data-reveal-on-hover]'));
    assert.ok(css.includes('body[data-agy-split-active="1"] #agy-ct-launcher'));
    assert.ok(!css.includes('body:has([data-split-panes])'));
  }
});

test('Multi-split perf: buildStylesheet removes universal * selectors, overflow will-change bloat, and idle SVG child animations; SurfaceEngine skips tool-group-collapsible mutations and reports split pane count', () => {
  const css = buildStylesheet({ ...DEFAULT_CONFIG, enabled: true }, {});
  assertBalancedCssBraces(css);
  assert.ok(!css.includes('.agy-ct-bubble-styled *'));
  assert.ok(!css.includes('#agy-ct-settings-panel *'));
  assert.ok(!css.includes(':not(.settings-modal-container *)'));
  assert.ok(!css.includes('will-change: scroll-position'));
  assert.ok(css.includes('contain: layout style paint'));
  assert.ok(!/(?:^|\n)\.agy-ct-anim-spin\s*\{\s*animation:/m.test(css));
  assert.ok(css.includes('#agy-ct-pet-stage:is(:hover, .is-reacting) .agy-ct-anim-spin'));
  assert.ok(css.includes('.agy-ct-pet-body'));

  const origDoc = globalThis.document;
  const origWin = globalThis.window;
  const origMutationObserver = globalThis.MutationObserver;
  const origResizeObserver = globalThis.ResizeObserver;
  const origRaf = globalThis.requestAnimationFrame;
  const origCancelRaf = globalThis.cancelAnimationFrame;

  try {
    let observerCb = null;
    const rafQueue = [];
    let hasSplit = false;
    let tilingPanes = [];
    const splitEvents = [];

    const makeStyle = () => ({ setProperty() {}, removeProperty() {} });
    const shellEl = {
      style: makeStyle(),
      setAttribute() {},
      removeAttribute() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1400, height: 900, right: 1400, bottom: 900 }),
      querySelector: () => null
    };
    const bodyEl = {
      attributes: {},
      classList: { add() {}, remove() {} },
      getAttribute: (k) => bodyEl.attributes[k] ?? null,
      setAttribute: (k, v) => {
        bodyEl.attributes[k] = v;
      },
      removeAttribute: (k) => {
        delete bodyEl.attributes[k];
      },
      prepend() {},
      appendChild() {}
    };

    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    globalThis.MutationObserver = class {
      constructor(cb) {
        observerCb = cb;
      }
      observe() {}
      disconnect() {}
    };
    globalThis.requestAnimationFrame = (fn) => {
      rafQueue.push(fn);
      return rafQueue.length;
    };
    globalThis.cancelAnimationFrame = () => {};
    globalThis.window = {
      addEventListener() {},
      removeEventListener() {}
    };
    globalThis.document = {
      hidden: false,
      documentElement: { classList: { add() {}, remove() {}, toggle() {} }, style: makeStyle() },
      body: bodyEl,
      head: { appendChild() {} },
      getElementById: () => ({ style: makeStyle(), setAttribute() {}, remove() {} }),
      querySelector: (sel) => {
        if (sel.includes('.agy-shell')) return shellEl;
        if (sel === '[data-split-panes]') return hasSplit ? {} : null;
        return null;
      },
      querySelectorAll: (sel) => {
        if (sel === '[data-tiling-pane]') return tilingPanes;
        return [];
      },
      addEventListener() {},
      removeEventListener() {}
    };

    const engine = new SurfaceEngine({
      getConfig: () => DEFAULT_CONFIG,
      getCustomMedia: () => ({}),
      onSplitChange: (count) => splitEvents.push(count)
    });
    engine.mount();

    observerCb([
      {
        type: 'childList',
        target: { closest: (sel) => (sel.includes('[data-testid="tool-group-collapsible"]') ? {} : null) },
        addedNodes: [],
        removedNodes: []
      }
    ]);
    assert.equal(rafQueue.length, 0, 'Streaming mutations inside tool-group-collapsible must not schedule rAF');

    hasSplit = true;
    tilingPanes = [{}, {}, {}];
    engine.syncShellAndHoleMetrics(DEFAULT_CONFIG);
    assert.equal(bodyEl.attributes['data-agy-split-active'], '1');
    assert.deepEqual(splitEvents, [3]);

    engine.destroy();
  } finally {
    globalThis.document = origDoc;
    globalThis.window = origWin;
    globalThis.MutationObserver = origMutationObserver;
    globalThis.ResizeObserver = origResizeObserver;
    globalThis.requestAnimationFrame = origRaf;
    globalThis.cancelAnimationFrame = origCancelRaf;
  }
});

test('One Piece Dark & Light & Gear 5 Nika bundles emit balanced Zero-Live-Blur CSS with readable Light ink overrides', () => {
  const sunsetBundle = THEME_BUNDLES.find((b) => b.id === 'one-piece-sunny-sunset');
  const bountyBundle = THEME_BUNDLES.find((b) => b.id === 'one-piece-grand-line-bounty');
  const nikaBundle = THEME_BUNDLES.find((b) => b.id === 'one-piece-gear5-nika');
  assert.ok(sunsetBundle, 'Missing one-piece-sunny-sunset bundle');
  assert.ok(bountyBundle, 'Missing one-piece-grand-line-bounty bundle');
  assert.ok(nikaBundle, 'Missing one-piece-gear5-nika bundle');

  const darkCfg = sanitizeImportedConfig({ ...DEFAULT_CONFIG, ...sunsetBundle.patch, activeBundleId: sunsetBundle.id });
  const darkCss = buildStylesheet(darkCfg, {});
  assertBalancedCssBraces(darkCss);
  assert.ok(!/backdrop-filter:\s*blur\(/i.test(darkCss));
  assert.match(darkCss, /\.agy-ct-bubble-styled::after\s*\{[^}]*background-image:\s*url\("data:image\/svg\+xml/);
  assert.ok(darkCss.includes('#fef3c7'), 'Sunny Sunset bubble should preserve light ink over dark bubble surface');

  const nikaCfg = sanitizeImportedConfig({ ...DEFAULT_CONFIG, ...nikaBundle.patch, activeBundleId: nikaBundle.id });
  const nikaCss = buildStylesheet(nikaCfg, {});
  assertBalancedCssBraces(nikaCss);
  assert.ok(!/backdrop-filter:\s*blur\(/i.test(nikaCss));
  assert.match(nikaCss, /\.agy-ct-bubble-styled::after\s*\{[^}]*background-image:\s*url\("data:image\/svg\+xml/);

  const lightCfg = sanitizeImportedConfig({ ...DEFAULT_CONFIG, ...bountyBundle.patch, activeBundleId: bountyBundle.id });
  const lightCss = buildStylesheet(lightCfg, {});
  assertBalancedCssBraces(lightCss);
  assert.ok(!/backdrop-filter:\s*blur\(/i.test(lightCss));
  assert.ok(lightCss.includes('#0f172a'));
  assert.ok(lightCss.includes('#2b1d0e'), 'Wanted Bounty bubble should preserve dark parchment ink');
  assert.ok(lightCss.includes('width: 8px'), 'scrollCaps must emit 8px scroll cap pseudo-elements');
  assert.ok(
    !/\.agy-ct-bubble-styled::after\s*\{[^}]*background-image:/.test(lightCss),
    'lenh-truy-na must not emit cornerOrnament ::after override over scrollCaps'
  );
  // Light Mode host variable & surface contrast guards (overriding Antigravity Monokai/dark html[style] tokens)
  assert.ok(lightCss.includes('--foreground: #0f172a !important'), 'Light mode must override host --foreground token');
  assert.ok(lightCss.includes('--placeholder: #64748b !important'), 'Light mode must override host --placeholder token');
  assert.ok(lightCss.includes('--card: rgba(255, 252, 240, 0.96) !important'), 'Light mode must override host --card token');
  assert.ok(lightCss.includes('--color-card: rgba(255, 252, 240, 0.96) !important'), 'Light mode must override Tailwind --color-card token');
  assert.ok(lightCss.includes('--background: rgb(') && lightCss.includes('--color-background: rgb('), 'Light mode must override --background & --color-background');
  assert.ok(lightCss.includes('--color-muted-foreground: #475569 !important'), 'Light mode must override Tailwind --color-muted-foreground token');
  assert.ok(lightCss.includes('--color-secondary-foreground: #1e293b !important'), 'Light mode must override Tailwind --color-secondary-foreground token');
  assert.ok(lightCss.includes('--onyx-raised:'), 'Light mode must override --onyx-raised token');
  assert.match(lightCss, /\[data-mention-menu\]/, 'Both modes should style slash/mention autocomplete popup [data-mention-menu]');
  assert.ok(darkCss.includes('[data-mention-menu]'), 'Dark mode should also style [data-mention-menu] with Zero Live Blur');
  assert.match(lightCss, /\[class\*="@container\/titlebar"\]\s*:is\(/, 'Light mode must force readable ink on titlebar descendants');
  assert.match(lightCss, /\.surface-composer[\s\S]*p\.pointer-events-none/, 'Light mode must force dark muted placeholder inside composer');
  assert.ok(lightCss.includes('[data-side-panel-body="true"]'), 'Light mode must ensure dark readable ink inside side panel markdown views');
  assert.match(lightCss, /#agy-ct-launcher\s*\{[^}]*background:\s*#fffbeb/, 'Light mode launcher pill must use parchment light background');
  assert.match(lightCss, /\.agy-ct-pet-speech\s*\{[^}]*background:\s*#fffbeb/, 'Light mode pet speech bubble must use parchment light background');
  assert.match(lightCss, /\.agy-ct-pet-speech\.is-below\s*\{[^}]*top:\s*calc\(100% \+ 8px\)/, 'Pet speech must support downward flip near top edge');
  assert.match(lightCss, /\.agy-ct-pet-speech\.is-align-right\s*\{[^}]*right:\s*0/, 'Pet speech must support right-edge horizontal alignment');
  assert.match(lightCss, /#agy-ct-pet-stage\s*\{[^}]*pointer-events:\s*none/, 'Pet stage wrapper must allow click-passthrough on empty margin');
  assert.match(
    lightCss,
    /\.agy-ct-pet-body\s*>\s*img\s*\{[^}]*pointer-events:\s*auto[^}]*touch-action:\s*none/,
    'Pet img sprites must keep pointer-events:auto and touch-action:none for smooth dragging'
  );
  assert.match(
    lightCss,
    /\.agy-ct-svg-art\s+:is\([^)]*\bline\b[^)]*\)\s*\{[^}]*pointer-events:\s*visiblePainted/,
    'Inline SVG pets must hit-test all painted shape primitives including <line>'
  );
});

test('SurfaceEngine.decorateChatBubbles mounts luffy-chibi and luffy-gear5 mascots onto tight user bubbles', () => {
  const origDoc = globalThis.document;
  const origWin = globalThis.window;
  try {
    const makeClassList = () => {
      const set = new Set();
      return {
        add: (...c) => c.forEach((x) => set.add(x)),
        remove: (...c) => c.forEach((x) => set.delete(x)),
        contains: (c) => set.has(c)
      };
    };
    let createdHost = null;
    const bubbleFrame = {
      classList: makeClassList(),
      attributes: {},
      dataset: {},
      parentElement: null,
      closest: () => null,
      getAttribute: (k) => bubbleFrame.attributes[k] ?? null,
      querySelector: (sel) => (sel.includes('.agy-ct-bubble-mascot') ? createdHost : null),
      appendChild(node) {
        createdHost = node;
        node.parentElement = this;
        return node;
      }
    };
    globalThis.window = { addEventListener() {}, removeEventListener() {} };
    globalThis.document = {
      hidden: false,
      createElement: () => ({
        className: '',
        innerHTML: '',
        dataset: {},
        attributes: {},
        setAttribute(k, v) {
          this.attributes[k] = v;
        },
        remove() {
          createdHost = null;
        }
      }),
      querySelectorAll: (sel) => {
        if (sel.includes('.agy-user-bubble-frame')) return [bubbleFrame];
        if (sel === '.agy-ct-bubble-styled') return bubbleFrame.classList.contains('agy-ct-bubble-styled') ? [bubbleFrame] : [];
        return [];
      }
    };

    const engine = new SurfaceEngine({ getConfig: () => DEFAULT_CONFIG, getCustomMedia: () => ({}) });
    engine.decorateChatBubbles({ ...DEFAULT_CONFIG, enabled: true, bubbleId: 'mu-rom-hai-tac', bubbleMascotEnabled: true });
    assert.equal(bubbleFrame.classList.contains('agy-ct-bubble-styled'), true);
    assert.ok(createdHost, 'Expected bubble mascot host element');
    assert.match(createdHost.innerHTML, /^<svg[^>]*class="agy-ct-svg-art agy-ct-anim-bob"/);

    const firstSvg = createdHost.innerHTML;
    engine.decorateChatBubbles({ ...DEFAULT_CONFIG, enabled: true, bubbleId: 'gear5-nika', bubbleMascotEnabled: true });
    assert.notEqual(createdHost.innerHTML, firstSvg, 'Switching from mu-rom-hai-tac to gear5-nika must swap mascot artwork');
    assert.equal(createdHost.dataset.mascotKey, 'gear5-nika:luffy-gear5');
  } finally {
    globalThis.document = origDoc;
    globalThis.window = origWin;
  }
});

