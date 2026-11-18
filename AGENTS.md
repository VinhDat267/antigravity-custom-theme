# AGENTS.md — Antigravity 2.x Custom Theme Suite

Zero-patch CDP theme engine for Google Antigravity 2.x Desktop on Windows (Node.js `>= 22.4` ESM, zero external npm dependencies).

## Context Pointers

- **Preset & Asset Authoring**: Read [`SKILL.md`](SKILL.md) when adding or editing wallpapers, theme bundles, chat bubbles, composer borders, mascots, or stickers.
- **System Architecture & Bridge Spec**: Read [`docs/superpowers/specs/2026-11-18-antigravity-custom-theme-design.md`](docs/superpowers/specs/2026-11-18-antigravity-custom-theme-design.md) when changing the CDP daemon, bridge message protocol, security boundaries, or 5-tab Theme Studio layout.

## Core Invariants

### 1. Zero-Patch Delivery & Single-IIFE Bundler
- Leave Antigravity installation binaries (`app.asar`) untouched; inject exclusively into `.agy-shell` targets discovered via `%APPDATA%\Antigravity\DevToolsActivePort` (filtering out `plugin://`, `data:`, and `devtools://` targets).
- `scripts/build.mjs` strips `import`/`export` syntax and concatenates `src/` files in `MODULE_ORDER` into one IIFE (`dist/antigravity-theme.js`).
  - Update `MODULE_ORDER` in `scripts/build.mjs` whenever adding, renaming, or reordering a file under `src/`.
  - Keep top-level identifier names unique across all `src/` modules — files pass `node --test` as separate ESM modules yet share a single lexical scope inside the built IIFE.

### 2. Host-Authoritative Persistence
- Antigravity randomizes its loopback origin port on every restart, isolating browser `localStorage` and `IndexedDB` per session. Treat gitignored `user-data/config.json` and `user-data/media/` as the canonical store, bridged via CDP `Runtime.addBinding('__agyThemeSave')` in `daemon/cdp-daemon.mjs` with monotonic `__savedAt` guards.
- Keep machine-specific OS paths (`%USERPROFILE%` expansions or home-directory paths) out of source files, presets, tests, and exported JSON.

### 3. Zero Live Blur & Element-Bound Media
- Render frosted sidebar/header glass exclusively via the pre-baked offscreen canvas in `src/core/prebaked-glass.js` (cached in `localStorage` under `agy_ct_glass_cache_v1`). Omit `backdrop-filter` and `-webkit-backdrop-filter` on `.agy-shell` and scroll containers.
- Bind base64 `data:` image URLs directly to element properties (`background-image` or `<img src>`), keeping `:root` CSS custom properties small (Chromium enforces a 2 MB custom-property ceiling).

### 4. 120Hz & Multi-Split Compositor Budget
- Run continuous idle animations on wrapper `<div>` elements using GPU-composited `transform`/`scale`/`opacity` (`.agy-ct-pet-body`). Gate SVG child `<g>`/`<path>` `@keyframes` (`blink`, `wag`, `spin`, `twinkle`) behind `:hover` or `.is-reacting` so idle panes sustain `LayoutCount: 0` at `120Hz`.
- Scope CSS selectors to concrete classes/attributes: avoid universal `*`, `body:has(...)`, live `filter: drop-shadow(...)`, and `will-change` on `.overflow-y-auto` scrollers (render glows with static `::before` radial gradients).
- Preserve the single unified `MutationObserver` fast-path in `src/core/surface-engine.js` that skips high-frequency streaming subtrees (`agent-response`, `tool-group-collapsible`, `worked-for`, `overview-panel`, `xterm`).
- Let `PetStage` `roam` sleep its `rAF` loop once settled at target coordinates, pause canvas/SVG animations when the window is blurred/hidden, and maintain `AmbientCanvasEngine.setSplitCount()` DPR/FPS/particle scaling when `2+` split panes are open.

### 5. Antigravity 2.x Live DOM Quirks (`[data-newux-theme]`)
- **Split panes**: Tiling sessions wrap `.agy-shell` inside `[data-split-panes]` and `[data-tiling-pane]`. Keep ancestor split wrappers transparent, theme horizontal/vertical tiling splitters, and anchor composer stickers to the focused `[data-pane-id]` pane.
- **Chat bubbles & row actions**: Target `.agy-user-bubble-frame` (tight bubble) rather than full-width `[data-testid="user-message"]` rows. Neutralize high-specificity `[data-newux-theme]` `--row-bg`/`--sidebar` gradients on `.agy-row-actions::before` and fade hovered row titles via `mask-image`.
- **Portaled & floating surfaces**: Theme portaled `.agy-overlay` menus (Model Selector) and floating/docked Overview cards (`.animate-overview-panel`, leaving outer full-pane `[data-testid="overview-panel-host"]` transparent) across both Dark and Light modes.
- **Settings host & Split-Browser cutout**: Exclude popup/Overview `[role="dialog"]` overlays in `dtFindSettingsContext` so closing Theme Studio restores native Settings panes cleanly. Preserve `--agy-hole-clip` (`evenodd` polygon around `[data-browser-hole]`) across wallpaper, glass, `<canvas>`, pets, and stickers.

## Verification Loop

Every source, preset, or stylesheet change is complete only when all checks pass from the repository root:

1. `node --test` — full unit and integration suite passes (`0` failures).
2. `node cli.mjs build` — builds `dist/antigravity-theme.js` with `[syntax OK]`.
3. Live CDP verification (when Antigravity 2.x is open):
   - Check `node cli.mjs status`: if `"running": true`, the daemon hot-reloads `dist/antigravity-theme.js` automatically; otherwise run `node cli.mjs inject --one-shot`.
   - Run `node cli.mjs verify` — must report `PASS` (`themeActive: true`, `hasLiveBlurOnScrollers: false`, `shellTransparentBg: true`).
   - When headless/offline, verify UI changes against `preview.html` (`[data-agy-mock-shell]`).
