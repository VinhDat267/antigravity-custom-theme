import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MEDIA_SLOTS,
  CONFIG_SCHEMA_VERSION,
  CONFIG_MIGRATIONS,
  DEFAULT_CONFIG,
  mergeConfig,
  migrateConfig,
  sanitizeCssText,
  sanitizeImportedConfig,
  exportPortableConfig,
  loadConfig,
  saveConfig,
  resetConfig,
  loadCustomMediaMap,
  saveCustomMedia,
  deleteCustomMedia
} from '../src/core/config-store.js';
import { buildStylesheet } from '../src/core/surface-engine.js';

function createMockWindow({ local = {}, boot = null } = {}) {
  const store = new Map(Object.entries(local));
  const emitted = [];
  return {
    emitted,
    __AGY_THEME_BOOT__: boot,
    __agyThemeBridge: (raw) => emitted.push(JSON.parse(raw)),
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    }
  };
}

test('mergeConfig deep merges nested objects while replacing arrays cleanly', () => {
  const merged = mergeConfig(DEFAULT_CONFIG, {
    dimming: 40,
    pet: { mode: 'roam', size: 100 },
    stickers: { items: [{ id: 'den-long', slot: 'input-top-left', size: 48 }] }
  });
  assert.equal(merged.dimming, 40);
  assert.equal(merged.pet.mode, 'roam');
  assert.equal(merged.pet.id, DEFAULT_CONFIG.pet.id);
  assert.equal(merged.stickers.items.length, 1);
  assert.equal(merged.stickers.items[0].id, 'den-long');
});

test('loadConfig prioritizes authoritative __AGY_THEME_BOOT__.config across ephemeral port restarts', () => {
  const emptyOriginWin = createMockWindow({
    boot: {
      config: { wallpaperId: 'kanagawa-wave', dimming: 33, __savedAt: 500 },
      media: {}
    }
  });
  const loadedFromEmpty = loadConfig(emptyOriginWin);
  assert.equal(loadedFromEmpty.wallpaperId, 'kanagawa-wave');
  assert.equal(loadedFromEmpty.dimming, 33);
  assert.ok(emptyOriginWin.localStorage.getItem('agy_custom_theme_v1'));

  const staleLocalWin = createMockWindow({
    local: {
      agy_custom_theme_v1: JSON.stringify({ wallpaperId: 'obsidian-nebula', __savedAt: 100 })
    },
    boot: {
      config: { wallpaperId: 'kanagawa-wave', __savedAt: 200 },
      media: {}
    }
  });
  assert.equal(loadConfig(staleLocalWin).wallpaperId, 'kanagawa-wave');

  const fresherLocalWin = createMockWindow({
    local: {
      agy_custom_theme_v1: JSON.stringify({ wallpaperId: 'sakura-shrine-night', __savedAt: 900 })
    },
    boot: {
      config: { wallpaperId: 'kanagawa-wave', __savedAt: 200 },
      media: {}
    }
  });
  assert.equal(loadConfig(fresherLocalWin).wallpaperId, 'sakura-shrine-night');
});

