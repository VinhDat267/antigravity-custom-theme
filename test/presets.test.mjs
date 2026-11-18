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

test('One Piece wallpapers, mascots, and stickers provide valid SVG markup, slug IDs, and globally unique defs IDs', () => {
  const wpIds = new Set(WALLPAPERS.map((w) => w.id));
  for (const id of ['one-piece-sunny-sunset', 'one-piece-grand-line-map', 'one-piece-nika-moon']) {
    assert.ok(wpIds.has(id), `Missing wallpaper ${id}`);
    assert.match(id, /^[a-z0-9-]+$/);
    const uri = resolveWallpaperUrl({ enabled: true, wallpaperId: id });
    assert.match(uri, /^data:image\/svg\+xml/);
    assert.ok(!/(<animate|<style)/i.test(decodeURIComponent(uri)), `Wallpaper ${id} must not embed <animate> or <style> tags`);
  }

  for (const petId of ['chopper-chibi', 'thousand-sunny', 'luffy-chibi', 'luffy-gear5']) {
    assert.ok(MASCOT_TEMPLATES[petId], `Missing mascot ${petId}`);
    const petSvg = renderMascotSvg(petId, 'pet');
    const bubbleSvg = renderMascotSvg(petId, 'bubble');
    assert.match(petSvg, /^<svg[^>]*class="agy-ct-svg-art agy-ct-anim-float"/);
    assert.match(bubbleSvg, /^<svg[^>]*class="agy-ct-svg-art agy-ct-anim-bob"/);
    assert.match(petSvg, /<\/svg>\s*$/);
    assert.match(bubbleSvg, /<\/svg>\s*$/);
    assert.ok(!/url\(#|\bid="/.test(petSvg), `Inline mascot ${petId} (pet) must avoid static <defs> IDs so hidden Settings FX previews never break visible SVG fills`);
    assert.ok(!/url\(#|\bid="/.test(bubbleSvg), `Inline mascot ${petId} (bubble) must avoid static <defs> IDs so hidden Settings FX previews never break visible SVG fills`);
    assert.ok(!/(<animate|<style)/i.test(petSvg), `Inline mascot ${petId} must avoid <animate> and <style> tags`);
  }

  for (const stId of ['mu-rom', 'jolly-roger', 'log-pose']) {
    assert.ok(STICKER_TEMPLATES[stId], `Missing sticker ${stId}`);
    const svg = renderStickerSvg(stId);
    assert.match(svg, /^<svg[^>]*class="agy-ct-svg-art"[^>]*viewBox="0 0 64 64"/);
    assert.match(svg, /<\/svg>\s*$/);
    assert.ok(!/url\(#|\bid="/.test(svg), `Inline sticker ${stId} must avoid static <defs> IDs so hidden Settings FX previews never break visible SVG fills`);
    assert.ok(!/(<animate|<style)/i.test(svg), `Inline sticker ${stId} must avoid <animate> and <style> tags`);
  }

  const seenDefIds = new Set();
  const svgSources = [
    ...WALLPAPERS.map((w) => decodeURIComponent(w.embeddedDataUri || '')),
    ...Object.keys(MASCOT_TEMPLATES).map((id) => renderMascotSvg(id, 'pet')),
    ...Object.values(STICKER_TEMPLATES).map((s) => s.svg),
    ...Object.values(CORNER_ORNAMENTS).map((u) => decodeURIComponent(u)),
    decodeURIComponent(renderAgentStarSvg())
  ];
  for (const svg of svgSources) {
    for (const match of svg.matchAll(/\bid="([^"]+)"/g)) {
      const defId = match[1];
      assert.ok(!seenDefIds.has(defId), `Duplicate SVG <defs> id="${defId}" found`);
      seenDefIds.add(defId);
    }
  }
});

test('One Piece dual theme bundles, Gear 5 Nika bundle, bubbles, and composer inputs are registered with valid cross-references', () => {
  const byBundleId = Object.fromEntries(THEME_BUNDLES.map((b) => [b.id, b]));
  const sunset = byBundleId['one-piece-sunny-sunset'];
  const bounty = byBundleId['one-piece-grand-line-bounty'];
  const nika = byBundleId['one-piece-gear5-nika'];

  assert.ok(sunset, 'Missing one-piece-sunny-sunset bundle');
  assert.equal(sunset.patch.isLight, false);
  assert.equal(sunset.patch.wallpaperId, 'one-piece-sunny-sunset');
  assert.equal(sunset.patch.bubbleId, 'mu-rom-hai-tac');
  assert.equal(sunset.patch.inputId, 'dai-duong-sunny');
  assert.equal(sunset.patch.pet.id, 'luffy-chibi');

  const strawHatBubble = BUBBLE_PRESETS.find((b) => b.id === 'mu-rom-hai-tac');
  assert.ok(strawHatBubble, 'Missing mu-rom-hai-tac bubble preset');
  assert.equal(strawHatBubble.mascotId, 'luffy-chibi');

  assert.ok(bounty, 'Missing one-piece-grand-line-bounty bundle');
  assert.equal(bounty.patch.isLight, true);
  assert.equal(bounty.patch.wallpaperId, 'one-piece-grand-line-map');
  assert.equal(bounty.patch.bubbleId, 'lenh-truy-na');
  assert.equal(bounty.patch.inputId, 'hai-do-co');
  assert.equal(bounty.patch.pet.id, 'chopper-chibi');

  const lenhTruyNa = BUBBLE_PRESETS.find((b) => b.id === 'lenh-truy-na');
  assert.ok(lenhTruyNa, 'Missing lenh-truy-na bubble preset');
  assert.equal(lenhTruyNa.scrollCaps, true);
  assert.equal(lenhTruyNa.cornerOrnament, '');

  assert.ok(nika, 'Missing one-piece-gear5-nika bundle');
  assert.equal(nika.patch.isLight, false);
  assert.equal(nika.patch.wallpaperId, 'one-piece-nika-moon');
  assert.equal(nika.patch.bubbleId, 'gear5-nika');
  assert.equal(nika.patch.inputId, 'nika-liberation');
  assert.equal(nika.patch.atmosphereId, 'thunder-rain');
  assert.equal(nika.patch.pet.id, 'luffy-gear5');

  const gear5Bubble = BUBBLE_PRESETS.find((b) => b.id === 'gear5-nika');
  assert.ok(gear5Bubble, 'Missing gear5-nika bubble preset');
  assert.equal(gear5Bubble.mascotId, 'luffy-gear5');
  assert.equal(gear5Bubble.scrollCaps, false);
  assert.equal(gear5Bubble.cornerOrnament, 'gold');

  const nikaInput = INPUT_PRESETS.find((i) => i.id === 'nika-liberation');
  assert.ok(nikaInput, 'Missing nika-liberation input preset');
});
