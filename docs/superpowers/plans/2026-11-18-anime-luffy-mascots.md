# Anime Luffy Full-Body Mascots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full-body dynamic 3/4 cel-shaded SVG anime models for Luffy (`luffy-anime`) and Gear 5 Nika (`luffy-gear5-anime`), portrait-cropped Studio thumbnails, `44–240px` pet sizing, edge-safe speech flipping, click-passthrough transparent SVG hitboxes, and wire them into the One Piece Dark/Nika bundles.

**Architecture:** `src/assets/mascots.js` gains optional `aspect` (`0.75`) metadata plus `variant` framing (`'pet'` full-body `0 0 132 176` vs `'thumb'`/`'bubble'` upper portrait `16 2 100 84`) with zero static `<defs>` IDs. `src/fx/pet-stage.js` and `src/core/surface-engine.js` enforce exact `3:4` stage sizing, `clampOutsideHole` box clamping, `.is-below` speech flipping near top edges, and `visiblePainted` SVG hit-testing, while `config-store.js` and `theme-studio.js` raise the `pet.size` ceiling cleanly to `240px`.

**Tech Stack:** Node.js >= 22.4 ESM, Vanilla DOM/Canvas/SVG, CSS3 GPU-composited transforms, `node --test`, zero external dependencies.

**Spec:** [`docs/superpowers/specs/2026-11-18-anime-luffy-mascots-design.md`](../specs/2026-11-18-anime-luffy-mascots-design.md)

## Global Constraints
- Zero-Patch Delivery & Single-IIFE (`scripts/build.mjs` `MODULE_ORDER`, unique top-level symbols across `src/`).
- Zero `<defs>`/`url(#...)` static IDs and zero `<animate>`/`<style>` tags inside inline SVG mascots.
- 120Hz Compositor Budget: GPU `transform`/`opacity` on `.agy-ct-pet-body`, child `.agy-ct-anim-*` gated behind `:hover`/`.is-reacting`, zero CSS `filter: drop-shadow(...)`, `Zero Live Blur`.
- All mascot/bundle IDs match `/^[a-z0-9-]+$/`, zero personal OS paths anywhere, keep existing `luffy-chibi` & `luffy-gear5` intact on bubble presets (`mu-rom-hai-tac`, `gear5-nika`).

## Review Focus
- Hovering/dragging transparent pixels inside `#agy-ct-pet-stage` on `132×176` stage box must pass through to chat/buttons while clicking/dragging painted paths still works and completes via pointer capture.
- Clicking pet when `pos.y < 64` (including `0`) must apply `.is-below` to flip `.agy-ct-pet-speech` downward cleanly without top-edge clipping.
- `clampOutsideHole` called with legacy numeric `size` (existing callers/tests) and `{ width, height }` object (3:4 portrait pets) must both keep pets outside `[data-browser-hole]`.
- `sanitizeImportedConfig` must accept `pet.size: 240`, clamp `>240` to `240`, clamp `<44` to `44`, and `renderMascotSvg(id, 'thumb')` in `ThemeStudio` (`46×46`) must crop upper portrait instead of tiny full-body figures.
- All 6 One Piece mascots (`chopper-chibi`, `thousand-sunny`, `luffy-chibi`, `luffy-gear5`, `luffy-anime`, `luffy-gear5-anime`) must keep working VI/EN click quips and pass duplicate-ID / SVG validation tests.

---

### Task 1: Add Dynamic 3/4 `luffy-anime` & `luffy-gear5-anime` Mascot Templates + Studio Thumbnail Framing

**Files:**
- Modify: `src/assets/mascots.js`
- Modify: `src/ui/theme-studio.js:800-862`
- Modify: `src/core/config-store.js:213`
- Test: `test/presets.test.mjs`
- Test: `test/config-store.test.mjs`
- Test: `test/theme-studio.test.mjs`

**Interfaces:**
- Produces: `MASCOT_TEMPLATES['luffy-anime']` and `MASCOT_TEMPLATES['luffy-gear5-anime']` with `{ id, name, nameEn, accent, aspect: 0.75, render(variant) }` where `'pet'` uses `viewBox="0 0 132 176"` and `'thumb'`/`'bubble'` uses `viewBox="16 2 100 84"`.
- Produces: `sanitizeImportedConfig` clamping `pet.size` to `[44, 240]`.

- [ ] **Step 1: Write failing tests in `test/presets.test.mjs`, `test/config-store.test.mjs`, and `test/theme-studio.test.mjs`**
  - In `test/presets.test.mjs`: assert `'luffy-anime'` and `'luffy-gear5-anime'` exist in `MASCOT_TEMPLATES`, have `aspect === 0.75`, `'pet'` uses `viewBox="0 0 132 176"`, `'thumb'`/`'bubble'` uses `viewBox="16 2 100 84"`, zero `url(#` / `id="` / `<animate` / `<style`, and `THEME_BUNDLES` wire `luffy-anime` & `luffy-gear5-anime` cleanly (Task 3 wires bundles; keep bundle test expectation in Task 3 or split cleanly!).
  - In `test/config-store.test.mjs`: assert `sanitizeImportedConfig({ pet: { size: 220 } }).pet.size === 220` and `size: 999` clamps to `240` (and keep `size: 10` -> `44`).
  - In `test/theme-studio.test.mjs`: open `studio.open('fx')`, assert pet size range input `max` is `'240'` and `renderMascotSvg('luffy-anime', 'thumb')` renders upper-portrait `viewBox` inside FX pet cards.

