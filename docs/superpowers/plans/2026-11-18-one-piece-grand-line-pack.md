# One Piece — Grand Line Dual Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the bilingual (`VI`/`EN`) One Piece **Grand Line Dual Pack** (Dark *Thousand Sunny Sunset* + Light *Grand Line Bounty*) across wallpapers, SVG pets + quips, chat bubbles, composer frames, stickers, and 1-click theme bundles while preserving 60–120Hz `Zero Live Blur` invariants.

**Architecture:** Extend existing pure-ESM catalog modules (`src/assets/*`, `src/presets/*`) and companion quips (`src/fx/pet-stage.js`) with uniquely prefixed inline SVG artwork so `ThemeStudio`, `SurfaceEngine`, `PetStage`, `StickerLayer`, and `scripts/build.mjs` automatically expose, compile, and cache both Dark and Light One Piece themes without altering `config-store.js`, `daemon/`, or `ThemeStudio` layout.

**Tech Stack:** Node.js `>= 22.4` ESM (`node --test`), Vanilla JS/CSS/SVG, `scripts/build.mjs` zero-dependency IIFE bundler, `cli.mjs` live CDP verifier.

**Spec:** [`docs/superpowers/specs/2026-11-18-one-piece-grand-line-pack-design.md`](../specs/2026-11-18-one-piece-grand-line-pack-design.md)

## Global Constraints

- **Pure Vector SVG Only:** Inline `wpSvgUri` wallpapers and SVG mascots/stickers only; no raster files under `assets/wallpapers/` and keep `ATMOSPHERE_PRESETS.length === 7`.
- **120Hz Compositor Budget:** Keep outer `<svg>` classes `.agy-ct-svg-art` + (`agy-ct-anim-bob` for `'bubble'` or `agy-ct-anim-float` for `'pet'`); only gate child animations via `.agy-ct-anim-blink`, `.agy-ct-anim-wag`, `.agy-ct-anim-twinkle`, `.agy-ct-anim-spark`, `.agy-ct-anim-spin` (no un-gated SVG child `@keyframes`, no `filter: drop-shadow(...)`, no `backdrop-filter: blur(...)`).
- **Unique `<defs>` IDs & Slug IDs:** Every `<linearGradient>`/`<radialGradient>` ID across `src/assets/*` must be globally unique (prefixes `opSs*`, `opGl*`, `opCh*`, `opSn*`, `opSt*`); every asset/preset ID must match `/^[a-z0-9-]+$/i`.
- **Bundler Regex Safety:** In `src/assets/wallpapers-manifest.js`, declare `id` before `embeddedDataUri: wpSvgUri(\`...\`)` and put zero backticks inside SVG strings so `stripDeletedWallpapers` and `compactModuleCode` compile cleanly.
- **Pseudo-Element Conflict Avoidance:** `lenh-truy-na` uses `scrollCaps: true` with `cornerOrnament: ''` (never set a non-empty `cornerOrnament` alongside `scrollCaps: true` because both target `.agy-ct-bubble-styled::after`).
- **No Personal Paths:** Zero `C:\Users\...` or `/Users/...` strings anywhere in presets, specs, or tests.

## Review Focus

1. **Duplicate `<defs>` gradient IDs across concurrently mounted SVGs:** `ThemeStudio`, chat bubbles, `PetStage`, and `StickerLayer` inject inline SVGs into the same `document` simultaneously; duplicate `<linearGradient id="...">` tokens break fills across themes. *(Pinned in Task 1)*
2. **`stripDeletedWallpapers` failure on new `wpSvgUri(...)` wallpapers:** If property ordering or SVG backticks diverge from `scripts/build.mjs` regex expectations, hiding a One Piece wallpaper fails to strip its payload from `dist/antigravity-theme.js`. *(Pinned in Task 1)*
3. **`::after` pseudo-element collision on `lenh-truy-na` (`scrollCaps: true`):** Setting a non-empty `cornerOrnament` alongside `scrollCaps: true` causes `cornerOrnamentCss` in `src/core/surface-engine.js` to overwrite the right scroll cap `::after`. *(Pinned in Task 2)*
4. **Un-gated SVG animations causing `120Hz` layout thrashing or un-themed quip fallback:** Adding custom animation classes or omitting `FX_PET_QUIPS` entries causes either idle layout invalidation or generic `'Hello! ✨'` fallback quips on pet click. *(Pinned in Task 2)*
5. **Broken CSS braces, live blur, or unreadable Light Mode ink on `one-piece-grand-line-bounty`:** Applying the Light One Piece preset through `buildStylesheet` and `sanitizeImportedConfig` must preserve balanced CSS, Zero Live Blur, dark UI ink (`#0f172a`), and lossless config round-tripping. *(Pinned in Task 2)*

