/**
 * Authoritative host-synced configuration & custom media storage.
 * Uses user-data/ via CDP __agyThemeBridge as source of truth across ephemeral loopback ports,
 * with localStorage & IndexedDB as fast session / preview.html caches.
 */

const CONFIG_STORAGE_KEY = 'agy_custom_theme_v1';
const MEDIA_DB_NAME = 'agy_custom_theme_media_v1';
const MEDIA_STORE_NAME = 'assets';

export const MEDIA_SLOTS = ['wallpaper', 'wallpaperLight', 'userAvatar', 'agentAvatar', 'pet', 'sticker'];

export const DEFAULT_CONFIG = {
  enabled: true,
  lang: 'vi',
  isLight: false,
  activeBundleId: 'thunder-samurai-pack',
  wallpaperId: 'thunder-samurai',
  wallpaperFit: 'cover',
  wallpaperPos: 'center center',
  dimming: 26,
  wpBlur: 0,
  glassBlur: 4,
  surfaces: {
    sidebarOpacity: 52,
    headerOpacity: 44,
    aiCardOpacity: 64,
    codeOpacity: 62
  },
  accentColor: '#f5c451',
  secondaryColor: '#60a5fa',
  overlayRgb: '11, 16, 27',
  atmosphereId: 'thunder-rain',
  atmosphereIntensity: 65,
  bubbleId: 'loi-kiem',
  bubbleMascotEnabled: true,
  inputId: 'loi-anh-kim',
  avatars: {
    userEnabled: false,
    agentEnabled: true,
    agentMode: 'star',
    size: 32,
    radius: 50,
    rotate: 0
  },
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
    items: [
      { id: 'bua-loi-an', slot: 'input-top-right', size: 52, glow: true, opacity: 96, pos: { xPct: 82, yPct: 72 } },
      { id: 'non-la-lu-khach', slot: 'sidebar-bottom-right', size: 46, glow: true, opacity: 94, pos: { xPct: 16, yPct: 88 } }
    ]
  },
  customCss: '',
  launcherPill: {
    enabled: true,
    corner: 'bottom-right'
  },
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
  __savedAt: 0
};

function csDeepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function csClamp(val, min, max, fallback) {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function csLooksLikeLocalPath(str) {
  if (typeof str !== 'string') return false;
  const trimmed = str.trim();
  return /^[a-zA-Z]:[\\/]/.test(trimmed) || /^\/(?:Users|home|var|tmp|etc|opt|mnt)\//i.test(trimmed);
}

function csCleanString(str, fallback = '') {
  if (typeof str !== 'string') return fallback;
  const cleaned = str.replace(/\0/g, '').trim();
  if (csLooksLikeLocalPath(cleaned)) return fallback;
  return cleaned;
}

function csMergeDeep(base, patch) {
  const out = csDeepClone(base);
  if (!patch || typeof patch !== 'object') return out;
  for (const [k, v] of Object.entries(patch)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    if (Array.isArray(v)) {
      out[k] = csDeepClone(v);
    } else if (v && typeof v === 'object' && !Array.isArray(out[k]) && typeof out[k] === 'object' && out[k] !== null) {
      out[k] = csMergeDeep(out[k], v);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

export function mergeConfig(base, patch) {
  return csMergeDeep(base, patch);
}

export function sanitizeCssText(cssText) {
  if (typeof cssText !== 'string') return '';
  return cssText.replace(/\0/g, '').replace(/<\/style/gi, '');
}

function csSanitizeStickerItems(items) {
  if (!Array.isArray(items)) return csDeepClone(DEFAULT_CONFIG.stickers.items);
  const validSlots = new Set(['input-top-right', 'input-top-left', 'sidebar-bottom-right', 'greeting-badge', 'free']);
  return items
    .filter((it) => it && typeof it === 'object' && typeof it.id === 'string')
    .slice(0, 24)
    .map((it) => ({
      id: csCleanString(it.id, 'trang-sao'),
      slot: validSlots.has(it.slot) ? it.slot : 'free',
      size: csClamp(it.size, 24, 140, 50),
      glow: it.glow !== false,
      opacity: csClamp(it.opacity, 15, 100, 95),
      pos: {
        xPct: csClamp(it.pos?.xPct, 1, 96, 80),
        yPct: csClamp(it.pos?.yPct, 1, 96, 72)
      }
    }));
}

function csSanitizeConfigCore(rawObj) {
  const src = rawObj && typeof rawObj === 'object' && !Array.isArray(rawObj) ? rawObj : {};
  const d = csDeepClone(DEFAULT_CONFIG);

  const validFits = new Set(['cover', 'contain']);
  const validModes = new Set(['float', 'roam', 'follow']);
  const validCorners = new Set(['top-right', 'bottom-right', 'bottom-left']);
  const validAgentModes = new Set(['star', 'custom']);
  const validPosRe = /^(?:left|center|right|\d+%)\s+(?:top|center|bottom|\d+%)$/;

  const rawPos = csCleanString(src.wallpaperPos, d.wallpaperPos);
  const safePos = validPosRe.test(rawPos) ? rawPos : d.wallpaperPos;

  const sanitizeSelectorMap = (sel) => {
    const out = { ...d.customSelectors };
    if (!sel || typeof sel !== 'object') return out;
    for (const key of Object.keys(out)) {
      out[key] = csCleanString(sel[key], '').slice(0, 300);
    }
    return out;
  };

  const sanitizeIdList = (arr) =>
    Array.isArray(arr)
      ? arr.filter((x) => typeof x === 'string' && /^[a-z0-9-]+$/i.test(x)).slice(0, 64)
      : [];

  return {
    enabled: typeof src.enabled === 'boolean' ? src.enabled : d.enabled,
    lang: src.lang === 'en' ? 'en' : 'vi',
    isLight: typeof src.isLight === 'boolean' ? src.isLight : d.isLight,
    activeBundleId: csCleanString(src.activeBundleId, d.activeBundleId),
    wallpaperId: typeof src.wallpaperId === 'string' ? csCleanString(src.wallpaperId, '') : d.wallpaperId,
    wallpaperFit: validFits.has(src.wallpaperFit) ? src.wallpaperFit : d.wallpaperFit,
    wallpaperPos: safePos,
    dimming: csClamp(src.dimming, 0, 92, d.dimming),
    wpBlur: csClamp(src.wpBlur, 0, 20, d.wpBlur),
    glassBlur: csClamp(src.glassBlur, 0, 16, d.glassBlur),
    surfaces: {
      sidebarOpacity: csClamp(src.surfaces?.sidebarOpacity, 0, 98, d.surfaces.sidebarOpacity),
      headerOpacity: csClamp(src.surfaces?.headerOpacity, 0, 98, d.surfaces.headerOpacity),
      aiCardOpacity: csClamp(src.surfaces?.aiCardOpacity, 0, 98, d.surfaces.aiCardOpacity),
      codeOpacity: csClamp(src.surfaces?.codeOpacity, 0, 98, d.surfaces.codeOpacity)
    },
    accentColor: /^#[0-9a-fA-F]{3,8}$/.test(String(src.accentColor || '')) ? src.accentColor : d.accentColor,
    secondaryColor: /^#[0-9a-fA-F]{3,8}$/.test(String(src.secondaryColor || '')) ? src.secondaryColor : d.secondaryColor,
    overlayRgb: /^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/.test(String(src.overlayRgb || '')) ? src.overlayRgb : d.overlayRgb,
    atmosphereId: csCleanString(src.atmosphereId, d.atmosphereId),
    atmosphereIntensity: csClamp(src.atmosphereIntensity, 10, 100, d.atmosphereIntensity),
    bubbleId: csCleanString(src.bubbleId, d.bubbleId),
    bubbleMascotEnabled: typeof src.bubbleMascotEnabled === 'boolean' ? src.bubbleMascotEnabled : d.bubbleMascotEnabled,
    inputId: csCleanString(src.inputId, d.inputId),
    avatars: {
      userEnabled: typeof src.avatars?.userEnabled === 'boolean' ? src.avatars.userEnabled : d.avatars.userEnabled,
      agentEnabled: typeof src.avatars?.agentEnabled === 'boolean' ? src.avatars.agentEnabled : d.avatars.agentEnabled,
      agentMode: validAgentModes.has(src.avatars?.agentMode) ? src.avatars.agentMode : d.avatars.agentMode,
      size: csClamp(src.avatars?.size, 18, 64, d.avatars.size),
      radius: csClamp(src.avatars?.radius, 0, 50, d.avatars.radius),
      rotate: csClamp(src.avatars?.rotate, -45, 45, d.avatars.rotate)
    },
    pet: {
      enabled: typeof src.pet?.enabled === 'boolean' ? src.pet.enabled : d.pet.enabled,
      id: csCleanString(src.pet?.id, d.pet.id),
      size: csClamp(src.pet?.size, 44, 240, d.pet.size),
      opacity: csClamp(src.pet?.opacity, 20, 100, d.pet.opacity),
      mode: validModes.has(src.pet?.mode) ? src.pet.mode : d.pet.mode,
      pos: {
        xPct: csClamp(src.pet?.pos?.xPct, 1, 95, d.pet.pos.xPct),
        yPct: csClamp(src.pet?.pos?.yPct, 1, 95, d.pet.pos.yPct)
      },
      showSpeechOnClick:
        typeof src.pet?.showSpeechOnClick === 'boolean' ? src.pet.showSpeechOnClick : d.pet.showSpeechOnClick
    },
    stickers: {
      enabled: typeof src.stickers?.enabled === 'boolean' ? src.stickers.enabled : d.stickers.enabled,
      items: csSanitizeStickerItems(src.stickers?.items)
    },
    customCss: sanitizeCssText(csCleanString(src.customCss, '')),
    launcherPill: {
      enabled: typeof src.launcherPill?.enabled === 'boolean' ? src.launcherPill.enabled : d.launcherPill.enabled,
      corner: validCorners.has(src.launcherPill?.corner) ? src.launcherPill.corner : d.launcherPill.corner
    },
    customSelectors: sanitizeSelectorMap(src.customSelectors),
    hiddenWallpapers: sanitizeIdList(src.hiddenWallpapers),
    hiddenStickers: sanitizeIdList(src.hiddenStickers),
    hiddenPets: sanitizeIdList(src.hiddenPets)
  };
}

function csSanitizeBundlePatch(rawPatch) {
  if (!rawPatch || typeof rawPatch !== 'object' || Array.isArray(rawPatch)) return {};
  const sanitized = csSanitizeConfigCore(rawPatch);
  const patch = {};
  for (const key of Object.keys(rawPatch)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    if (key === 'customBundles' || key === '__savedAt') continue;
    if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
      patch[key] = sanitized[key];
    }
  }
  return patch;
}

export function sanitizeImportedConfig(rawObj) {
  const src = rawObj && typeof rawObj === 'object' && !Array.isArray(rawObj) ? rawObj : {};
  const core = csSanitizeConfigCore(src);

  const sanitizeCustomBundles = (bundles) => {
    if (!Array.isArray(bundles)) return [];
    const out = [];
    for (const item of bundles) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      if (typeof item.id !== 'string') continue;
      const cleanId = csCleanString(item.id, '').slice(0, 80);
      if (!cleanId) continue;
      out.push({
        id: cleanId,
        name: csCleanString(item.name, cleanId).slice(0, 80),
        nameEn: csCleanString(item.nameEn, csCleanString(item.name, cleanId)).slice(0, 80),
        subtitle: csCleanString(item.subtitle, '').slice(0, 120),
        subtitleEn: csCleanString(item.subtitleEn, '').slice(0, 120),
        badge: csCleanString(item.badge, 'Custom').slice(0, 32),
        patch: csSanitizeBundlePatch(item.patch)
      });
      if (out.length >= 24) break;
    }
    return out;
  };

  return {
    ...core,
    customBundles: sanitizeCustomBundles(src.customBundles),
    __savedAt: Number.isFinite(Number(src.__savedAt)) ? Number(src.__savedAt) : 0
  };
}

export function exportPortableConfig(config) {
  const safe = sanitizeImportedConfig(config);
  delete safe.__savedAt;
  return JSON.stringify(safe, null, 2);
}

function csResolveWindow(envWindow) {
  if (envWindow !== undefined) return envWindow;
  return typeof window !== 'undefined' ? window : null;
}

function csEmitBridge(message, envWindow) {
  const win = csResolveWindow(envWindow);
  try {
    const bridge = win?.__agyThemeBridge;
    if (typeof bridge === 'function') {
      bridge(JSON.stringify(message));
    }
  } catch {
    // Host bridge unavailable (e.g. preview.html)
  }
}

function csReadLocal(win) {
  try {
    const raw = win?.localStorage?.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function csWriteLocal(win, cfg) {
  try {
    win?.localStorage?.setItem(CONFIG_STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // Ignore quota errors
  }
}

export function loadConfig(envWindow) {
  const win = csResolveWindow(envWindow);
  const local = csReadLocal(win);
  const bootCfg = win?.__AGY_THEME_BOOT__?.config;
  const boot = bootCfg && typeof bootCfg === 'object' ? bootCfg : null;

  let chosen = local;
  if (boot && (!local || Number(boot.__savedAt || 0) >= Number(local.__savedAt || 0))) {
    chosen = boot;
  }
  if (!chosen) return csDeepClone(DEFAULT_CONFIG);

  const cfg = csMergeDeep(DEFAULT_CONFIG, chosen);
  cfg.customCss = sanitizeCssText(cfg.customCss || '');
  if (chosen === boot) {
    csWriteLocal(win, cfg);
  }
  return cfg;
}

export function saveConfig(cfg, envWindow) {
  const win = csResolveWindow(envWindow);
  const next = csMergeDeep(DEFAULT_CONFIG, cfg);
  next.customCss = sanitizeCssText(next.customCss || '');
  next.__savedAt = Date.now();
  csWriteLocal(win, next);
  csEmitBridge({ type: 'config', data: next }, win);
  return next;
}

export function syncConfigToHost(cfg, envWindow) {
  csEmitBridge({ type: 'config-init', data: cfg }, envWindow);
}

export function resetConfig(current = null, envWindow) {
  const fresh = csDeepClone(DEFAULT_CONFIG);
  if (current) {
    fresh.lang = current.lang === 'en' ? 'en' : 'vi';
    fresh.hiddenWallpapers = [...(current.hiddenWallpapers || [])];
    fresh.hiddenStickers = [...(current.hiddenStickers || [])];
    fresh.hiddenPets = [...(current.hiddenPets || [])];
    fresh.customBundles = csDeepClone(current.customBundles || []);
    fresh.customSelectors = { ...fresh.customSelectors, ...(current.customSelectors || {}) };
    const hiddenStickers = new Set(fresh.hiddenStickers);
    fresh.stickers.items = fresh.stickers.items.filter((it) => !hiddenStickers.has(it.id));
    if (fresh.hiddenPets.includes(fresh.pet.id)) fresh.pet.enabled = false;
    if (fresh.hiddenWallpapers.includes(fresh.wallpaperId)) fresh.wallpaperId = 'none';
  }
  return saveConfig(fresh, envWindow);
}

function csOpenMediaDb(win) {
  const idb = win?.indexedDB || (typeof indexedDB !== 'undefined' ? indexedDB : null);
  return new Promise((resolve, reject) => {
    if (!idb) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = idb.open(MEDIA_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MEDIA_STORE_NAME)) {
        db.createObjectStore(MEDIA_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function csWriteMediaDb(win, key, dataUrl) {
  try {
    const db = await csOpenMediaDb(win);
    await new Promise((resolve, reject) => {
      const tx = db.transaction(MEDIA_STORE_NAME, 'readwrite');
      tx.objectStore(MEDIA_STORE_NAME).put(dataUrl, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IndexedDB unavailable in headless tests or restricted mode
  }
}

async function csDeleteMediaDb(win, key) {
  try {
    const db = await csOpenMediaDb(win);
    await new Promise((resolve, reject) => {
      const tx = db.transaction(MEDIA_STORE_NAME, 'readwrite');
      tx.objectStore(MEDIA_STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore when IndexedDB unavailable
  }
}

export async function saveCustomMedia(slot, dataUrl, envWindow) {
  if (!MEDIA_SLOTS.includes(slot)) return;
  const win = csResolveWindow(envWindow);
  csEmitBridge({ type: 'media', key: slot, dataUrl }, win);
  await csWriteMediaDb(win, slot, dataUrl);
}

export async function deleteCustomMedia(slot, envWindow) {
  if (!MEDIA_SLOTS.includes(slot)) return;
  const win = csResolveWindow(envWindow);
  csEmitBridge({ type: 'media', key: slot, dataUrl: null }, win);
  await csDeleteMediaDb(win, slot);
}

export async function clearUnusedMedia(keepKeys = [], envWindow) {
  const win = csResolveWindow(envWindow);
  const keepSet = new Set(keepKeys);
  for (const slot of MEDIA_SLOTS) {
    if (!keepSet.has(slot)) {
      await deleteCustomMedia(slot, win);
    }
  }
}

export async function loadCustomMediaMap(envWindow) {
  const win = csResolveWindow(envWindow);
  const result = {};
  try {
    const db = await csOpenMediaDb(win);
    const tx = db.transaction(MEDIA_STORE_NAME, 'readonly');
    const store = tx.objectStore(MEDIA_STORE_NAME);
    await Promise.all(
      MEDIA_SLOTS.map(
        (key) =>
          new Promise((resolve) => {
            const req = store.get(key);
            req.onsuccess = () => {
              if (typeof req.result === 'string' && req.result.startsWith('data:')) {
                result[key] = req.result;
              }
              resolve();
            };
            req.onerror = () => resolve();
          })
      )
    );
    db.close();
  } catch {
    // Ignore when IndexedDB unavailable
  }

  const boot = win?.__AGY_THEME_BOOT__;
  if (boot && typeof boot === 'object' && !boot.__mediaConsumed && boot.media && typeof boot.media === 'object') {
    const hasHostConfig = Boolean(boot.config && typeof boot.config === 'object');
    const bootMedia = boot.media;
    const pendingPuts = [];
    const pendingDeletes = [];

    for (const key of MEDIA_SLOTS) {
      const fromDisk = typeof bootMedia[key] === 'string' ? bootMedia[key] : '';
      if (fromDisk && (!result[key] || (hasHostConfig && result[key] !== fromDisk))) {
        result[key] = fromDisk;
        pendingPuts.push([key, fromDisk]);
      } else if (result[key] && !fromDisk) {
        if (hasHostConfig) {
          delete result[key];
          pendingDeletes.push(key);
        } else {
          csEmitBridge({ type: 'media', key, dataUrl: result[key] }, win);
        }
      }
    }

    if (pendingPuts.length > 0 || pendingDeletes.length > 0) {
      try {
        const db = await csOpenMediaDb(win);
        await new Promise((resolve, reject) => {
          const tx = db.transaction(MEDIA_STORE_NAME, 'readwrite');
          const store = tx.objectStore(MEDIA_STORE_NAME);
          for (const [k, v] of pendingPuts) store.put(v, k);
          for (const k of pendingDeletes) store.delete(k);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        db.close();
      } catch {
        // Ignore when IndexedDB unavailable
      }
    }

    try {
      boot.__mediaConsumed = true;
      boot.media = null;
    } catch {
      // Ignore frozen boot objects
    }
  }
  return result;
}