- [ ] **Step 2: Run tests to verify `RED` failures**
  Run: `node --test test/presets.test.mjs test/config-store.test.mjs test/theme-studio.test.mjs`
  Expected: FAIL on missing `'luffy-anime'`, `size` clamping to `160` instead of `220`/`240`, and FX slider `max` `'160'`.

- [ ] **Step 3: Implement `luffy-anime`, `luffy-gear5-anime`, `240px` bounds, and `'thumb'` preview in `src/assets/mascots.js`, `src/core/config-store.js`, `src/ui/theme-studio.js`**
  - Draw `luffy-anime` in dynamic 3/4 striding pose: billowing asymmetrical black captain coat with gold trim, red unbuttoned cardigan with gold buttons over sculpted chest + X burn scar, yellow waist sash, blue rolled shorts with white cuffs, bare calves & straw sandals, 3/4 anime jaw/ear/eyes (`agy-ct-anim-blink`), cheek scar, confident grin, spiky hair, and tilted straw hat casting brow shadow.
  - Draw `luffy-gear5-anime` in bouncy Nika airborne pose: swirling multi-layered white flame hair with lavender cel folds, continuous S-curved hagoromo ribbon scarf wrapping behind neck/shoulders (no side circle puffs), crimson Nika anime eyes (`agy-ct-anim-blink`) + curled brows + wide grin, white open vest + X scar, purple sash, white shorts + sandals, gold & violet Haki sparks (`agy-ct-anim-spark`).
  - Use a shared helper `renderFullBodyVariantSvg(cls, variant, bodyMarkup)` returning `viewBox="${variant === 'pet' ? '0 0 132 176' : '16 2 100 84'}"`.
  - Update `csClamp(src.pet?.size, 44, 240, d.pet.size)` in `src/core/config-store.js:213`, and update `ThemeStudio.renderFxTab` icon cards to `renderMascotSvg(m.id, 'thumb')` and pet size slider max to `240`.

- [ ] **Step 4: Run tests to verify `GREEN`**
  Run: `node --test test/presets.test.mjs test/config-store.test.mjs test/theme-studio.test.mjs`
  Expected: PASS.

- [ ] **Step 5: Commit Task 1**
  ```bash
  git add src/assets/mascots.js src/core/config-store.js src/ui/theme-studio.js test/presets.test.mjs test/config-store.test.mjs test/theme-studio.test.mjs
  git commit -m "feat(mascots): add 3/4 anime Luffy & Gear 5 full-body SVG models and raise size ceiling to 240px"
  ```

---

### Task 2: `PetStage` `3:4` Sizing, `visiblePainted` Click-Passthrough, Top-Edge Speech Flip & Quips

**Files:**
- Modify: `src/fx/pet-stage.js`
- Modify: `src/core/surface-engine.js`
- Test: `test/fx-companions.test.mjs`
- Test: `test/surface-engine.test.mjs`

**Interfaces:**
- Consumes: `MASCOT_TEMPLATES[id].aspect` (`number | undefined`).
- Produces: `clampOutsideHole(x, y, sizeOrBox, holeRect, viewport)`, `PetStage.update()`, `PetStage.applyCoords()` (`speechEl.classList.toggle('is-below', ...)`), and `FX_PET_QUIPS['luffy-anime' | 'luffy-gear5-anime']`.

- [ ] **Step 1: Write failing tests in `test/fx-companions.test.mjs` and `test/surface-engine.test.mjs`**
  - In `test/fx-companions.test.mjs`:
    - Assert `clampOutsideHole` handles `{ width: 120, height: 160 }` cleanly around `[data-browser-hole]`.
    - Assert `PetStage` sets `stageEl.style.width === '120px'` and `stageEl.style.height === '160px'` when `pet.id === 'luffy-anime'` and `size === 160`.
    - Assert `PetStage` adds `'is-below'` to `speechEl.classList` when `pos.y < 64` (e.g., `yPct: 1`) and removes it when `pos.y >= 64`.
    - Extend the localized One Piece click quips test to cover `'luffy-anime'` and `'luffy-gear5-anime'` (`'vi'` & `'en'` banks, using the existing `setTimeout`/`clearTimeout` stub).
  - In `test/surface-engine.test.mjs`:
    - Assert `buildStylesheet` emits `pointer-events: none` / `pointer-events: visiblePainted` rules for `#agy-ct-pet-stage .agy-ct-svg-art` and `.agy-ct-pet-speech.is-below` rule (`top: calc(100% + 8px)`).