test('sanitizeImportedConfig clamps bounds, strips local OS paths, and neutralizes </style in customCss', () => {
  assert.equal(
    sanitizeCssText('body { color: red; }</sTyLe><script>alert(1)</script>\0'),
    'body { color: red; }><script>alert(1)</script>'
  );

  const sanitized = sanitizeImportedConfig({
    dimming: 500,
    glassBlur: -9,
    wpBlur: 99,
    wallpaperId: 'C:\\Users\\DemoUser\\secret.png',
    wallpaperPos: '/Users/dev/bg.jpg',
    avatars: { size: 999, radius: -10, rotate: 180, agentMode: 'invalid' },
    pet: { mode: 'teleport', size: 10, opacity: 200 },
    customCss: '.a { color: #fff; }</style><img src=x>',
    unknownDangerousProp: 'drop'
  });

  assert.equal(sanitized.dimming, 92);
  assert.equal(sanitized.glassBlur, 0);
  assert.equal(sanitized.wpBlur, 20);
  assert.equal(sanitized.wallpaperId, '');
  assert.equal(sanitized.wallpaperPos, DEFAULT_CONFIG.wallpaperPos);
  assert.equal(sanitized.avatars.size, 64);
  assert.equal(sanitized.avatars.radius, 0);
  assert.equal(sanitized.avatars.rotate, 45);
  assert.equal(sanitized.avatars.agentMode, 'star');
  assert.equal(sanitized.pet.mode, 'float');
  assert.equal(sanitized.pet.size, 44);
  assert.equal(sanitized.pet.opacity, 100);
  assert.equal(sanitizeImportedConfig({ pet: { size: 220 } }).pet.size, 220);
  assert.equal(sanitizeImportedConfig({ pet: { size: 999 } }).pet.size, 240);
  assert.ok(!/<\/style/i.test(sanitized.customCss));
  assert.equal(sanitized.unknownDangerousProp, undefined);

  const exported = exportPortableConfig({ ...DEFAULT_CONFIG, customSelectors: { appShell: '.agy-shell' } });
  const reparsed = JSON.parse(exported);
  assert.equal(reparsed.__savedAt, undefined);
  assert.ok(!/[A-Za-z]:\\/.test(exported));
});

test('sanitizeImportedConfig sanitizes customBundles entries and drops malformed items', () => {
  const sanitized = sanitizeImportedConfig({
    customBundles: [
      null,
      { id: 123, name: 'Bad' },
      {
        id: 'my-bundle',
        name: 'My Bundle',
        patch: {
          dimming: 999,
          wallpaperId: 'C:\\Users\\Secret\\bg.png',
          wallpaperPos: 'center; background: red',
          customCss: 'a{}</style><script>alert(1)</script>',
          accentColor: 'not-a-color'
        }
      }
    ]
  });

  assert.equal(sanitized.customBundles.length, 1);
  const [b] = sanitized.customBundles;
  assert.equal(b.id, 'my-bundle');
  assert.equal(b.patch.dimming, 92);
  assert.equal(b.patch.wallpaperId, '');
  assert.equal(b.patch.wallpaperPos, DEFAULT_CONFIG.wallpaperPos);
  assert.ok(!/<\/style/i.test(b.patch.customCss));
  assert.equal(b.patch.accentColor, DEFAULT_CONFIG.accentColor);
});

test('saveConfig, resetConfig, and custom media methods emit __agyThemeBridge payloads', async () => {
  assert.deepEqual(MEDIA_SLOTS, ['wallpaper', 'wallpaperLight', 'userAvatar', 'agentAvatar', 'pet', 'sticker']);
  const win = createMockWindow({
    boot: {
      config: { ...DEFAULT_CONFIG, hiddenWallpapers: ['obsidian-nebula'], customBundles: [{ id: 'mine', name: 'Mine', patch: {} }] },
      media: { userAvatar: 'data:image/webp;base64,USER' }
    }
  });

  const saved = saveConfig({ ...DEFAULT_CONFIG, dimming: 55 }, win);
  assert.ok(saved.__savedAt > 0);
  assert.equal(win.emitted.at(-1).type, 'config');
  assert.equal(win.emitted.at(-1).data.dimming, 55);

  await saveCustomMedia('wallpaper', 'data:image/webp;base64,WP1', win);
  assert.equal(win.emitted.at(-1).type, 'media');
  assert.equal(win.emitted.at(-1).key, 'wallpaper');
  assert.equal(win.emitted.at(-1).dataUrl, 'data:image/webp;base64,WP1');

  await deleteCustomMedia('wallpaper', win);
  assert.equal(win.emitted.at(-1).dataUrl, null);

  const mediaMap = await loadCustomMediaMap(win);
  assert.equal(mediaMap.userAvatar, 'data:image/webp;base64,USER');

  const afterReset = resetConfig(
    {
      ...DEFAULT_CONFIG,
      dimming: 80,
      hiddenWallpapers: ['thunder-samurai'],
      customBundles: [{ id: 'custom-1', name: 'C1', patch: {} }],
      customSelectors: { chatBubble: '.my-bubble' }
    },
    win
  );
  assert.equal(afterReset.dimming, DEFAULT_CONFIG.dimming);
  assert.deepEqual(afterReset.hiddenWallpapers, ['thunder-samurai']);
  assert.equal(afterReset.customBundles.length, 1);
  assert.equal(afterReset.customSelectors.chatBubble, '.my-bubble');
  assert.equal(afterReset.wallpaperId, 'none');
});