---

### Task 1: One Piece Vector Wallpapers, Mascots & Stickers

**Files:**
- Modify: `src/assets/wallpapers-manifest.js`
- Modify: `src/assets/mascots.js`
- Modify: `src/assets/stickers.js`
- Test: `test/presets.test.mjs`
- Test: `test/build.test.mjs`

**Interfaces:**
- Consumes: `wpSvgUri` (`src/assets/wallpapers-manifest.js`), `MASCOT_TEMPLATES` / `renderMascotSvg` (`src/assets/mascots.js`), `STICKER_TEMPLATES` / `renderStickerSvg` (`src/assets/stickers.js`)
- Produces:
  - `WALLPAPERS` entries: `'one-piece-sunny-sunset'` and `'one-piece-grand-line-map'` (`{ id, name, nameEn, embeddedDataUri, previewCss }`)
  - `MASCOT_TEMPLATES` entries: `'chopper-chibi'` (`accent: '#f472b6'`) and `'thousand-sunny'` (`accent: '#f5c451'`), each implementing `render(variant = 'pet') -> string`
  - `STICKER_TEMPLATES` entries: `'mu-rom'`, `'jolly-roger'`, and `'log-pose'` (`{ id, name, nameEn, svg }`)

- [ ] **Step 1: Write failing tests for One Piece assets, unique `<defs>` IDs, and `stripDeletedWallpapers` compatibility**

Add to `test/presets.test.mjs`:
```js
test('One Piece wallpapers, mascots, and stickers provide valid SVG markup, slug IDs, and globally unique defs IDs', () => {
  const wpIds = new Set(WALLPAPERS.map((w) => w.id));
  for (const id of ['one-piece-sunny-sunset', 'one-piece-grand-line-map']) {
    assert.ok(wpIds.has(id), `Missing wallpaper ${id}`);
    assert.match(id, /^[a-z0-9-]+$/);
    assert.match(resolveWallpaperUrl({ enabled: true, wallpaperId: id }), /^data:image\/svg\+xml/);
  }

  for (const petId of ['chopper-chibi', 'thousand-sunny']) {
    assert.ok(MASCOT_TEMPLATES[petId], `Missing mascot ${petId}`);
    const petSvg = renderMascotSvg(petId, 'pet');
    const bubbleSvg = renderMascotSvg(petId, 'bubble');
    assert.match(petSvg, /^<svg[^>]*class="agy-ct-svg-art agy-ct-anim-float"/);
    assert.match(bubbleSvg, /^<svg[^>]*class="agy-ct-svg-art agy-ct-anim-bob"/);
    assert.match(petSvg, /<\/svg>\s*$/);
  }

  for (const stId of ['mu-rom', 'jolly-roger', 'log-pose']) {
    assert.ok(STICKER_TEMPLATES[stId], `Missing sticker ${stId}`);
    const svg = renderStickerSvg(stId);
    assert.match(svg, /^<svg[^>]*class="agy-ct-svg-art"[^>]*viewBox="0 0 64 64"/);
    assert.match(svg, /<\/svg>\s*$/);
  }

  const seenDefIds = new Set();
  const svgSources = [
    ...WALLPAPERS.map((w) => decodeURIComponent(w.embeddedDataUri || '')),
    ...Object.keys(MASCOT_TEMPLATES).map((id) => renderMascotSvg(id, 'pet')),
    ...Object.values(STICKER_TEMPLATES).map((s) => s.svg)
  ];
  for (const svg of svgSources) {
    for (const match of svg.matchAll(/\bid="([^"]+)"/g)) {
      const defId = match[1];
      assert.ok(!seenDefIds.has(defId), `Duplicate SVG <defs> id="${defId}" found`);
      seenDefIds.add(defId);
    }
  }
});
```

Extend `test/build.test.mjs` (`stripDeletedWallpapers` check in real repo bundle test):
```js
const stripped = stripDeletedWallpapers(res.code, {
  hiddenWallpapers: ['thunder-samurai', 'obsidian-nebula', 'one-piece-sunny-sunset', 'one-piece-grand-line-map']
});
// ...
assert.equal(wps['one-piece-sunny-sunset'], '');
assert.equal(wps['one-piece-grand-line-map'], '');
```

- [ ] **Step 2: Run targeted tests to verify failure**

