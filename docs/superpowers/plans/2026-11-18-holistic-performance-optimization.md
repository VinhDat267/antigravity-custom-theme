# Holistic Performance & Memory Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce bundle/CSS payload, V8 duplicate media retention, DOM mutation/layout thrashing during code-editor & side-panel activity, Canvas draw-call overhead, and daemon Startup log growth without altering external UX or zero-patch CDP invariants.

**Architecture:** Execute four vertical TDD slices at public module seams: (1) high-density `method=6` WebP sprites + `stripHiddenAssets` + bounded `daemon.log` & `process.pid` fast-path; (2) single-transaction IndexedDB read + `window.__AGY_THEME_BOOT__.media` release in `config-store.js`; (3) expanded `MutationObserver` fast-path (`.monaco-editor`, side-panel, mention/overlay), metric memoization, `:has(:focus-visible)` pruning, rule-line CSS compaction, and `dtFindChatBubbles` fast-return; (4) batched 2-pass `snow` rendering and zero-allocation `sakura` drawing in `AmbientCanvasEngine`.

**Tech Stack:** Node.js `>= 22.4` ESM (`node:test`, `node:vm`, built-in `WebSocket`), HTML5 Offscreen/2D Canvas, CSS Containment.

**Spec:** `docs/superpowers/specs/2026-11-18-holistic-performance-optimization-design.md`

## Global Constraints

- Zero external npm dependencies; keep `MODULE_ORDER` in `scripts/build.mjs` valid with globally unique top-level identifiers across all `src/` modules.
- Preserve Zero Live Blur (`backdrop-filter: none !important` on `.agy-shell` and `.overflow-y-auto`) and `--agy-hole-clip` (`evenodd` polygon).
- Keep `prop: val` single-space formatting inside `buildStylesheet` while collapsing multi-line rule bodies to 1 rule per line.
- Never embed machine-specific OS paths (`%USERPROFILE%` expansions or `/Users/...`) in code, tests, or docs.

## Review Focus

- `stripHiddenAssets(bundleSource, { hiddenWallpapers: ['luffy-anime'], hiddenPets: ['thunder-samurai'] })` must never cross-strip `MASCOT_TEMPLATES` from `hiddenWallpapers` or `WALLPAPERS` from `hiddenPets`.
- `loadCustomMediaMap(win)` when `win.__AGY_THEME_BOOT__` is frozen or read-only must not throw when attempting to clear `boot.media`.
- `SurfaceEngine` `MutationObserver` skipping `.monaco-editor` / `[data-side-panel-body="true"]` `childList` mutations must STILL process `attributes` mutations (`data-has-browser-hole`, `data-browser-hole`, `data-split-panes`) anywhere in `document.body`.
- `syncShellAndHoleMetrics()` memoization must reset cleanly on `destroy()` so remounting applies fresh `--agy-sidebar-w`, `--agy-hdr-h`, and `--agy-hole-clip` properties onto a new shell element.
- `capDaemonLogFile(logPath, maxBytes)` must handle missing files cleanly and retain the newest tail lines when truncating an oversized log.

---

### Task 1: Asset Compression, `stripHiddenAssets`, & Daemon Log/PID Efficiency

**Files:**
- Modify: `assets/pets/luffy-anime.webp`
- Modify: `assets/pets/luffy-gear5-anime.webp`
- Modify: `scripts/build.mjs`
- Modify: `daemon/cdp-daemon.mjs`
- Test: `test/build.test.mjs`, `test/cdp-daemon.test.mjs`

**Interfaces:**
- Produces:
  - `export function stripHiddenAssets(bundleSource, config)` in `scripts/build.mjs` (clears `hiddenWallpapers` within `WALLPAPERS = [...];` and `hiddenPets` within `MASCOT_TEMPLATES = {...};`; `stripDeletedWallpapers` remains exported).
  - `export function capDaemonLogFile(logPath, maxBytes = 262144)` in `daemon/cdp-daemon.mjs`.

- [ ] **Step 1: Write failing tests in `test/build.test.mjs` and `test/cdp-daemon.test.mjs`**
  - Assert `stripHiddenAssets` strips `MASCOT_TEMPLATES['luffy-anime'].embeddedDataUri` when `hiddenPets: ['luffy-anime']` while leaving `WALLPAPERS` intact, and ignores `hiddenPets: ['thunder-samurai']` on `WALLPAPERS`.
  - Assert `prepareBundleSource` strips `hiddenPets` configured in `user-data/config.json`.
  - Assert `capDaemonLogFile(logPath, 512)` leaves small/missing files untouched and trims oversized logs to `<= 512` bytes while keeping the newest tail entry.
  - Assert `assets/pets/luffy-anime.webp` + `assets/pets/luffy-gear5-anime.webp` combined size is `< 60_000` bytes with valid `RIFF....WEBP` headers.
- [ ] **Step 2: Run tests to verify RED**
  - Run: `node --test test/build.test.mjs test/cdp-daemon.test.mjs`
- [ ] **Step 3: Re-encode `assets/pets/*.webp` (`237×384` & `244×384`, `method=6, q=80, aq=85`) and implement `stripHiddenAssets`, `isNodeProcessAlive(process.pid)` fast-path, and `capDaemonLogFile`**
- [ ] **Step 4: Run tests to verify GREEN**
  - Run: `node --test test/build.test.mjs test/cdp-daemon.test.mjs`
