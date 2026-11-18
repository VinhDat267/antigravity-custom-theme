# Antigravity 2.x Custom Theme Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-patch, 60–120fps CDP Custom Theme Suite for Google Antigravity 2.x on Windows 10/11 combining Zero Live Blur, split-browser hole cutout, weather `<canvas>` FX, chat bubbles, composer frames, avatars, draggable stickers, interactive pets, and a 5-tab bilingual (`VI/EN`) Theme Studio.

**Architecture:** A zero-dependency Node.js (`>= 22`) bundler (`scripts/build.mjs`) compiles modular ES source files under `src/` into an idempotent single-file IIFE (`dist/antigravity-theme.js`). A Windows-first CDP daemon (`daemon/cdp-daemon.mjs`) discovers `%APPDATA%\Antigravity\DevToolsActivePort`, attaches only to `.agy-shell` loopback pages, injects boot state (`window.__AGY_THEME_BOOT__`), persists config and custom media to `user-data/` via `Runtime.addBinding` (`__agyThemeBridge`), and handles Windows CLI commands atomically via `user-data/daemon-cmd.json`.

**Tech Stack:** Node.js `>= 22.0.0` (`v24.19.0` built-in `WebSocket`, `http`, `fs`, `vm`, `node:test`), Vanilla ES2022+ JS/CSS/Canvas/SVG, PowerShell 5.1+ (`.ps1` UTF-8 BOM + `.bat` wrappers). Zero npm packages, zero Python dependency.

**Spec:** `docs/superpowers/specs/2026-11-18-antigravity-custom-theme-design.md`

## Global Constraints

- **Target App Only:** Google Antigravity 2.x Desktop on Windows (`%LOCALAPPDATA%\Programs\antigravity\Antigravity.exe`, `%APPDATA%\Antigravity\DevToolsActivePort`). No `Antigravity IDE` code.
- **Zero Stock Modification:** Never read/extract/repack `app.asar` and never kill `Antigravity.exe` or `language_server`.
- **Zero External Dependencies:** Node.js `>= 22.0.0` standard library only; `package.json` has `"type": "module"` and zero `"dependencies"` / `"devDependencies"`.
- **Zero Live Blur:** Never emit `backdrop-filter: blur(...)` on `.agy-shell`, `.overflow-y-auto`, `[data-main-content-body]`, or `[data-side-panel-body]`. Use pre-baked offscreen canvas data URLs (`--agy-l-glass-bg`).
- **Chromium CSS Variable Limit (~2MB):** Never place wallpaper/avatar Data URIs inside `:root { --var: ... }`; apply via direct element selectors (`#agy-ct-bg-image`, `.agy-shell::after`, avatar pseudo-elements) or `element.style.backgroundImage`.
- **Windows Signal & Encoding Rules:** Never use `SIGHUP`; use `user-data/daemon-cmd.json` + `fs.watch`/poll. Save all `.ps1` files as UTF-8 with BOM and use `;` statement separators in PowerShell 5.1.
- **No Personal Paths:** Zero `C:\Users\...` paths in source, presets, or exported JSON.

## Review Focus

1. **Untrusted/malformed `customCss` or imported JSON (`"</style><script>"`, out-of-range numbers, local OS paths):** `sanitizeImportedConfig` and `buildStylesheet` must neutralize `</style` sequences, clamp all numeric fields to valid ranges, and strip local filesystem paths (`C:\...`, `/Users/...`) instead of breaking DOM styles or leaking paths. *(Tested in Tasks 2 & 4)*
2. **Ephemeral loopback port rotation (`https://127.0.0.1:<random_port>`) vs stale/empty `localStorage`:** `loadConfig()` must prefer `window.__AGY_THEME_BOOT__.config` whenever `localStorage` is empty or has a smaller `__savedAt` timestamp so user settings never reset across Antigravity restarts. *(Tested in Task 2)*
3. **Non-shell CDP targets (`data:text/html` splash, `plugin://` iframes, split-browser external sites):** `filterAntigravityTargets` must keep only `type === "page"` loopback (`http://127.0.0.1` / `https://127.0.0.1`) targets, and `src/index.js` must abort mounting if neither `.agy-shell` nor `[data-agy-mock-shell]` exists. *(Tested in Tasks 6 & 7)*
4. **Duplicate command execution or stale `daemon.pid` after crash on Windows:** `consumeDaemonCommand` must deduplicate by `nonce`, and PID lock checks must ignore dead or non-`node` PIDs so `cli.mjs` never hangs or loops. *(Tested in Task 7)*
5. **Pets (`roam`/`follow`) or right-anchored Stickers overlapping active Split-Browser (`[data-browser-hole]`):** `clampOutsideHole(rect, holeRect, viewport)` must relocate/clamp companion elements outside `holeRect` whenever `body[data-has-browser-hole="true"]`. *(Tested in Task 5)*

