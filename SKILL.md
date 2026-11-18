---
name: antigravity-custom-theme
description: Use when applying, troubleshooting, or generating new presets, wallpapers, chat bubbles, pets, or stickers for the Google Antigravity 2.x desktop custom theme engine without modifying app binaries.
---

# Antigravity 2.x Custom Theme Skill

Zero-patch CDP theme suite for Google Antigravity 2.x Desktop on Windows (Node.js >= 22, zero dependencies). Applies wallpapers, pre-baked L-shaped glass, weather effects, interactive pets, draggable stickers, customizable avatars, and a bilingual (`VI`/`EN`) 5-tab Theme Studio over `DevToolsActivePort`.

## CLI Operations

Run all commands from the repository root:

```bash
node cli.mjs build                 # Compile src/ + assets/wallpapers/ -> dist/antigravity-theme.js
node cli.mjs inject --one-shot     # Apply theme immediately to open Antigravity 2.x windows
node cli.mjs start                 # Start background CDP sync & hot-reload daemon
node cli.mjs status                # Inspect daemon PID, active CDP port, bundle & config state
node cli.mjs open-settings         # Open Theme Studio inside Antigravity 2.x
node cli.mjs verify                # Assert themeActive, .agy-shell styles, and Zero Live Blur over CDP
node cli.mjs reset                 # Unmount live theme hooks from open Antigravity 2.x windows
node cli.mjs stop                  # Stop running CDP sync daemon
```

For headless browser preview during UI development, open `preview.html` or run `node --test` to execute unit and bundle syntax checks.

## Adding New Presets or Assets From Reference Images

1. **Wallpapers (`assets/wallpapers/` + `src/assets/wallpapers-manifest.js`):**
   - Place `.webp`, `.png`, `.jpg`, `.avif`, or `.svg` files inside `assets/wallpapers/<id>.<ext>`.
   - Register metadata `{ id, name, nameEn, isLight, tag, svgFallback }` in `WALLPAPERS` inside `src/assets/wallpapers-manifest.js`.
2. **Theme Bundles (`src/presets/themes.js`):**
   - Add an entry to `THEME_BUNDLES` referencing valid IDs from `WALLPAPERS`, `BUBBLE_PRESETS`, `INPUT_PRESETS`, `MASCOT_TEMPLATES`, `STICKER_TEMPLATES`, and `ATMOSPHERE_PRESETS`.
   - Pick contrasting `accentColor`, `secondaryColor`, `overlayRgb`, and `isLight: true | false` matching the target artwork palette.
3. **Bubbles / Inputs / Mascots / Stickers:**
   - Extend `BUBBLE_PRESETS` (`src/presets/bubbles.js`), `INPUT_PRESETS` (`src/presets/inputs.js`), `MASCOT_TEMPLATES` (`src/assets/mascots.js`), or `STICKER_TEMPLATES` (`src/assets/stickers.js`) keeping vector SVG artwork compact.
4. **Rebuild & Verify:**
   - Run `node cli.mjs build`, `node --test`, `node cli.mjs inject --one-shot`, and `node cli.mjs verify`.

## Architectural Guardrails

- **Zero-Patch Policy:** Never modify `app.asar` or Antigravity installation binaries.
- **Zero Live Blur:** Never add `backdrop-filter: blur(...)` or `-webkit-backdrop-filter: blur(...)` to `.agy-shell` or scroll containers; L-glass frosting runs pre-baked through `src/core/prebaked-glass.js`.
- **Chromium 2MB Variable Limit:** Keep base64 `data:` image URLs on explicit element properties (`background-image` / `<img>`), never inside `:root { --var }` custom properties (except pre-baked compact L-glass canvas output on `.agy-shell`).
- **Split-Browser Safe:** Preserve `--agy-hole-clip` (`evenodd` polygon) so embedded browser panes stay unobstructed by wallpaper, glass, canvas weather, pets, or stickers.
- **No Personal Paths:** Never embed machine-specific OS paths (`%USERPROFILE%` expansions or `/Users/...`) in presets, exports, or code.