Run: `node --test test/presets.test.mjs test/build.test.mjs`
Expected: FAIL (`Missing wallpaper one-piece-sunny-sunset` and `Missing mascot chopper-chibi`).

- [ ] **Step 3: Implement One Piece wallpapers, mascots, and stickers**

1. In `src/assets/wallpapers-manifest.js`, append to `WALLPAPERS`:
   - `'one-piece-sunny-sunset'` (`name: 'Hoàng Hôn Thousand Sunny'`, `nameEn: 'Thousand Sunny Sunset'`): dusk ocean sky `#081224 -> #18294a -> #5b2333`, right-side golden sunset glow (`cx="1160" cy="360"`), layered sea waves, and stylized pirate ship sail silhouette; `<defs>` IDs prefixed `opSs*` (`opSsSky`, `opSsSun`, `opSsSea`).
   - `'one-piece-grand-line-map'` (`name: 'Hải Đồ Grand Line (Sáng)'`, `nameEn: 'Grand Line Chart (Light)'`): warm aged parchment `#f4eacd -> #e8d8b0`, subtle rhumb lines, compass rose at `cx="1160" cy="400"`, dashed sea route & subtle red `X` treasure mark preserving `#0f172a` dark ink contrast; `<defs>` IDs prefixed `opGl*` (`opGlBg`, `opGlGlow`).
2. In `src/assets/mascots.js`, add to `MASCOT_TEMPLATES`:
   - `'chopper-chibi'` (`name: 'Chopper Chibi'`, `nameEn: 'Chibi Chopper'`, `accent: '#f472b6'`): pink hat with white cross emblem, brown antlers, blue nose, `.agy-ct-anim-blink` eyes, `.agy-ct-anim-twinkle` sakura spark; `<defs>` IDs prefixed `opCh*`.
   - `'thousand-sunny'` (`name: 'Tàu Thousand Sunny'`, `nameEn: 'Thousand Sunny'`, `accent: '#f5c451'`): lion-prow figurehead with golden mane, red/white striped hull & sail, `.agy-ct-anim-wag` sail/flag sway, `.agy-ct-anim-twinkle` ocean glint; `<defs>` IDs prefixed `opSn*`.