---

### Task 1: Project Manifest, Curated Presets & Vector Artwork Catalog

**Files:**
- Create: `package.json`
- Create: `src/assets/mascots.js`
- Create: `src/assets/stickers.js`
- Create: `src/assets/wallpapers-manifest.js`
- Create: `src/presets/bubbles.js`
- Create: `src/presets/inputs.js`
- Create: `src/presets/themes.js`
- Test: `test/presets.test.mjs`

**Interfaces:**
- Consumes: none (foundational data & pure SVG/artwork generators)
- Produces:
  - `MASCOT_TEMPLATES` (9 keys: `'loi-kiem'`, `'rong-ngoc'`, `'ho-ly-chibi'`, `'meo-than'`, `'meo-huyen-thuat'`, `'phu-thuy-anh-trang'`, `'hoa-anh-dao'`, `'den-long'`, `'ca-koi'`), `renderMascotSvg(id, variant = 'pet') -> string`, `renderAgentStarSvg(primaryHex, secondaryHex) -> string`
  - `STICKER_TEMPLATES` (14 SVG keys), `CORNER_ORNAMENTS` (4 SVG data URIs), `renderStickerSvg(id) -> string`
  - `WALLPAPERS` (array of `{ id, name, nameEn, embeddedDataUri, previewCss }` with `'none'` + 8 built-in high-DPI layered SVG/procedural artworks), `resolveWallpaperUrl(config, customMedia = {}) -> string`
  - `BUBBLE_PRESETS` (array of 13 items: `'none'` + 12 styled presets with `{ id, name, nameEn, bg, border, frameBg, text, shadow, radius, mascotId, mascotAlign, scrollCaps, cyberCorners, cornerOrnament }`)
  - `INPUT_PRESETS` (array of 9 items: `'none'` + 8 styled presets with `{ id, name, nameEn, bg, border, focusBorder, shadow, radius }`)
  - `ACCENT_COLORS` (8 items), `ATMOSPHERE_PRESETS` (7 items: `'none'`, `'thunder-rain'`, `'rain'`, `'stardust'`, `'sakura'`, `'fireflies'`, `'snow'`), `THEME_BUNDLES` (8 full presets including at least one `isLight: true` preset `'kanagawa-lotus-light'` and `'minimal-obsidian'` pure-gradient preset)