test('loadCustomMediaMap batches IndexedDB reads into one readonly transaction and releases __AGY_THEME_BOOT__.media heap references safely', async () => {
  const idbData = new Map([
    ['wallpaper', 'data:image/webp;base64,OLD_WP'],
    ['sticker', 'data:image/webp;base64,STALE_STICKER']
  ]);
  let readonlyTxCount = 0;
  let readwriteTxCount = 0;

  const makeMockIdb = () => ({
    open: () => {
      const req = {
        result: {
          objectStoreNames: { contains: () => true },
          transaction: (_store, mode) => {
            if (mode === 'readonly') readonlyTxCount += 1;
            if (mode === 'readwrite') readwriteTxCount += 1;
            const tx = {
              oncomplete: null,
              onerror: null,
              objectStore: () => ({
                get: (k) => {
                  const r = { result: idbData.get(k), onsuccess: null, onerror: null };
                  queueMicrotask(() => r.onsuccess?.());
                  return r;
                },
                put: (val, k) => {
                  idbData.set(k, val);
                },
                delete: (k) => {
                  idbData.delete(k);
                }
              })
            };
            queueMicrotask(() => tx.oncomplete?.());
            return tx;
          },
          close() {}
        },
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null
      };
      queueMicrotask(() => req.onsuccess?.());
      return req;
    }
  });

  const win = createMockWindow({
    boot: {
      config: { ...DEFAULT_CONFIG, wallpaperId: 'custom', __savedAt: 777 },
      media: {
        wallpaper: 'data:image/webp;base64,FRESH_DISK_WP',
        pet: 'data:image/webp;base64,DISK_PET'
      }
    }
  });
  win.indexedDB = makeMockIdb();

  const map = await loadCustomMediaMap(win);
  assert.equal(readonlyTxCount, 1, `Expected 1 batched readonly transaction across 6 slots, got ${readonlyTxCount}`);
  assert.ok(readwriteTxCount <= 1, `Expected <= 1 batched readwrite sync transaction, got ${readwriteTxCount}`);
  assert.equal(map.wallpaper, 'data:image/webp;base64,FRESH_DISK_WP');
  assert.equal(map.pet, 'data:image/webp;base64,DISK_PET');
  assert.equal(map.sticker, undefined, 'Missing disk slot with authoritative host config must be pruned');
  assert.equal(win.__AGY_THEME_BOOT__.media, null, 'Duplicate boot.media base64 map must be released after loadCustomMediaMap');
  assert.equal(win.__AGY_THEME_BOOT__.config.__savedAt, 777, 'boot.config metadata must remain intact');

  // Subsequent loadCustomMediaMap call on same window must preserve IndexedDB media without wiping
  const secondMap = await loadCustomMediaMap(win);
  assert.equal(secondMap.wallpaper, 'data:image/webp;base64,FRESH_DISK_WP');
  assert.equal(secondMap.pet, 'data:image/webp;base64,DISK_PET');

  // Frozen __AGY_THEME_BOOT__ must not throw when attempting to release boot.media
  const frozenWin = createMockWindow({
    boot: Object.freeze({
      config: Object.freeze({ ...DEFAULT_CONFIG }),
      media: Object.freeze({ userAvatar: 'data:image/webp;base64,FROZEN_AV' })
    })
  });
  const frozenMap = await loadCustomMediaMap(frozenWin);
  assert.equal(frozenMap.userAvatar, 'data:image/webp;base64,FROZEN_AV');
});