3. In `src/assets/stickers.js`, add to `STICKER_TEMPLATES`:
   - `'mu-rom'` (`name: 'Mũ Rơm Hải Tặc'`, `nameEn: 'Straw Hat'`): `viewBox="0 0 64 64"` straw hat with red ribbon band.
   - `'jolly-roger'` (`name: 'Cờ Đầu Lâu Mũ Rơm'`, `nameEn: 'Straw Hat Jolly Roger'`): `viewBox="0 0 64 64"` dark pirate crest with crossbones and straw-hat skull silhouette.
   - `'log-pose'` (`name: 'La Bàn Log Pose'`, `nameEn: 'Log Pose Compass'`): `viewBox="0 0 64 64"` brass bezel and turquoise glass sphere with glowing magnetic needle (`opSt*` IDs if gradients used).

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/presets.test.mjs test/build.test.mjs`
Expected: PASS (all tests in `presets.test.mjs` and `build.test.mjs` green).

- [ ] **Step 5: Commit Task 1**

```bash
git add src/assets/wallpapers-manifest.js src/assets/mascots.js src/assets/stickers.js test/presets.test.mjs test/build.test.mjs
git commit -m "feat(assets): add One Piece SVG wallpapers, Chopper & Sunny mascots, and stickers"
```

---

### Task 2: One Piece Chat Bubbles, Composer Inputs, Theme Bundles & Pet Quips

**Files:**
- Modify: `src/presets/bubbles.js`
- Modify: `src/presets/inputs.js`
- Modify: `src/presets/themes.js`
- Modify: `src/fx/pet-stage.js`
- Test: `test/presets.test.mjs`
- Test: `test/surface-engine.test.mjs`
- Test: `test/fx-companions.test.mjs`

**Interfaces:**
- Consumes: Task 1 asset IDs (`'one-piece-sunny-sunset'`, `'one-piece-grand-line-map'`, `'chopper-chibi'`, `'thousand-sunny'`, `'mu-rom'`, `'jolly-roger'`, `'log-pose'`), `ATMOSPHERE_PRESETS` (`'stardust'`, `'sakura'`), `CORNER_ORNAMENTS` (`'gold'`)
- Produces:
  - `BUBBLE_PRESETS` entries: `'mu-rom-hai-tac'` (`scrollCaps: false`, `cornerOrnament: 'gold'`, `mascotId: 'thousand-sunny'`) and `'lenh-truy-na'` (`scrollCaps: true`, `cornerOrnament: ''`, `mascotId: 'chopper-chibi'`, `text: '#2b1d0e'`)
  - `INPUT_PRESETS` entries: `'dai-duong-sunny'` and `'hai-do-co'`
  - `THEME_BUNDLES` entries: `'one-piece-sunny-sunset'` (`isLight: false`) and `'one-piece-grand-line-bounty'` (`isLight: true`)
  - `FX_PET_QUIPS` entries in `src/fx/pet-stage.js` for `'chopper-chibi'` and `'thousand-sunny'` (3 `'vi'` + 3 `'en'` quips each)

- [ ] **Step 1: Write failing tests for One Piece presets, stylesheet invariants, and pet click quips**

Add to `test/presets.test.mjs`:
```js
test('One Piece dual theme bundles, bubbles, and composer inputs are registered with valid cross-references', () => {
  const byBundleId = Object.fromEntries(THEME_BUNDLES.map((b) => [b.id, b]));
  const sunset = byBundleId['one-piece-sunny-sunset'];
  const bounty = byBundleId['one-piece-grand-line-bounty'];

  assert.ok(sunset, 'Missing one-piece-sunny-sunset bundle');
  assert.equal(sunset.patch.isLight, false);
  assert.equal(sunset.patch.wallpaperId, 'one-piece-sunny-sunset');
  assert.equal(sunset.patch.bubbleId, 'mu-rom-hai-tac');
  assert.equal(sunset.patch.inputId, 'dai-duong-sunny');
  assert.equal(sunset.patch.pet.id, 'thousand-sunny');

  assert.ok(bounty, 'Missing one-piece-grand-line-bounty bundle');
  assert.equal(bounty.patch.isLight, true);
  assert.equal(bounty.patch.wallpaperId, 'one-piece-grand-line-map');
  assert.equal(bounty.patch.bubbleId, 'lenh-truy-na');
  assert.equal(bounty.patch.inputId, 'hai-do-co');
  assert.equal(bounty.patch.pet.id, 'chopper-chibi');

  const lenhTruyNa = BUBBLE_PRESETS.find((b) => b.id === 'lenh-truy-na');
  assert.equal(lenhTruyNa.scrollCaps, true);
  assert.equal(lenhTruyNa.cornerOrnament, '');
});
```

Add to `test/surface-engine.test.mjs`:
```js
test('One Piece Dark & Light bundles emit balanced Zero-Live-Blur CSS without scrollCaps::after conflicts', () => {
  const sunsetBundle = THEME_BUNDLES.find((b) => b.id === 'one-piece-sunny-sunset');
  const bountyBundle = THEME_BUNDLES.find((b) => b.id === 'one-piece-grand-line-bounty');

  const darkCfg = sanitizeImportedConfig({ ...DEFAULT_CONFIG, ...sunsetBundle.patch, activeBundleId: sunsetBundle.id });
  const darkCss = buildStylesheet(darkCfg, {});
  assertBalancedCssBraces(darkCss);
  assert.ok(!/backdrop-filter:\s*blur\(/i.test(darkCss));
  assert.match(darkCss, /\.agy-ct-bubble-styled::after\s*\{[^}]*background-image:\s*url\("data:image\/svg\+xml/);

  const lightCfg = sanitizeImportedConfig({ ...DEFAULT_CONFIG, ...bountyBundle.patch, activeBundleId: bountyBundle.id });
  const lightCss = buildStylesheet(lightCfg, {});
  assertBalancedCssBraces(lightCss);
  assert.ok(!/backdrop-filter:\s*blur\(/i.test(lightCss));
  assert.ok(lightCss.includes('#0f172a'));
  assert.ok(lightCss.includes('width: 8px'), 'scrollCaps must emit 8px scroll cap pseudo-elements');
  assert.ok(
    !/\.agy-ct-bubble-styled::after\s*\{[^}]*background-image:/.test(lightCss),
    'lenh-truy-na must not emit cornerOrnament ::after override over scrollCaps'
  );
});
```
*(Import `THEME_BUNDLES` from `../src/presets/themes.js` and `sanitizeImportedConfig` from `../src/core/config-store.js` in `test/surface-engine.test.mjs`, ensuring the check asserts specifically on `.agy-ct-bubble-styled::after` not having `background-image:`.)*

Add to `test/fx-companions.test.mjs`:
```js
test('PetStage triggerClickReaction displays localized One Piece quips for chopper-chibi and thousand-sunny', () => {
  // Stub document/window like existing PetStage test and invoke pet.triggerClickReaction()
  // Assert speechEl.textContent is NOT generic fallback ('Xin chào! ✨' / 'Hello! ✨') for both pet IDs in 'vi' and 'en'.
});
```

- [ ] **Step 2: Run targeted tests to verify failure**

Run: `node --test test/presets.test.mjs test/surface-engine.test.mjs test/fx-companions.test.mjs`
Expected: FAIL (`Missing one-piece-sunny-sunset bundle`, missing quips / presets).

- [ ] **Step 3: Implement bubbles, inputs, theme bundles, and pet quips**

1. `src/presets/bubbles.js`: append `'mu-rom-hai-tac'` (`#fef3c7` text, `mascotId: 'thousand-sunny'`, `scrollCaps: false`, `cornerOrnament: 'gold'`) and `'lenh-truy-na'` (`#2b1d0e` text, `mascotId: 'chopper-chibi'`, `scrollCaps: true`, `cornerOrnament: ''`).
2. `src/presets/inputs.js`: append `'dai-duong-sunny'` (`focusBorder: '#d7474b'`, `radius: '16px'`) and `'hai-do-co'` (`focusBorder: '#d7474b'`, `radius: '14px'`).
3. `src/presets/themes.js`: append `'one-piece-sunny-sunset'` and `'one-piece-grand-line-bounty'` using exact color, opacity, atmosphere, pet, and sticker values from Section 4.5 of the spec.
4. `src/fx/pet-stage.js`: add `'chopper-chibi'` and `'thousand-sunny'` entries (3 `'vi'` + 3 `'en'` quips each) to `FX_PET_QUIPS`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/presets.test.mjs test/surface-engine.test.mjs test/fx-companions.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/presets/bubbles.js src/presets/inputs.js src/presets/themes.js src/fx/pet-stage.js test/presets.test.mjs test/surface-engine.test.mjs test/fx-companions.test.mjs
git commit -m "feat(presets): add One Piece Grand Line Dual Pack bundles, bubbles, inputs, and pet quips"
```

---

### Task 3: Full Verification, Live CDP Smoke Test & Preview Check

**Files:**
- Verify only (no source edits expected unless verification exposes a bug)

- [ ] **Step 1: Run complete automated test suite & bundle compiler**

Run from `D:\antigravity-custom-theme`:
```powershell
node --test
node cli.mjs build
```
Expected:
- `node --test`: all tests pass (`0` failures).
- `node cli.mjs build`: `Built D:\antigravity-custom-theme\dist\antigravity-theme.js (...) [syntax OK]`.

- [ ] **Step 2: Verify live CDP injection & bundle readiness**

Run from `D:\antigravity-custom-theme`:
```powershell
node cli.mjs status
node cli.mjs verify
```
Expected:
- If daemon `"running": true`, hot-reload updates Antigravity automatically; otherwise run `node cli.mjs inject --one-shot` before `verify`.
- `node cli.mjs verify` reports `PASS` (`themeActive: true`, `hasLiveBlurOnScrollers: false`, `shellTransparentBg: true`).
- Confirm in headless/preview or live DOM that `one-piece-sunny-sunset` and `one-piece-grand-line-bounty` appear in Theme Studio Presets tab (`THEME_BUNDLES.length === 10`).

---

## Self-Review Checklist
- [x] **Spec coverage:** All 2 bundles, 2 wallpapers, 2 mascots + quips, 2 bubbles, 2 inputs, 3 stickers, and test/CDP checks mapped to Tasks 1–3.
- [x] **Step scan:** Every step specifies exact file paths, signatures/IDs, and verification outputs without writing bloated full SVG bodies into the plan.
- [x] **Type/ID consistency:** Asset IDs (`one-piece-sunny-sunset`, `one-piece-grand-line-map`, `chopper-chibi`, `thousand-sunny`, `mu-rom`, `jolly-roger`, `log-pose`, `mu-rom-hai-tac`, `lenh-truy-na`, `dai-duong-sunny`, `hai-do-co`, `one-piece-grand-line-bounty`) match identically across Spec, Task 1, and Task 2.
- [x] **Review Focus:** All 5 failure modes (`<defs>` ID collision, `stripDeletedWallpapers` regex, `scrollCaps`/`cornerOrnament` `::after` override, `FX_PET_QUIPS` fallback + `120Hz` animation gating, Light Mode ink/CSS balance) have explicit assertions in Tasks 1–2.