- [ ] **Step 1: Write `package.json` and the failing preset catalog test `test/presets.test.mjs`**
  - `package.json`: `"name": "antigravity-custom-theme"`, `"version": "1.0.0"`, `"private": true`, `"type": "module"`, scripts mapping `build`, `test` (`node --test test/*.test.mjs`), `start`, `stop`, `status`, `inject`, `open-settings`, `reset`, `verify`.
  - `test/presets.test.mjs` asserts:
    - `Object.keys(MASCOT_TEMPLATES).length >= 9` and `renderMascotSvg('loi-kiem')` returns valid `<svg...</svg>`.
    - `Object.keys(STICKER_TEMPLATES).length >= 14` and `renderStickerSvg('trang-sao')` returns valid `<svg...</svg>`.
    - `BUBBLE_PRESETS.length >= 13`, `INPUT_PRESETS.length >= 9`, `ATMOSPHERE_PRESETS.length === 7`, `THEME_BUNDLES.length >= 8`.
    - `THEME_BUNDLES.some(b => b.patch.isLight === true)` is `true`.
    - Every `THEME_BUNDLES` entry references valid `wallpaperId`, `bubbleId`, `inputId`, `atmosphereId`, and `pet.id`, and contains zero `C:\` or `/Users/` substrings.
    - `resolveWallpaperUrl({ enabled: true, wallpaperId: 'custom' }, { wallpaper: 'data:image/webp;base64,AAA' })` returns `'data:image/webp;base64,AAA'`, and returns `''` when `enabled: false`.

- [ ] **Step 2: Run test to verify it fails**
  - Run: `node --test test/presets.test.mjs`
  - Expected: FAIL (`ERR_MODULE_NOT_FOUND` for `src/assets/mascots.js`)

- [ ] **Step 3: Implement `src/assets/*` and `src/presets/*`**
  - Author clean, self-contained animated SVG art in `mascots.js` and `stickers.js`, 8 layered artistic SVG data-URI starter wallpapers in `wallpapers-manifest.js` (`thunder-samurai`, `sakura-shrine-night`, `cosmic-violin`, `jade-sanctuary`, `arcane-moonlight`, `kanagawa-wave`, `kanagawa-lotus`, `obsidian-nebula`), and matching `bubbles.js`, `inputs.js`, and `themes.js`.

- [ ] **Step 4: Run test to verify it passes**
  - Run: `node --test test/presets.test.mjs`
  - Expected: PASS (0 failures)

- [ ] **Step 5: Commit**
  - Run: `git add package.json src/assets src/presets test/presets.test.mjs && git commit -m "feat(presets): add curated theme bundles, bubbles, inputs, and SVG asset catalogs"`

---

### Task 2: Config Store, Host Bridge & Portable JSON Sanitizer

**Files:**
- Create: `src/core/config-store.js`
- Test: `test/config-store.test.mjs`

**Interfaces:**
- Consumes: none
- Produces:
  - `MEDIA_SLOTS = ['wallpaper', 'wallpaperLight', 'userAvatar', 'agentAvatar', 'pet', 'sticker']`
  - `DEFAULT_CONFIG` (complete v1 schema: `enabled`, `lang`, `isLight`, `activeBundleId`, `wallpaperId`, `wallpaperFit`, `wallpaperPos`, `dimming` `0..92`, `wpBlur` `0..20`, `glassBlur` `0..16`, `surfaces` `{ sidebarOpacity, headerOpacity, aiCardOpacity, codeOpacity }`, `accentColor`, `secondaryColor`, `overlayRgb`, `atmosphereId`, `atmosphereIntensity` `10..100`, `bubbleId`, `bubbleMascotEnabled`, `inputId`, `avatars` `{ userEnabled, agentEnabled, agentMode: 'star'|'custom', size: 32, radius: 50, rotate: 0 }`, `pet` `{ enabled, id, size, opacity, mode, pos, showSpeechOnClick }`, `stickers` `{ enabled, items }`, `customCss`, `launcherPill` `{ enabled, corner }`, `customSelectors`, `hiddenWallpapers`, `hiddenStickers`, `hiddenPets`, `customBundles`, `__savedAt`)
  - `mergeConfig(base, patch) -> Config`
  - `sanitizeCssText(cssText) -> string` (strips `</style` case-insensitively and null bytes)
  - `sanitizeImportedConfig(rawObj) -> Config` (clamps numbers, validates enums/booleans, strips `C:\...` or `/Users/...` file paths, sanitizes `customCss`)
  - `exportPortableConfig(config) -> string` (formatted JSON excluding transient runtime keys/local paths)
  - `loadConfig(envWindow = globalThis.window) -> Config` (authoritative `envWindow.__AGY_THEME_BOOT__?.config` wins when `localStorage` is empty or older by `__savedAt`)
  - `saveConfig(config, envWindow = globalThis.window) -> Config` (updates `__savedAt`, caches to `localStorage`, sends `{ type: 'config', data }` to `envWindow.__agyThemeBridge`)
  - `resetConfig(current, envWindow = globalThis.window) -> Config` (preserves `hidden*`, `customBundles`, `customSelectors`)
  - `loadCustomMediaMap(envWindow = globalThis.window) -> Promise<Record<string, string>>`
  - `saveCustomMedia(slot, dataUrl, envWindow = globalThis.window) -> Promise<void>`
  - `deleteCustomMedia(slot, envWindow = globalThis.window) -> Promise<void>`

- [ ] **Step 1: Write failing tests in `test/config-store.test.mjs`**
  - Test deep merge & `resetConfig` preserving `hiddenWallpapers` and `customBundles`.
  - Test ephemeral port boot priority: given empty `localStorage` or stale `localStorage` (`__savedAt: 100`) and `__AGY_THEME_BOOT__.config` (`__savedAt: 200`, `wallpaperId: 'kanagawa-wave'`), `loadConfig(mockWin)` returns `kanagawa-wave` and syncs cache.
  - Test `sanitizeImportedConfig` clamps `dimming: 500 -> 92`, `glassBlur: -9 -> 0`, strips `C:\Users\DemoUser\secret.png` to `''`, and strips `</style><script>alert(1)</script>` inside `customCss`.
  - Test `saveConfig` and `saveCustomMedia` emit valid JSON payloads to `mockWin.__agyThemeBridge`.

- [ ] **Step 2: Run test to verify it fails**
  - Run: `node --test test/config-store.test.mjs`
  - Expected: FAIL (`ERR_MODULE_NOT_FOUND`)

- [ ] **Step 3: Implement `src/core/config-store.js`**
  - Implement schema defaults, bounds clamping, `localStorage` + `IndexedDB` graceful fallbacks (so Node test runner works without browser globals), and `__agyThemeBridge` messages.

- [ ] **Step 4: Run test to verify it passes**
  - Run: `node --test test/config-store.test.mjs`
  - Expected: PASS

- [ ] **Step 5: Commit**
  - Run: `git add src/core/config-store.js test/config-store.test.mjs && git commit -m "feat(core): add host-authoritative config store and portable JSON sanitizer"`

---

### Task 3: Zero-Dependency Bundler (`ThemeCompiler`)

**Files:**
- Create: `scripts/build.mjs`
- Test: `test/build.test.mjs`

**Interfaces:**
- Consumes: `assets/wallpapers/*` (optional raster/SVG files) and ordered `src/*` list
- Produces:
  - `MODULE_ORDER` (ordered relative paths under `src/`)
  - `stripModuleSyntax(code) -> string`
  - `stripDeletedWallpapers(bundleSource, config) -> string`
  - `buildBundle({ rootDir, outFile, moduleFiles } = {}) -> { outFile, sizeBytes, code }`

- [ ] **Step 1: Write failing bundler unit tests in `test/build.test.mjs`**
  - Test `stripModuleSyntax` removes multi-line `import { a, b } from './x.js';` and `export const / export function / export class` keywords without corrupting string literals.
  - Test `stripDeletedWallpapers` removes `embeddedDataUri: 'data:...'` only for IDs listed in `config.hiddenWallpapers` while leaving active wallpapers untouched.
  - Test `buildBundle` on a temporary fixture directory wraps modules into an IIFE that parses cleanly via `new vm.Script(code)`.

- [ ] **Step 2: Run test to verify it fails**
  - Run: `node --test test/build.test.mjs`
  - Expected: FAIL (`ERR_MODULE_NOT_FOUND`)

- [ ] **Step 3: Implement `scripts/build.mjs`**
  - Export `MODULE_ORDER`, `stripModuleSyntax`, `stripDeletedWallpapers`, `buildBundle`, and support CLI invocation `node scripts/build.mjs [--check]`.

- [ ] **Step 4: Run test to verify it passes**
  - Run: `node --test test/build.test.mjs`
  - Expected: PASS

- [ ] **Step 5: Commit**
  - Run: `git add scripts/build.mjs test/build.test.mjs && git commit -m "feat(build): add zero-dependency IIFE bundler and deleted-media stripper"`

---

### Task 4: `SurfaceStyleEngine`, Zero Live Blur & Split-Browser Cutout

**Files:**
- Create: `src/core/prebaked-glass.js`
- Create: `src/core/dom-targets.js`
- Create: `src/core/surface-engine.js`
- Test: `test/surface-engine.test.mjs`

**Interfaces:**
- Consumes: `BUBBLE_PRESETS`, `INPUT_PRESETS`, `WALLPAPERS`, `resolveWallpaperUrl`, `renderMascotSvg`, `renderAgentStarSvg`, `CORNER_ORNAMENTS`, `sanitizeCssText`
- Produces:
  - `syncPrebakedGlass(shellEl, config, customMedia) -> Promise<string>`
  - `computeBrowserHoleClip(shellRect, holeRect, hasHoleAttr) -> { active: boolean, clipPath: string, holeRect: { left, top, right, bottom } | null }`
  - `buildStylesheet(config, customMedia) -> string`
  - `SurfaceEngine` class (`mount()`, `apply(config, customMedia)`, `getHoleState()`, `startVisualPicker(targetKey, label, onPicked)`, `destroy()`)

- [ ] **Step 1: Write failing tests in `test/surface-engine.test.mjs`**
  - Test `buildStylesheet` with Dark & Light (`isLight: true`) configs, custom avatars (`size`, `radius`, `rotate`), and custom wallpaper (`2.5MB`-equivalent mock data URI):
    - Braces `{` and `}` are strictly balanced.
    - Contains ZERO `backdrop-filter: blur(` on `.agy-shell`, `.overflow-y-auto`, `[data-main-content-body]`, or `[data-side-panel-body]`.
    - `:root { ... }` block contains ZERO `data:image/` strings (respects Chromium 2MB CSS variable limit).
    - `customCss` containing `body { color: red; }</style><script>evil()</script>` has `</style` stripped.
    - Light mode (`isLight: true`) emits dark ink (`#0f172a`) and frosted light composer pills.
  - Test `computeBrowserHoleClip({ left: 0, top: 0, width: 1400, height: 900 }, { left: 700, top: 40, right: 1400, bottom: 900, width: 700, height: 860 }, true)` returns `active: true` and `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, 700px 40px, 1400px 40px, 1400px 900px, 700px 900px, 700px 40px)`.

- [ ] **Step 2: Run test to verify it fails**
  - Run: `node --test test/surface-engine.test.mjs`
  - Expected: FAIL (`ERR_MODULE_NOT_FOUND`)

- [ ] **Step 3: Implement `prebaked-glass.js`, `dom-targets.js`, and `surface-engine.js`**
  - Implement offscreen `<canvas>` `syncPrebakedGlass` (`640px` width cache), Antigravity 2.x selectors (`.agy-shell`, `[data-testid="user-message"]`, `[data-testid="user-message-bubble"]`, `[data-testid="agent-response"]`, `.surface-composer`, `.md-table-scroll` / `.md-table-frame` scrollbar fix, `window.electronNative?.setTitleBarOverlay`), `ResizeObserver` hole tracking applying `--agy-hole-clip` to `.agy-shell`, `#agy-ct-bg-root`, and `#agy-ct-ambient-canvas`, plus Visual DOM Picker.

- [ ] **Step 4: Run test to verify it passes**
  - Run: `node --test test/surface-engine.test.mjs`
  - Expected: PASS

- [ ] **Step 5: Commit**
  - Run: `git add src/core/prebaked-glass.js src/core/dom-targets.js src/core/surface-engine.js test/surface-engine.test.mjs && git commit -m "feat(surface): implement Zero Live Blur stylesheet engine, avatars, and split-browser hole clip"`

---

### Task 5: `AtmosphereAndCompanions` (Weather Canvas, Interactive Pets & Stickers)

**Files:**
- Create: `src/fx/ambient-canvas.js`
- Create: `src/fx/pet-stage.js`
- Create: `src/fx/sticker-layer.js`
- Test: `test/fx-companions.test.mjs`

**Interfaces:**
- Consumes: `MASCOT_TEMPLATES`, `renderMascotSvg`, `STICKER_TEMPLATES`, `renderStickerSvg`
- Produces:
  - `clampOutsideHole(x, y, size, holeRect, viewport) -> { x: number, y: number }`
  - `AmbientCanvasEngine` (`configure(mode, intensity)`, `setHoleClip(clipPath)`, `destroy()`)
  - `PetStage` (`update()`, `destroy()`)
  - `StickerLayer` (`update()`, `destroy()`)

- [ ] **Step 1: Write failing tests in `test/fx-companions.test.mjs`**
  - Test `AmbientCanvasEngine` with a mock 2D canvas context: seeds particles for all 6 active modes (`thunder-rain`, `rain`, `stardust`, `sakura`, `fireflies`, `snow`), clears when `'none'`, pauses loop when `document.hidden` becomes `true`, and applies `canvas.style.clipPath` via `setHoleClip`.
  - Test `clampOutsideHole(850, 200, 88, { left: 700, top: 40, right: 1400, bottom: 900 }, { width: 1400, height: 900 })` pushes `x` left of `700 - 88 - 8` so neither roaming pets nor stickers overlap the embedded browser hole.

- [ ] **Step 2: Run test to verify it fails**
  - Run: `node --test test/fx-companions.test.mjs`
  - Expected: FAIL (`ERR_MODULE_NOT_FOUND`)

- [ ] **Step 3: Implement `ambient-canvas.js`, `pet-stage.js`, and `sticker-layer.js`**
  - Implement 6 weather effects (`DPR <= 1.5`, `24ms` frame pacing, lightning forks on `thunder-rain`), `PetStage` (`float`/`roam`/`follow`, drag persistence, bilingual VI/EN speech bubbles & click burst particles, hole clamping), and `StickerLayer` (slot anchoring + free drag + hole clamping).

- [ ] **Step 4: Run test to verify it passes**
  - Run: `node --test test/fx-companions.test.mjs`
  - Expected: PASS

- [ ] **Step 5: Commit**
  - Run: `git add src/fx test/fx-companions.test.mjs && git commit -m "feat(fx): add 6-mode weather canvas, interactive pets, and hole-safe stickers"`

---

### Task 6: Bilingual 5-Tab `ThemeStudioUI`, Runtime Bootstrap & `preview.html`

**Files:**
- Create: `src/ui/i18n.js`
- Create: `src/ui/theme-studio.js`
- Create: `src/index.js`
- Create: `preview.html`
- Modify: `test/build.test.mjs` (add full real-bundle build & non-shell guard test)

**Interfaces:**
- Consumes: all `src/assets/*`, `src/presets/*`, `src/core/*`, `src/fx/*`
- Produces:
  - `I18N`, `t(lang, key)`
  - `ThemeStudio` (`getElement()`, `isOpen()`, `open(tabId)`, `close()`, `toggle()`, `render()`, `destroy()`)
  - `window.__AGY_CUSTOM_THEME__ = { version: '1.0.0', init, destroy, openSettings, closeSettings, toggleSettings, applyBundle, getConfig, setConfig }`
  - Built `dist/antigravity-theme.js` and interactive `preview.html`

- [ ] **Step 1: Add failing full-bundle & shell-guard test in `test/build.test.mjs`**
  - Assert `buildBundle()` succeeds on the real repo `MODULE_ORDER`, produces valid JS (`new vm.Script(code)`), and when evaluated against a mock window whose `document.querySelector('.agy-shell')` and `document.querySelector('[data-agy-mock-shell]')` both return `null`, `window.__AGY_CUSTOM_THEME__.isMounted` is `false` (never pollutes non-shell pages).

- [ ] **Step 2: Run test to verify it fails**
  - Run: `node --test test/build.test.mjs`
  - Expected: FAIL (missing `src/ui/i18n.js`, `src/ui/theme-studio.js`, `src/index.js`)

- [ ] **Step 3: Implement `i18n.js`, `theme-studio.js`, `src/index.js`, and `preview.html`**
  - Implement bilingual `VI/EN` 5-tab Studio (*Presets & JSON*, *Wallpaper & Glass*, *Chat & Avatars*, *Weather, Pets & Stickers*, *Advanced, `custom.css` & DOM Picker*), client-side `192x192` WebP avatar compression, Settings modal tab injection + Sidebar `Custom theme` button + optional floating pill + `Ctrl+Shift+Y` & `Ctrl+Alt+K` shortcuts, idempotent `.destroy()`, and rich `preview.html` sandbox with `[Toggle Split-Browser Hole]` button.

- [ ] **Step 4: Build bundle & run all tests**
  - Run: `node scripts/build.mjs --check && node --test test/*.test.mjs`
  - Expected: `Built ... dist/antigravity-theme.js` and all tests PASS

- [ ] **Step 5: Commit**
  - Run: `git add src/ui src/index.js preview.html test/build.test.mjs && git commit -m "feat(ui): add bilingual 5-tab Theme Studio, shell-safe bootstrap, and preview sandbox"`

---

### Task 7: Windows `CdpSyncDaemon`, Unified CLI, 1-Click Installers, Live Verifier & `SKILL.md`

**Files:**
- Create: `daemon/cdp-daemon.mjs`
- Create: `scripts/verify-cdp.mjs`
- Create: `cli.mjs`
- Create: `scripts/install-win.ps1`
- Create: `scripts/uninstall-win.ps1`
- Create: `install.bat`
- Create: `uninstall.bat`
- Create: `SKILL.md`
- Create: `README.md`
- Test: `test/cdp-daemon.test.mjs`

**Interfaces:**
- Consumes: `buildBundle`, `stripDeletedWallpapers` from `scripts/build.mjs`
- Produces:
  - `resolvePortFile({ platform, env, homedir }) -> string`
  - `parsePortFileContent(raw) -> { port: number, wsPath: string } | null`
  - `filterAntigravityTargets(targets) -> Target[]`
  - `persistBridgeMessage(userDataDir, rawJson) -> 'config' | 'media' | null`
  - `writeDaemonCommand(userDataDir, cmd, extra) -> { cmd, nonce, at }`
  - `consumeDaemonCommand(userDataDir, lastNonce) -> { command: object | null, nextNonce: string }`
  - CLI commands in `cli.mjs`: `build | start | stop | status | inject | open-settings | reset | verify`

- [ ] **Step 1: Write failing daemon & target-filtering tests in `test/cdp-daemon.test.mjs`**
  - Test `resolvePortFile` prioritizes `AGY_PORT_FILE` and resolves `%APPDATA%\Antigravity\DevToolsActivePort` on `win32`.
  - Test `filterAntigravityTargets` keeps `type: 'page'` with `https://127.0.0.1:61824/index.html` and rejects `plugin://...`, `data:text/html,...`, `devtools://...`, and `https://github.com/...`.
  - Test `persistBridgeMessage` atomically writes `config.json` (ignoring stale `__savedAt` and never overwriting existing config on `config-init`) and `media/<slot>.dat`.
  - Test `writeDaemonCommand` + `consumeDaemonCommand` executes a `nonce` once and ignores duplicate reads of the same `nonce`.

- [ ] **Step 2: Run test to verify it fails**
  - Run: `node --test test/cdp-daemon.test.mjs`
  - Expected: FAIL (`ERR_MODULE_NOT_FOUND`)

- [ ] **Step 3: Implement `cdp-daemon.mjs`, `verify-cdp.mjs`, `cli.mjs`, Windows `.ps1`/`.bat` scripts, `SKILL.md`, and `README.md`**
  - Implement `cdp-daemon.mjs` (polls `DevToolsActivePort`, checks `.agy-shell` via CDP before injecting, registers `__agyThemeBridge`, watches `dist/antigravity-theme.js` and `user-data/daemon-cmd.json`, handles dead/non-`node` PID lock recovery).
  - Implement `verify-cdp.mjs` asserting `themeActive: true`, `hasLiveBlurOnScrollers: false`, and valid `.agy-shell` styling on live Antigravity 2.x windows.
  - Write `scripts/install-win.ps1` and `scripts/uninstall-win.ps1` **with UTF-8 BOM**, plus `install.bat`, `uninstall.bat`, `SKILL.md` (Antigravity skill definition), and Vietnamese/English `README.md`.

- [ ] **Step 4: Run full unit test suite & CLI dry checks**
  - Run: `node --test test/*.test.mjs && node cli.mjs build && node cli.mjs status`
  - Expected: All tests PASS, bundle built cleanly, `status` reports daemon state without errors.

- [ ] **Step 5: Commit**
  - Run: `git add daemon scripts cli.mjs install.bat uninstall.bat SKILL.md README.md test/cdp-daemon.test.mjs && git commit -m "feat(daemon): add Windows DevToolsActivePort sync daemon, CLI, installers, and live verifier"`
