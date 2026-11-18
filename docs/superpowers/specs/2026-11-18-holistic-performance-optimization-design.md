# Holistic Engine, Bundle & Compositor Optimization — Design Spec

**Date:** 2026-11-18
**Status:** Approved (Autonomous Execution Requested)

## 1. Baseline Telemetry (Measured on Live Antigravity 2.x + Node 24)

- **Compiled IIFE Bundle (`dist/antigravity-theme.js`):** `370,115 bytes` (`361.4 KB`); `prepareBundleSource` payload: `371,480 bytes`.
  - `assets/pets/luffy-anime.webp` (`296×480`): `39,062 bytes` + `luffy-gear5-anime.webp` (`305×480`): `49,272 bytes` = `88,334 bytes` (`~117.8 KB` base64).
  - `config.hiddenPets` is stored in config yet ignored by `prepareBundleSource` (`stripDeletedWallpapers` only strips `WALLPAPERS`).
- **Live Stylesheet (`#agy-ct-styles`):** `38,435 bytes` (`100x buildStylesheet`: `18.11 ms`), retaining multi-line rule formatting and redundant `:has(:focus-visible)` selectors alongside `:focus-within`.
- **V8 Heap Boot Retention:** `window.__AGY_THEME_BOOT__` remains pinned on `window` after `loadCustomMediaMap()` finishes, duplicating all custom `data:image/*` base64 slots across `window.__AGY_THEME_BOOT__.media` and `controller.customMedia`. `loadCustomMediaMap()` also opens 6 separate `readonly` IndexedDB transactions instead of 1 shared transaction.
- **DOM & Mutation Hot-Paths:**
  - `SurfaceEngine` `MutationObserver` fast-path ignores `agent-response`, `tool-group-collapsible`, `worked-for-collapsible`, `overview-panel`, and `.xterm`, **missing `.monaco-editor`, `[data-side-panel-body="true"]`, `[data-mention-menu]`, and `.agy-overlay`** — causing every keystroke/cursor blink in open code tabs or side-panel markdown streams to schedule `rAF` → `scanAndDecorate()` + forced `getBoundingClientRect()` reads.
  - `syncShellAndHoleMetrics()` unconditionally writes `--agy-sidebar-w`, `--agy-hdr-h`, `clipPath`, and `data-agy-split-active` on every scan even when unchanged.
  - `dtFindChatBubbles()` executes a second full-DOM `parentElement` ancestor-Set walk even when `DT_FALLBACK_BUBBLE_SELECTOR` added zero fallback nodes.
- **Canvas & Daemon Hot-Paths:**
  - `AmbientCanvasEngine.drawFrame()` issues 50–78 individual `beginPath()` + `arc()` + `fill()` + `globalAlpha` calls per frame in `snow`, and allocates 30–48 `rgba(...)` template strings per frame in `sakura`.
  - `isNodeProcessAlive(pid)` spawns `tasklist.exe` synchronously even when `pid === process.pid`, and `user-data/daemon.log` appends without a size ceiling.

## 2. Goals, Non-Goals & Constraints

- **Goals:**
  1. Cut `dist/antigravity-theme.js` size by `>= 45 KB` while preserving crisp `>2x` retina sprite quality at default `176px` stage height, and strip `hiddenPets` in `prepareBundleSource`.
  2. Free `window.__AGY_THEME_BOOT__.media` after `loadCustomMediaMap()` reconciliation and read all 6 IndexedDB media slots in 1 `readonly` transaction.
  3. Eliminate unnecessary `rAF` scans during `.monaco-editor` typing / side-panel streaming / overlay navigation, memoize unchanged shell metrics, remove redundant `:has(:focus-visible)` invalidation traps, compact CSS rule bodies safely, and halve `dtFindChatBubbles` ancestor walks on modern sessions.
  4. Batch `snow` into 2 `fill()` passes and remove per-petal string allocations in `sakura`.
  5. Fast-path `isNodeProcessAlive(process.pid)` and bound `user-data/daemon.log` (`<= 256 KB`).
- **Non-Goals:** Adding external npm dependencies, changing Theme Studio UX behavior, or removing fallback SVG mascots.
- **Constraints:** Node.js `>= 22.4` zero-dependency ESM, unique top-level IIFE identifiers across `MODULE_ORDER`, Zero Live Blur, and `100%` backward compatibility with existing config/CLI contracts.

## 3. Approaches Considered

1. **Selected — Vertical Surgical Optimizations at Existing Seams:** Optimize WebP assets (`237×384` & `244×384` `method=6`), extend `stripHiddenAssets`, release `__AGY_THEME_BOOT__.media`, widen `MutationObserver` fast-path + memoize shell metrics + prune redundant `:has()`, and batch `snow`/`sakura` canvas draws. Preserves single-IIFE zero-patch architecture with zero UX tradeoffs.
2. **Rejected — External HTTP Media Server for Built-in Assets:** Serving built-in sprites from a localhost HTTP server breaks offline `preview.html` (`file://` / static server) and violates CSP in strict Electron views.
3. **Rejected — Aggressive CSS Property Whitespace Stripping (`prop:val`):** Saves `<1.5 KB` extra over rule-line compaction while breaking readable CSS inspection and substring contracts.