- [ ] **Step 5: Commit Task 1**

---

### Task 2: Boot Media Heap Deduplication & Single-Tx IndexedDB Read

**Files:**
- Modify: `src/core/config-store.js:452-498`
- Test: `test/config-store.test.mjs`

**Interfaces:**
- Modifies internal behavior of `export async function loadCustomMediaMap(envWindow)` while preserving return value `{ [slot]: dataUrl }`.

- [ ] **Step 1: Write failing test in `test/config-store.test.mjs`**
  - Mock `win.indexedDB` counting `db.transaction(...)` calls and provide `win.__AGY_THEME_BOOT__ = { config: { ... }, media: { wallpaper: 'data:image/webp;base64,BIG' } }` (plus a frozen-object case).
  - Assert `db.transaction` is called at most `1` time for reading all 6 `MEDIA_SLOTS` (plus writes if syncing from disk), `win.__AGY_THEME_BOOT__.media` is cleared (`undefined` or `null`) after `loadCustomMediaMap(win)` resolves, `win.__AGY_THEME_BOOT__.config` remains readable for `loadConfig(win)`, and frozen `__AGY_THEME_BOOT__` does not throw.
- [ ] **Step 2: Run test to verify RED**
  - Run: `node --test test/config-store.test.mjs`
- [ ] **Step 3: Implement single-transaction `readonly` batch read and safe `delete boot.media` in `src/core/config-store.js`**
- [ ] **Step 4: Run test to verify GREEN**
  - Run: `node --test test/config-store.test.mjs`
- [ ] **Step 5: Commit Task 2**

---

### Task 3: MutationObserver Fast-Path, Metric Memoization, Selector Pruning & `dtFindChatBubbles` Fast-Return

**Files:**
- Modify: `src/core/surface-engine.js`
- Modify: `src/core/dom-targets.js`
- Test: `test/surface-engine.test.mjs`, `test/dom-targets.test.mjs`

**Interfaces:**
- Preserves `SurfaceEngine` and `dtFindChatBubbles` signatures.

- [ ] **Step 1: Write failing tests in `test/surface-engine.test.mjs` and `test/dom-targets.test.mjs`**
  - Assert `SurfaceEngine` `MutationObserver` does NOT schedule `rAF` for `childList` mutations inside `.monaco-editor`, `[data-side-panel-body="true"]`, `[data-mention-menu]`, or `.agy-overlay`, while STILL scheduling `rAF` + `syncHole` for `attributes` mutations (`data-has-browser-hole`).
  - Assert `syncShellAndHoleMetrics()` writes `--agy-sidebar-w` and `--agy-hdr-h` once when called twice with identical shell/sidebar/topbar rects, and writes again after `destroy()` + remount.
  - Assert `buildStylesheet()` contains zero `:has(:focus-visible)` substrings and compacts multi-line CSS rules (`< 33_000` chars on default config).
  - Assert `dtFindChatBubbles()` does not walk `parentElement` a second time when tight bubbles match and fallback selector yields only ancestors of those tight bubbles.
- [ ] **Step 2: Run tests to verify RED**
  - Run: `node --test test/surface-engine.test.mjs test/dom-targets.test.mjs`
- [ ] **Step 3: Implement fast-paths, memoization, `:has(:focus-visible)` removal, rule-line CSS compaction, and `dtFindChatBubbles` fast-return**
- [ ] **Step 4: Run tests to verify GREEN**
  - Run: `node --test test/surface-engine.test.mjs test/dom-targets.test.mjs`
- [ ] **Step 5: Commit Task 3**

---

### Task 4: Batched Canvas `snow` & Zero-Allocation `sakura` Rendering

**Files:**
- Modify: `src/fx/ambient-canvas.js:291-395`
- Test: `test/fx-companions.test.mjs`

**Interfaces:**
- Preserves `AmbientCanvasEngine` public methods (`configure`, `drawFrame`, `setSplitCount`, `destroy`).

- [ ] **Step 1: Write failing test in `test/fx-companions.test.mjs`**
  - Count `ctx.fill()` calls and `ctx.fillStyle` assignments during `drawFrame(16)` in `snow` mode (with `>= 40` particles) and `sakura` mode (with `>= 25` petals):
    - Assert `snow` calls `ctx.fill()` at most `2` times per frame.
    - Assert `sakura` assigns `ctx.fillStyle` at most `1` time per frame (using numeric `ctx.globalAlpha` per petal instead of `rgba(...)` string allocation) and restores `ctx.globalAlpha === 1`.
- [ ] **Step 2: Run test to verify RED**
  - Run: `node --test test/fx-companions.test.mjs`
- [ ] **Step 3: Implement 2-bucket `snow` path batching (`moveTo` + `arc`), single-`fillStyle` `sakura` rendering, and zero-dimension guard in `src/fx/ambient-canvas.js`**
- [ ] **Step 4: Run test to verify GREEN**
  - Run: `node --test test/fx-companions.test.mjs`
- [ ] **Step 5: Commit Task 4**
