# Anime Luffy WebP Models Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bundle transparent WebP anime Luffy (`luffy-anime.webp`) and Gear 5 Nika (`luffy-gear5-anime.webp`) sprites under `assets/pets/`, teach `scripts/build.mjs` and `PetStage`/`ThemeStudio` to embed and render `<img>` mascots cleanly at `44–240px` with true aspect boxes, click-passthrough SVG/image handling, top-edge `.is-below` speech flipping, and wire them into the One Piece Dark & Gear 5 bundles.

**Architecture:** `scripts/build.mjs` extracts a shared `collectDiskAssets` helper to inline `assets/wallpapers/*` into `assets/wallpapers-manifest.js` and `assets/pets/*` into `MASCOT_TEMPLATES[id].embeddedDataUri` inside `src/assets/mascots.js` (while retaining compact vector SVG fallbacks for raw ESM runs). `PetStage` computes `stageW = Math.round(size * aspect)` & `stageH = size`, passes `{ width, height }` to `clampOutsideHole`, suppresses native browser image dragging (`draggable = false`), and toggles `.is-below` on `speechEl` when `pos.y < 64`.

**Tech Stack:** Node.js >= 22.4 ESM, WebP alpha assets, Vanilla DOM/CSS, `node --test`, zero external npm dependencies.

**Spec:** [`docs/superpowers/specs/2026-11-18-anime-luffy-mascots-design.md`](../specs/2026-11-18-anime-luffy-mascots-design.md)

## Global Constraints
- Zero-Patch Delivery & Single-IIFE (`scripts/build.mjs` `MODULE_ORDER`, unique top-level identifiers across `src/`).
- No base64 image data inside `:root` CSS custom properties; bind exclusively to `<img src>`.
- Zero static `<defs>`/`url(#...)` or `<animate>`/`<style>` in SVG fallbacks; keep `120Hz` GPU `transform` on `.agy-ct-pet-body`, `pointer-events: auto` on `<img>`, and zero `backdrop-filter: blur` / CSS `drop-shadow`.
- Keep existing `luffy-chibi` & `luffy-gear5` mascots on bubble presets (`mu-rom-hai-tac`, `gear5-nika`).

## Review Focus
- `buildBundle` must embed `assets/pets/luffy-anime.webp` and `assets/pets/luffy-gear5-anime.webp` into `MASCOT_TEMPLATES` inside the compiled IIFE without breaking wallpaper embedding or `stripDeletedWallpapers`.
- `PetStage` must render `<img>` when `embeddedDataUri` is present with `draggable === false`, fall back cleanly to SVG in raw ESM when `embeddedDataUri === ''`, and avoid image ghost dragging.
- `PetStage` stage dimensions (`width = Math.round(size * aspect)`) & `clampOutsideHole({ width, height })` must prevent horizontal clip/hole overlap AND still accept legacy numeric `size`.
- Clicking pet when `pos.y < 64` must add `.is-below` on `speechEl`; when `pos.y >= 64` it must remove `.is-below`.
- `sanitizeImportedConfig` and `ThemeStudio` slider must accept up to `240px` and clamp `>240` -> `240`, `<44` -> `44`.

---

### Task 1: Asset Embedding (`assets/pets/`), `MASCOT_TEMPLATES`, Size Bounds (`240px`) & Studio Thumbnails

**Files:**
- Create: `assets/pets/luffy-anime.webp`
- Create: `assets/pets/luffy-gear5-anime.webp`
- Modify: `scripts/build.mjs`
- Modify: `src/assets/mascots.js`
- Modify: `src/core/config-store.js:213`
- Modify: `src/ui/theme-studio.js:800-862`
- Test: `test/build.test.mjs`, `test/presets.test.mjs`, `test/config-store.test.mjs`, `test/theme-studio.test.mjs`