- [ ] **Step 2: Run tests to verify `RED` failures**
  Run: `node --test test/fx-companions.test.mjs test/surface-engine.test.mjs`
  Expected: FAIL on square `160px` width, missing `'is-below'` toggle/CSS, missing `pointer-events: visiblePainted` CSS, and missing quip banks.

- [ ] **Step 3: Implement `PetStage` & `SurfaceEngine` stylesheet updates**
  - Add `FX_PET_QUIPS` entries for `'luffy-anime'` and `'luffy-gear5-anime'`.
  - Update `clampOutsideHole` to resolve `boxW` & `boxH` from numeric `size` or `{ width, height }`.
  - Update `PetStage` helper `getStageDimensions(pet)` reading `MASCOT_TEMPLATES[pet.id]?.aspect || 1`, clamping `size` to `[44, 240]`, setting `stageEl.style.width` / `height`, passing `{ width, height }` into `clampOutsideHole` and `roam`, and setting `is-below` inside `applyCoords()` via `classList.add('is-below')` / `classList.remove('is-below')` when `this.pos.y < 64`.
  - Update `src/core/surface-engine.js` CSS for `#agy-ct-pet-stage` (`pointer-events: none`), `.agy-ct-pet-body` (`pointer-events: none`), `#agy-ct-pet-stage .agy-ct-svg-art` (`pointer-events: none`) with `#agy-ct-pet-stage .agy-ct-svg-art :is(path, circle, ellipse, rect, polygon, polyline) { pointer-events: visiblePainted; cursor: grab; }` and `.agy-ct-pet-body > img { pointer-events: auto; cursor: grab; }`, plus `.agy-ct-pet-speech.is-below { bottom: auto; top: calc(100% + 8px); transform: translateX(-50%) translateY(-4px); }` (and `.is-below.is-visible { transform: translateX(-50%) translateY(0); }`).

- [ ] **Step 4: Run tests to verify `GREEN`**
  Run: `node --test test/fx-companions.test.mjs test/surface-engine.test.mjs`
  Expected: PASS.

- [ ] **Step 5: Commit Task 2**
  ```bash
  git add src/fx/pet-stage.js src/core/surface-engine.js test/fx-companions.test.mjs test/surface-engine.test.mjs
  git commit -m "feat(pet-stage): support 3:4 portrait sizing, visiblePainted passthrough, top-edge speech flip, and anime Luffy quips"
  ```

---

### Task 3: Wire One Piece Bundles Safely (`xPct: 80, yPct: 48, size: 168`) & Full End-to-End Verification

**Files:**
- Modify: `src/presets/themes.js:278,340`
- Test: `test/presets.test.mjs`
- Test: `test/surface-engine.test.mjs`

**Interfaces:**
- Consumes: `MASCOT_TEMPLATES['luffy-anime' | 'luffy-gear5-anime']`, `BUBBLE_PRESETS['mu-rom-hai-tac' | 'gear5-nika']` (keeping bubble mascots `'luffy-chibi'` & `'luffy-gear5'`).

- [ ] **Step 1: Write failing assertions in `test/presets.test.mjs`**
  - Update One Piece bundle assertions: `one-piece-sunny-sunset` (`pet.id === 'luffy-anime'`, `pet.size === 168`, `pet.pos.xPct >= 75`) and `one-piece-gear5-nika` (`pet.id === 'luffy-gear5-anime'`, `pet.size === 168`, `pet.pos.xPct >= 75`), while `mu-rom-hai-tac.mascotId === 'luffy-chibi'` and `gear5-nika.mascotId === 'luffy-gear5'`.

- [ ] **Step 2: Run test to verify `RED`**
  Run: `node --test test/presets.test.mjs`
  Expected: FAIL on `sunset.patch.pet.id` / `nika.patch.pet.id`.

- [ ] **Step 3: Update `src/presets/themes.js` and rebuild/verify visuals**
  - Update `one-piece-sunny-sunset` (`pet: { enabled: true, id: 'luffy-anime', size: 168, mode: 'float', opacity: 96, pos: { xPct: 80, yPct: 48 }, showSpeechOnClick: true }`) and `one-piece-gear5-nika` (`pet: { enabled: true, id: 'luffy-gear5-anime', size: 168, mode: 'float', opacity: 96, pos: { xPct: 80, yPct: 48 }, showSpeechOnClick: true }`).

- [ ] **Step 4: Run full test suite, build bundle, inspect `preview.html` visually in Chromium, and verify live CDP**
  - Run `node --test` (`0` failures)
  - Run `node cli.mjs build` (`[syntax OK]`)
  - Briefly preview `preview.html` via Playwright MCP on Dark & Light backgrounds + Theme Studio FX tab (`46×46` crop + `240px` slider), checking `luffy-anime` and `luffy-gear5-anime` anatomy & speech flip at `yPct: 1`.
  - Run `node cli.mjs verify` (`PASS`).

- [ ] **Step 5: Commit Task 3**
  ```bash
  git add src/presets/themes.js test/presets.test.mjs
  git commit -m "feat(presets): wire full-body anime Luffy & Gear 5 models into One Piece bundles"
  ```