test('every CONFIG_MIGRATIONS step is additive', () => {
  assert.equal(CONFIG_SCHEMA_VERSION, 1);
  assert.equal(DEFAULT_CONFIG.schemaVersion, 1);
  assert.ok(Array.isArray(CONFIG_MIGRATIONS) && CONFIG_MIGRATIONS.length >= 1);

  const schema0Fixture = {
    enabled: true,
    lang: 'en',
    isLight: false,
    activeBundleId: 'thunder-samurai-pack',
    wallpaperId: 'thunder-samurai',
    wallpaperFit: 'cover',
    wallpaperPos: 'center center',
    dimming: 26,
    wpBlur: 0,
    glassBlur: 4,
    surfaces: { sidebarOpacity: 52, headerOpacity: 44, aiCardOpacity: 64, codeOpacity: 62 },
    accentColor: '#f5c451',
    secondaryColor: '#60a5fa',
    overlayRgb: '11, 16, 27',
    atmosphereId: 'thunder-rain',
    atmosphereIntensity: 65,
    bubbleId: 'loi-kiem',
    bubbleMascotEnabled: true,
    inputId: 'loi-anh-kim',
    avatars: { userEnabled: false, agentEnabled: true, agentMode: 'star', size: 32, radius: 50, rotate: 0 },
    pet: {
      enabled: true,
      id: 'loi-kiem',
      size: 88,
      opacity: 96,
      mode: 'float',
      pos: { xPct: 22, yPct: 14 },
      showSpeechOnClick: true
    },
    stickers: {
      enabled: true,
      items: [{ id: 'bua-loi-an', slot: 'input-top-right', size: 52, glow: true, opacity: 96, pos: { xPct: 82, yPct: 72 } }]
    },
    customCss: '',
    launcherPill: { enabled: true, corner: 'bottom-right' },
    customSelectors: {
      appShell: '',
      sidebar: '',
      mainCanvas: '',
      chatBubble: '',
      chatInput: '',
      settingsNavList: '',
      settingsContent: ''
    },
    hiddenWallpapers: [],
    hiddenStickers: [],
    hiddenPets: [],
    customBundles: [],
    __savedAt: 100
  };

  const fixturesBySchema = {
    0: schema0Fixture
  };

  const isPlain = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
  const collectLeafPaths = (obj, prefix = []) => {
    const leaves = [];
    for (const [k, v] of Object.entries(obj)) {
      const nextPath = [...prefix, k];
      if (isPlain(v) && Object.keys(v).length > 0) {
        leaves.push(...collectLeafPaths(v, nextPath));
      } else {
        leaves.push([nextPath, v]);
      }
    }
    return leaves;
  };
  const readPath = (obj, parts) => {
    let cur = obj;
    for (const part of parts) {
      if (!cur || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, part)) {
        return { found: false, value: undefined };
      }
      cur = cur[part];
    }
    return { found: true, value: cur };
  };

  for (const step of CONFIG_MIGRATIONS) {
    assert.equal(step.to, step.from + 1);
    const input = fixturesBySchema[step.from];
    assert.ok(input, `Missing fixture for schema ${step.from}`);
    const clonedInput = JSON.parse(JSON.stringify(input));
    const output = step.up(clonedInput);
    assert.equal(output.schemaVersion, step.to);
    for (const [leafPath, leafVal] of collectLeafPaths(input)) {
      if (step.from > 0 && leafPath.length === 1 && leafPath[0] === 'schemaVersion') continue;
      const got = readPath(output, leafPath);
      assert.equal(got.found, true, `Expected additive migration to keep path ${leafPath.join('.')}`);
      assert.deepEqual(got.value, leafVal);
    }
    fixturesBySchema[step.to] = output;
  }
});

