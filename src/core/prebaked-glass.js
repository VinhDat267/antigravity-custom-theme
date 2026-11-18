/**
 * Zero Live Blur pre-baked L-shaped glass texture baker.
 * Renders blurred + tinted wallpaper slices onto an offscreen canvas once per
 * wallpaper/blur/dimming change instead of using live CSS backdrop-filter.
 */

import { resolveWallpaperUrl } from '../assets/wallpapers-manifest.js';

const PB_GLASS_CACHE = new Map();
const PB_STORAGE_KEY = 'agy_ct_glass_cache_v1';

export function clearPrebakedGlassMemoryCache() {
  PB_GLASS_CACHE.clear();
}

function pbReadStoredGlass(expectedKey) {
  try {
    const raw = globalThis.localStorage?.getItem?.(PB_STORAGE_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.key === expectedKey &&
      typeof parsed.dataUrl === 'string' &&
      /^data:image\/(webp|png);base64,/i.test(parsed.dataUrl)
    ) {
      return parsed.dataUrl;
    }
  } catch {
    // Ignore storage read errors
  }
  return '';
}

function pbWriteStoredGlass(key, dataUrl) {
  if (typeof dataUrl !== 'string' || dataUrl.length >= 380_000) return;
  try {
    globalThis.localStorage?.setItem?.(PB_STORAGE_KEY, JSON.stringify({ key, dataUrl }));
  } catch {
    // Ignore storage quota or private mode errors
  }
}

export function syncPrebakedGlass(shellEl, config, customMedia = {}) {
  const wpUrl = resolveWallpaperUrl(config, customMedia);
  if (!config?.enabled || !wpUrl) {
    shellEl?.style?.removeProperty('--agy-l-glass-bg');
    return Promise.resolve('');
  }

  const overlayRgb = config.overlayRgb || (config.isLight ? '242, 236, 188' : '11, 16, 27');
  const dimAlpha = Math.max(0, Math.min(0.92, (Number(config.dimming) || 0) / 100));
  const blurPx = Math.max(0, Math.min(16, Number(config.glassBlur) || 0));
  const tintAlpha = Math.max(0.08, Math.min(0.94, (Number(config.surfaces?.headerOpacity) || 44) / 100));

  const key = `${wpUrl.slice(0, 64)}|${wpUrl.length}|${overlayRgb}|${dimAlpha.toFixed(2)}|${tintAlpha.toFixed(2)}|${blurPx}|${config.isLight ? 1 : 0}`;
  if (PB_GLASS_CACHE.has(key)) {
    const baked = PB_GLASS_CACHE.get(key);
    shellEl?.style?.setProperty('--agy-l-glass-bg', `url("${baked}")`);
    return Promise.resolve(baked);
  }

  const stored = pbReadStoredGlass(key);
  if (stored) {
    if (PB_GLASS_CACHE.size > 16) PB_GLASS_CACHE.clear();
    PB_GLASS_CACHE.set(key, stored);
    shellEl?.style?.setProperty('--agy-l-glass-bg', `url("${stored}")`);
    return Promise.resolve(stored);
  }

  if (typeof Image === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve('');
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = 640;
        const natW = img.naturalWidth || 1600;
        const natH = img.naturalHeight || 900;
        const h = Math.max(180, Math.round(natH * (w / natW)));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }
        const scaledBlur = Math.max(0, Math.min(14, Math.round(blurPx * 0.75)));
        ctx.filter = scaledBlur > 0 ? `blur(${scaledBlur}px)` : 'none';
        ctx.drawImage(img, -12, -12, w + 24, h + 24);
        ctx.filter = 'none';
        ctx.fillStyle = `rgba(${overlayRgb}, ${(dimAlpha * 0.72).toFixed(3)})`;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = `rgba(${overlayRgb}, ${(tintAlpha * 0.55).toFixed(3)})`;
        ctx.fillRect(0, 0, w, h);

        let baked = canvas.toDataURL('image/webp', 0.85);
        if (!baked || !baked.startsWith('data:image/webp')) {
          baked = canvas.toDataURL('image/png');
        }
        if (PB_GLASS_CACHE.size > 16) PB_GLASS_CACHE.clear();
        PB_GLASS_CACHE.set(key, baked);
        pbWriteStoredGlass(key, baked);
        const target = shellEl || document.querySelector('.agy-shell, [data-agy-mock-shell]');
        target?.style?.setProperty('--agy-l-glass-bg', `url("${baked}")`);
        resolve(baked);
      } catch {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = wpUrl;
  });
}
