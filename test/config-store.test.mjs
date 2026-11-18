import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MEDIA_SLOTS,
  DEFAULT_CONFIG,
  mergeConfig,
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