test('migrateConfig upgrades missing schemaVersion to 1 and leaves higher schema untouched', () => {
  const v0 = migrateConfig({ dimming: 40, pet: { id: 'meo-than' } });
  assert.equal(v0.fromVersion, 0);
  assert.equal(v0.toVersion, 1);
  assert.equal(v0.migrated, true);
  assert.equal(v0.config.schemaVersion, 1);
  assert.equal(v0.config.dimming, 40);
  assert.equal(v0.config.pet.id, 'meo-than');

  const v1 = migrateConfig({ schemaVersion: 1, dimming: 33 });
  assert.equal(v1.fromVersion, 1);
  assert.equal(v1.toVersion, 1);
  assert.equal(v1.migrated, false);
  assert.equal(v1.config.schemaVersion, 1);

  const v3 = migrateConfig({ schemaVersion: 3, futureFlag: true, dimming: 25 });
  assert.equal(v3.fromVersion, 3);
  assert.equal(v3.toVersion, 3);
  assert.equal(v3.migrated, false);
  assert.equal(v3.config.schemaVersion, 3);
  assert.equal(v3.config.futureFlag, true);

  const upgradedWin = createMockWindow({
    boot: { config: { wallpaperId: 'kanagawa-wave', __savedAt: 500 }, media: {} }
  });
  assert.equal(loadConfig(upgradedWin).schemaVersion, 1);

  const higherWin = createMockWindow({
    boot: { config: { schemaVersion: 3, futureFlag: true, __savedAt: 500 }, media: {} }
  });
  const higherLoaded = loadConfig(higherWin);
  assert.equal(higherLoaded.schemaVersion, 3);
  assert.equal(higherLoaded.futureFlag, true);
});

test('sanitizeImportedConfig preserveUnknown keeps unknown nested keys and drops __proto__', () => {
  const out = sanitizeImportedConfig(
    {
      schemaVersion: 3,
      futureFlag: true,
      pet: { futureMood: 'happy' },
      ['__proto__']: { x: 1 },
      constructor: { y: 2 },
      prototype: { z: 3 },
      nonJsonFn: () => 1
    },
    { preserveUnknown: true }
  );
  assert.equal(out.schemaVersion, 3);
  assert.equal(out.futureFlag, true);
  assert.equal(out.pet.futureMood, 'happy');
  assert.equal(({}).x, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(out, '__proto__'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(out, 'constructor'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(out, 'prototype'), false);
  assert.equal(out.nonJsonFn, undefined);

  const capped = sanitizeImportedConfig(
    {
      schemaVersion: 2,
      smallUnknown: 'kept',
      hugeUnknown: 'x'.repeat(70 * 1024)
    },
    { preserveUnknown: true }
  );
  assert.equal(capped.smallUnknown, 'kept');
  assert.equal(capped.hugeUnknown, undefined);
});

test('sanitizeImportedConfig without preserveUnknown still drops unknown keys (import path)', () => {
  const out = sanitizeImportedConfig({
    schemaVersion: 2,
    futureFlag: true,
    pet: { id: 'loi-kiem', futureMood: 'happy' }
  });
  assert.equal(out.schemaVersion, 2);
  assert.equal(out.futureFlag, undefined);
  assert.equal(out.pet.futureMood, undefined);
  assert.equal(out.pet.id, 'loi-kiem');
});

test('unknown preset ids render defaults without rewriting config', () => {
  const cfg = {
    ...DEFAULT_CONFIG,
    activeBundleId: 'missing-bundle',
    wallpaperId: 'missing-wp',
    bubbleId: 'missing',
    inputId: 'missing-input',
    pet: { ...DEFAULT_CONFIG.pet, id: 'missing-pet' },
    stickers: {
      enabled: true,
      items: [{ id: 'missing-sticker', slot: 'free', size: 48, glow: true, opacity: 90, pos: { xPct: 50, yPct: 50 } }]
    }
  };
  const before = JSON.stringify(cfg);
  const css = buildStylesheet(cfg, {});
  assert.ok(typeof css === 'string' && css.length > 100);
  assert.equal(JSON.stringify(cfg), before);

  const sanitized = sanitizeImportedConfig(cfg, { preserveUnknown: true });
  assert.equal(sanitized.bubbleId, 'missing');
  assert.equal(sanitized.wallpaperId, 'missing-wp');
  assert.equal(sanitized.inputId, 'missing-input');
  assert.equal(sanitized.pet.id, 'missing-pet');
});