- [ ] **Step 1: Write failing tests (`RED`)**
  - `test/build.test.mjs`: assert `buildBundle()` embeds `assets/pets/luffy-anime.webp` & `assets/pets/luffy-gear5-anime.webp` into `MASCOT_TEMPLATES['luffy-anime'].embeddedDataUri` / `MASCOT_TEMPLATES['luffy-gear5-anime'].embeddedDataUri` with `^data:image\/webp;base64,`.
  - `test/presets.test.mjs`: assert `MASCOT_TEMPLATES['luffy-anime']` (`aspect: 0.62`) & `MASCOT_TEMPLATES['luffy-gear5-anime']` (`aspect: 0.64`) exist with valid compact SVG fallback (zero static `<defs>`, `<animate>`, `<style>`).
  - `test/config-store.test.mjs`: assert `size: 220` preserves `220` and `size: 999` clamps to `240`.
  - `test/theme-studio.test.mjs`: assert FX pet size slider `max === '240'`.
- [ ] **Step 2: Run tests (`node --test test/build.test.mjs test/presets.test.mjs test/config-store.test.mjs test/theme-studio.test.mjs`) and confirm `RED` fail.**
- [ ] **Step 3: Copy WebP cutouts to `assets/pets/`, implement shared `collectDiskAssets` + pet embedding in `scripts/build.mjs`, add `luffy-anime` & `luffy-gear5-anime` in `src/assets/mascots.js`, update `240` clamp in `config-store.js` & `theme-studio.js` (prefer `m.embeddedDataUri` `<img src>` in `renderFxTab`).**
- [ ] **Step 4: Run tests to verify `GREEN`, then commit Task 1.**

---

### Task 2: `PetStage` `<img>` + `aspect` Sizing + Top-Edge `.is-below` Speech + Click Passthrough CSS + Quips

**Files:**
- Modify: `src/fx/pet-stage.js`
- Modify: `src/core/surface-engine.js`
- Test: `test/fx-companions.test.mjs`, `test/surface-engine.test.mjs`

- [ ] **Step 1: Write failing tests (`RED`)**
  - `test/fx-companions.test.mjs`:
    - `clampOutsideHole(x, y, { width: 109, height: 176 }, holeRect, viewport)` keeps box clear of hole.
    - `PetStage` applies `width: 109px` and `height: 176px` for `luffy-anime` at `size: 176` and renders `<img>` (`draggable === false`) when `MASCOT_TEMPLATES` has `embeddedDataUri` (or test `custom` + injected `embeddedDataUri` cleanly).
    - `PetStage` sets `'is-below'` on `speechEl` when `y < 64` and removes it when `y >= 64`.
    - Localized `vi`/`en` click quip tests cover `'luffy-anime'` and `'luffy-gear5-anime'`.
  - `test/surface-engine.test.mjs`:
    - Assert `buildStylesheet` emits `.agy-ct-pet-speech.is-below`, `#agy-ct-pet-stage { ... pointer-events: none; }`, `.agy-ct-pet-body > img { pointer-events: auto; }`, and `pointer-events: visiblePainted` on SVG child shapes.
- [ ] **Step 2: Run `node --test test/fx-companions.test.mjs test/surface-engine.test.mjs` and confirm `RED` fail.**
- [ ] **Step 3: Implement `PetStage` updates + `SurfaceEngine` stylesheet rules cleanly.**
- [ ] **Step 4: Run tests to verify `GREEN`, then commit Task 2.**

---

### Task 3: Wire `luffy-anime` & `luffy-gear5-anime` into One Piece Bundles & Full Verification

**Files:**
- Modify: `src/presets/themes.js`
- Test: `test/presets.test.mjs`

- [ ] **Step 1: Write failing assertions in `test/presets.test.mjs` (`one-piece-sunny-sunset` -> `pet.id === 'luffy-anime'`, `size: 176`, `pos.xPct: 82`, `pos.yPct: 48`; `one-piece-gear5-nika` -> `pet.id === 'luffy-gear5-anime'`, `size: 176`, `pos.xPct: 82`, `pos.yPct: 48`).**
- [ ] **Step 2: Run `node --test test/presets.test.mjs` (`RED` fail).**
- [ ] **Step 3: Update `src/presets/themes.js` cleanly.**
- [ ] **Step 4: Verify `node --test`, `node cli.mjs build`, Playwright `preview.html` screenshot check on Dark & Light, dispatch whole-branch reviewer (`self`, `Model: "pro"`), fix any issues, merge to `main`, clean worktree, rebuild `dist/antigravity-theme.js`, and run `node cli.mjs verify` (`PASS`).**
