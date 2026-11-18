import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MASCOT_TEMPLATES,
  renderMascotSvg,
  renderAgentStarSvg
} from '../src/assets/mascots.js';
import {
  STICKER_TEMPLATES,
  CORNER_ORNAMENTS,
  renderStickerSvg
} from '../src/assets/stickers.js';
import {
  WALLPAPERS,
  resolveWallpaperUrl
} from '../src/assets/wallpapers-manifest.js';
import { BUBBLE_PRESETS } from '../src/presets/bubbles.js';
import { INPUT_PRESETS } from '../src/presets/inputs.js';
import {
  ACCENT_COLORS,
  ATMOSPHERE_PRESETS,
  THEME_BUNDLES
} from '../src/presets/themes.js';

test('mascots catalog provides 9+ SVG pets and customizable Agent star SVG', () => {
  const keys = Object.keys(MASCOT_TEMPLATES);
  assert.ok(keys.length >= 9, `Expected >= 9 mascots, got ${keys.length}`);
  const svg = renderMascotSvg('loi-kiem');
  assert.match(svg, /^<svg[\s>]/);
  assert.match(svg, /<\/svg>\s*$/);

  const bubbleSvg = renderMascotSvg('ho-ly-chibi', 'bubble');
  assert.match(bubbleSvg, /^<svg[\s>]/);

  const star = renderAgentStarSvg('#60a5fa', '#f5c451');
  assert.match(star, /^data:image\/svg\+xml/);
  const decodedStar = decodeURIComponent(star);
  assert.match(decodedStar, /#60a5fa/i);
  assert.match(decodedStar, /#f5c451/i);
});

test('stickers and corner ornaments catalogs meet minimum template counts', () => {
  const stickerKeys = Object.keys(STICKER_TEMPLATES);
  assert.ok(stickerKeys.length >= 14, `Expected >= 14 stickers, got ${stickerKeys.length}`);
  const svg = renderStickerSvg('trang-sao');
  assert.match(svg, /^<svg[\s>]/);
  assert.match(svg, /<\/svg>\s*$/);
  assert.ok(Object.keys(CORNER_ORNAMENTS).length >= 4);
  for (const uri of Object.values(CORNER_ORNAMENTS)) {
    assert.match(uri, /^data:image\/svg\+xml/);
  }
});

test('wallpapers manifest resolves custom, preset, light-mode, and disabled URLs safely', () => {
  assert.ok(WALLPAPERS.length >= 9, 'Expected none + 8 built-in wallpapers');
  const wpIds = new Set(WALLPAPERS.map((w) => w.id));
  assert.ok(wpIds.has('none'));
  assert.ok(wpIds.has('kanagawa-wave'));
  assert.ok(wpIds.has('kanagawa-lotus'));

  assert.equal(resolveWallpaperUrl({ enabled: false, wallpaperId: 'thunder-samurai' }), '');
  assert.equal(resolveWallpaperUrl({ enabled: true, wallpaperId: 'none' }), '');
  assert.equal(
    resolveWallpaperUrl(
      { enabled: true, wallpaperId: 'custom' },
      { wallpaper: 'data:image/webp;base64,AAA' }
    ),
    'data:image/webp;base64,AAA'
  );
  assert.equal(
    resolveWallpaperUrl(
      { enabled: true, wallpaperId: 'custom', isLight: true },
      { wallpaper: 'data:image/webp;base64,DARK', wallpaperLight: 'data:image/webp;base64,LIGHT' }
    ),
    'data:image/webp;base64,LIGHT'
  );
  const builtInUrl = resolveWallpaperUrl({ enabled: true, wallpaperId: 'thunder-samurai' });
  assert.match(builtInUrl, /^data:image\//);
});

test('bubble, input, accent, atmosphere, and theme bundle presets cross-reference valid IDs with no OS paths', () => {
  assert.ok(BUBBLE_PRESETS.length >= 13, `Expected >= 13 bubbles, got ${BUBBLE_PRESETS.length}`);
  assert.ok(INPUT_PRESETS.length >= 9, `Expected >= 9 inputs, got ${INPUT_PRESETS.length}`);
  assert.ok(ACCENT_COLORS.length >= 8, `Expected >= 8 accents, got ${ACCENT_COLORS.length}`);
  assert.equal(ATMOSPHERE_PRESETS.length, 7);
  assert.ok(THEME_BUNDLES.length >= 8, `Expected >= 8 bundles, got ${THEME_BUNDLES.length}`);
  assert.ok(THEME_BUNDLES.some((b) => b.patch.isLight === true), 'Expected at least one light bundle');
  assert.ok(
    THEME_BUNDLES.some((b) => b.patch.wallpaperId === 'none'),
    'Expected a pure-gradient minimal bundle with wallpaperId=none'
  );

  const wpIds = new Set(WALLPAPERS.map((w) => w.id));
  const bubbleIds = new Set(BUBBLE_PRESETS.map((b) => b.id));
  const inputIds = new Set(INPUT_PRESETS.map((i) => i.id));
  const atmoIds = new Set(ATMOSPHERE_PRESETS.map((a) => a.id));
  const petIds = new Set(['none', ...Object.keys(MASCOT_TEMPLATES)]);
  const stickerIds = new Set(Object.keys(STICKER_TEMPLATES));

  for (const bundle of THEME_BUNDLES) {
    const serialized = JSON.stringify(bundle);
    assert.ok(!/[A-Za-z]:\\/.test(serialized), `OS Windows path leaked in bundle ${bundle.id}`);
    assert.ok(!serialized.includes('/Users/'), `OS macOS path leaked in bundle ${bundle.id}`);
    assert.ok(wpIds.has(bundle.patch.wallpaperId), `Unknown wallpaperId in ${bundle.id}`);
    assert.ok(bubbleIds.has(bundle.patch.bubbleId), `Unknown bubbleId in ${bundle.id}`);
    assert.ok(inputIds.has(bundle.patch.inputId), `Unknown inputId in ${bundle.id}`);
    assert.ok(atmoIds.has(bundle.patch.atmosphereId), `Unknown atmosphereId in ${bundle.id}`);
    assert.ok(petIds.has(bundle.patch.pet.id), `Unknown pet.id in ${bundle.id}`);
    for (const item of bundle.patch.stickers.items) {
      assert.ok(stickerIds.has(item.id), `Unknown sticker ${item.id} in ${bundle.id}`);
    }
  }
});
