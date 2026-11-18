/**
 * SurfaceStyleEngine: Generates Zero-Live-Blur stylesheet, manages wallpaper/canvas
 * Split-Browser cutout geometry, custom avatars, titlebar sync, and DOM decorators.
 */

import { renderAgentStarSvg, renderMascotSvg } from '../assets/mascots.js';
import { CORNER_ORNAMENTS } from '../assets/stickers.js';
import { resolveWallpaperUrl } from '../assets/wallpapers-manifest.js';
import { BUBBLE_PRESETS } from '../presets/bubbles.js';
import { INPUT_PRESETS } from '../presets/inputs.js';
import { sanitizeCssText } from './config-store.js';
import { syncPrebakedGlass } from './prebaked-glass.js';
import {
  computeBrowserHoleClip,
  dtBuildSelectorPath,
  dtFindChatBubbles,
  dtFindChatInputContainers,
  dtFindSettingsContext,
  dtFindShellElement,
  dtIsInsideInjectorUi,
  dtIsSettingsLabel
} from './dom-targets.js';

const SE_STYLE_ID = 'agy-ct-styles';

function minifyCssBlock(css) {
  const strings = [];
  const masked = String(css || '')
    .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, (m) => {
      const idx = strings.push(m) - 1;
      return `\x01S${idx}\x02`;
    })
    .replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '');

  const compacted = masked
    .replace(/\s+/g, ' ')
    .replace(/\s*\{\s*/g, '{')
    .replace(/\s*;+\s*/g, ';')
    .replace(/\s*\}\s*/g, '}\n')
    .replace(/;\}/g, '}')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .trim();

  return compacted.replace(/\x01S(\d+)\x02/g, (_m, i) => strings[Number(i)]);
}

const SE_STATIC_CSS = minifyCssBlock(`
  .agy-ct-svg-art { width: 100%; height: 100%; display: block; overflow: visible; }
  @keyframes agyCtBob { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-2.5px); } }
  @keyframes agyCtFloat { 0%, 100% { transform: translateY(0px) rotate(-1deg); } 50% { transform: translateY(-6px) rotate(1.5deg); } }
  @keyframes agyCtBlink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
  @keyframes agyCtWag { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(6deg); } }
  @keyframes agyCtTwinkle { 0%, 100% { opacity: 0.45; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.12); } }
  @keyframes agyCtSpark { 0%, 100% { opacity: 0.6; } 45% { opacity: 1; } 52% { opacity: 0.35; } 60% { opacity: 1; } }
  @keyframes agyCtSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes agyCtBurstUp {
    0% { opacity: 1; transform: translate(0, 0) scale(0.7); }
    100% { opacity: 0; transform: translate(var(--dx, 0px), var(--dy, -36px)) scale(1.2); }
  }
  .agy-ct-bubble-styled:hover > .agy-ct-bubble-mascot { animation: agyCtBob 2.2s ease-in-out infinite; will-change: transform; }
  #agy-ct-pet-stage:is(:hover, .is-reacting) .agy-ct-anim-blink { animation: agyCtBlink 2.4s ease-in-out infinite; }
  #agy-ct-pet-stage:is(:hover, .is-reacting) .agy-ct-anim-wag { animation: agyCtWag 1.6s ease-in-out infinite; }
  #agy-ct-pet-stage:is(:hover, .is-reacting) .agy-ct-anim-twinkle { animation: agyCtTwinkle 1.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  #agy-ct-pet-stage:is(:hover, .is-reacting) .agy-ct-anim-spark { animation: agyCtSpark 1.4s linear infinite; }
  #agy-ct-pet-stage:is(:hover, .is-reacting) .agy-ct-anim-spin { animation: agyCtSpin 10s linear infinite; }
  #agy-ct-pet-stage {
    position: fixed; left: 0; top: 0; z-index: 45;
    pointer-events: none; user-select: none; touch-action: none;
    will-change: transform; contain: layout style;
  }
  .agy-ct-pet-body { width: 100%; height: 100%; pointer-events: none; animation: agyCtFloat 4.2s ease-in-out infinite; will-change: transform; transition: scale 0.16s ease; }
  .agy-ct-pet-body > img { pointer-events: auto; touch-action: none; cursor: grab; -webkit-user-drag: none; user-select: none; }
  .agy-ct-pet-body > img:active { cursor: grabbing; }
  #agy-ct-pet-stage .agy-ct-svg-art { pointer-events: none; }
  #agy-ct-pet-stage .agy-ct-svg-art :is(path, rect, circle, ellipse, polygon, polyline, line) { pointer-events: visiblePainted; cursor: grab; }
  #agy-ct-pet-stage .agy-ct-svg-art :is(path, rect, circle, ellipse, polygon, polyline, line):active { cursor: grabbing; }
  #agy-ct-pet-stage:hover .agy-ct-pet-body { scale: 1.06; }
  .agy-ct-pet-speech.is-align-right { left: auto; right: 0; --speech-tx: 0%; }
  .agy-ct-pet-speech.is-align-left { left: 0; right: auto; --speech-tx: 0%; }
  .agy-ct-pet-speech.is-below { bottom: auto; top: calc(100% + 8px); transform: translate(var(--speech-tx, -50%), -4px); }
  .agy-ct-pet-speech.is-visible { opacity: 1; transform: translate(var(--speech-tx, -50%), 0); }
  .agy-ct-pet-speech.is-below.is-visible { transform: translate(var(--speech-tx, -50%), 0); }
  .agy-ct-pet-burst { position: fixed; pointer-events: none; z-index: 960; font-size: 14px; animation: agyCtBurstUp 0.9s ease-out forwards; }
  .agy-ct-sticker-node {
    position: fixed; left: 0; top: 0; z-index: 40;
    cursor: grab; user-select: none; touch-action: none;
    will-change: transform; contain: layout style;
  }
  .agy-ct-sticker-node.has-glow::before {
    content: ""; position: absolute; inset: -20%; border-radius: 9999px;
    background: radial-gradient(circle, color-mix(in srgb, var(--agy-ct-accent) 24%, rgba(255, 255, 255, 0.22)) 0%, transparent 70%);
    pointer-events: none; z-index: -1;
  }
  html.agy-ct-idle-paused :is([class*="agy-ct-anim-"], .agy-ct-pet-body) { animation-play-state: paused !important; }
  .agy-ct-hidden-native { display: none !important; }
  .agy-ct-nav-item.is-active { background: rgba(255, 255, 255, 0.1) !important; color: #ffffff !important; }
  .agy-ct-picker-hover { outline: 2px dashed #facc15 !important; outline-offset: 2px !important; cursor: crosshair !important; }
  #agy-ct-picker-banner {
    position: fixed; top: 14px; left: 50%; transform: translateX(-50%);
    z-index: 99999; background: #18181b; color: #fef08a; border: 1px solid #facc15;
    border-radius: 8px; padding: 8px 14px; font-size: 12.5px; display: flex; align-items: center; gap: 10px;
  }
  #agy-ct-settings-panel {
    display: none; flex-direction: column; gap: 16px;
    padding: 18px 22px 28px; color: #e4e4e7;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif;
    box-sizing: border-box; width: 100%; max-width: 820px;
  }
  #agy-ct-settings-panel.is-open { display: flex; }
  #agy-ct-settings-panel :is(div, button, input, select, textarea, label, span, h2, h3, p) { box-sizing: border-box; }
  .agy-ct-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
  .agy-ct-head h2 { margin: 0; font-size: 16px; font-weight: 600; color: #ffffff; }
  .agy-ct-tabs { display: flex; flex-wrap: wrap; gap: 6px; padding-bottom: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
  .agy-ct-tab { background: transparent; color: #a1a1aa; border: 1px solid transparent; border-radius: 8px; padding: 6px 11px; font-size: 12.5px; font-weight: 500; cursor: pointer; }
  .agy-ct-tab:hover { color: #f4f4f5; background: rgba(255, 255, 255, 0.05); }
  .agy-ct-tab.is-active { background: rgba(255, 255, 255, 0.1); color: #ffffff; border-color: rgba(255, 255, 255, 0.14); }
  .agy-ct-card { background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(255, 255, 255, 0.09); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
  .agy-ct-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .agy-ct-grid-auto { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
  .agy-ct-grid-sm { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 8px; }
  .agy-ct-item-card { display: flex; flex-direction: column; gap: 6px; padding: 10px; border-radius: 8px; background: #14161e; border: 1px solid rgba(255, 255, 255, 0.1); color: #e4e4e7; text-align: left; cursor: pointer; }
  .agy-ct-item-card:hover { border-color: rgba(255, 255, 255, 0.25); }
  .agy-ct-item-card.is-selected { border-color: var(--agy-ct-accent); background: #1a1d28; }
  .agy-ct-btn { background: #1b1e28; color: #e4e4e7; border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 8px; padding: 6px 11px; font-size: 12px; font-weight: 500; cursor: pointer; }
  .agy-ct-btn:hover { border-color: rgba(255, 255, 255, 0.28); }
  .agy-ct-btn-danger { background: rgba(185, 28, 28, 0.8); border-color: rgba(248, 113, 113, 0.45); color: #fff; }
  .agy-ct-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .agy-ct-slider-row { display: grid; grid-template-columns: 1fr 150px 44px; align-items: center; gap: 10px; font-size: 12.5px; }
  .agy-ct-range-val { text-align: right; font-variant-numeric: tabular-nums; color: #d4d4d8; font-size: 12px; }
  .agy-ct-swatch { width: 22px; height: 22px; border-radius: 999px; border: 2px solid transparent; cursor: pointer; }
  .agy-ct-swatch.is-selected { border-color: #ffffff; }
  .agy-ct-textarea, .agy-ct-select, .agy-ct-input { width: 100%; background: #0e1017; color: #f4f4f5; border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 8px; padding: 7px 10px; font-size: 12px; }
  .agy-ct-textarea { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; min-height: 96px; resize: vertical; }
`);

function seSafeCssUrl(url) {
  return String(url || '')
    .replace(/\0/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\r\n]/g, '')
    .replace(/<\/style/gi, '');
}

export function buildStylesheet(config, customMedia = {}) {
  const cfg = config || {};
  const enabled = Boolean(cfg.enabled);
  const isLight = Boolean(cfg.isLight);
  const bubble = BUBBLE_PRESETS.find((b) => b.id === cfg.bubbleId) || BUBBLE_PRESETS[0];
  const inputPreset = INPUT_PRESETS.find((i) => i.id === cfg.inputId) || INPUT_PRESETS[0];
  const wallpaperUrl = resolveWallpaperUrl(cfg, customMedia);
  const hasWallpaper = Boolean(enabled && wallpaperUrl);

  const dimAlpha = Math.max(0, Math.min(0.92, (Number(cfg.dimming) || 0) / 100));
  const wpBlurPx = Math.max(0, Math.min(20, Number(cfg.wpBlur) || 0));
  const accent = /^#[0-9a-fA-F]{3,8}$/.test(String(cfg.accentColor || '')) ? cfg.accentColor : '#f5c451';
  const secondary = /^#[0-9a-fA-F]{3,8}$/.test(String(cfg.secondaryColor || '')) ? cfg.secondaryColor : '#60a5fa';
  const overlayRgb = /^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/.test(String(cfg.overlayRgb || ''))
    ? cfg.overlayRgb
    : isLight
      ? '242, 236, 188'
      : '11, 16, 27';

  const sidebarAlpha = Math.max(0, Math.min(0.98, (Number(cfg.surfaces?.sidebarOpacity ?? 52)) / 100));
  const headerAlpha = Math.max(0, Math.min(0.98, (Number(cfg.surfaces?.headerOpacity ?? 44)) / 100));
  const aiCardAlpha = Math.max(0, Math.min(0.98, (Number(cfg.surfaces?.aiCardOpacity ?? 64)) / 100));
  const codeAlpha = Math.max(0, Math.min(0.98, (Number(cfg.surfaces?.codeOpacity ?? 62)) / 100));

  const uiInk = isLight ? '#0f172a' : 'rgba(248, 250, 252, 0.96)';
  const uiMuted = isLight ? '#334155' : 'rgba(226, 232, 240, 0.86)';
  const uiShadow = isLight ? 'none' : '0 1px 4px rgba(0, 0, 0, 0.85)';
  const pillBg = isLight ? 'rgba(255, 255, 255, 0.82)' : 'rgba(8, 13, 26, 0.8)';
  const pillHoverBg = isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(15, 23, 42, 0.94)';
  const pillText = isLight ? '#0f172a' : '#f8fafc';
  const pillBorder = isLight ? 'rgba(15, 23, 42, 0.16)' : 'rgba(255, 255, 255, 0.16)';

  const rawWpPos = typeof cfg.wallpaperPos === 'string' ? cfg.wallpaperPos.trim() : '';
  const wpPos = /^(?:left|center|right|\d+%)\s+(?:top|center|bottom|\d+%)$/.test(rawWpPos)
    ? rawWpPos
    : 'center center';
  const wpFit = cfg.wallpaperFit === 'contain' ? 'contain' : 'cover';

  const scrollCapCss = bubble.scrollCaps
    ? `
      .agy-ct-bubble-styled::before,
      .agy-ct-bubble-styled::after {
        content: '';
        position: absolute;
        top: -3px;
        bottom: -3px;
        width: 8px;
        border-radius: 4px;
        background: linear-gradient(180deg, #b88a44, #5c3a14 50%, #b88a44);
        border: 1px solid #2e1b08;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
        pointer-events: none;
      }
      .agy-ct-bubble-styled::before { left: -5px; }
      .agy-ct-bubble-styled::after { right: -5px; }
    `
    : '';

  const cornerOrnamentUri = bubble.cornerOrnament ? CORNER_ORNAMENTS[bubble.cornerOrnament] : '';
  const cornerOrnamentCss = cornerOrnamentUri
    ? `
      .agy-ct-bubble-styled::after {
        content: '';
        position: absolute;
        top: 3px;
        left: 3px;
        width: 14px;
        height: 14px;
        background-image: url("${seSafeCssUrl(cornerOrnamentUri)}");
        background-size: contain;
        background-repeat: no-repeat;
        pointer-events: none;
        opacity: 0.8;
      }
    `
    : '';

  const cyberCornerCss = bubble.cyberCorners
    ? `
      .agy-ct-bubble-styled::before {
        content: '';
        position: absolute;
        inset: -1px;
        border-radius: inherit;
        background: linear-gradient(135deg, rgba(56, 189, 248, 0.5), transparent 38%, transparent 62%, rgba(16, 185, 129, 0.5));
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        padding: 1.5px;
        pointer-events: none;
      }
    `
    : '';

  const avSize = Math.max(18, Math.min(64, Number(cfg.avatars?.size) || 32));
  const avRadius = Math.max(0, Math.min(50, Number(cfg.avatars?.radius ?? 50)));
  const avRotate = Math.max(-45, Math.min(45, Number(cfg.avatars?.rotate) || 0));
  const userAvUrl = cfg.avatars?.userEnabled && customMedia.userAvatar ? customMedia.userAvatar : '';
  const agentAvUrl = cfg.avatars?.agentEnabled
    ? cfg.avatars?.agentMode === 'custom' && customMedia.agentAvatar
      ? customMedia.agentAvatar
      : renderAgentStarSvg(accent, secondary)
    : '';

  const avatarCss = enabled
    ? `
      ${
        userAvUrl
          ? `
        .agy-shell [data-testid="user-message"],
        [data-agy-mock-shell] [data-testid="user-message"] {
          position: relative !important;
          padding-right: ${avSize + 12}px !important;
        }
        .agy-shell [data-testid="user-message"]::after,
        [data-agy-mock-shell] [data-testid="user-message"]::after {
          content: "";
          position: absolute;
          right: 0;
          bottom: 4px;
          width: ${avSize}px;
          height: ${avSize}px;
          border-radius: ${avRadius}%;
          transform: rotate(${avRotate}deg);
          background-image: url("${seSafeCssUrl(userAvUrl)}");
          background-size: cover;
          background-position: center;
          border: 1.5px solid ${accent};
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.36);
          pointer-events: none;
        }
      `
          : ''
      }
      ${
        agentAvUrl
          ? `
        .agy-shell [data-testid="agent-response"],
        [data-agy-mock-shell] [data-testid="agent-response"] {
          position: relative !important;
          padding-left: ${avSize + 24}px !important;
          min-height: ${avSize + 20}px !important;
        }
        .agy-shell [data-testid="agent-response"]::before,
        [data-agy-mock-shell] [data-testid="agent-response"]::before {
          content: "";
          position: absolute;
          top: 12px;
          left: 12px;
          width: ${avSize}px;
          height: ${avSize}px;
          border-radius: ${avRadius}%;
          transform: rotate(${avRotate}deg);
          background-image: url("${seSafeCssUrl(agentAvUrl)}");
          background-size: cover;
          background-position: center;
          border: 1.5px solid ${secondary};
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.34);
          pointer-events: none;
        }
      `
          : ''
      }
    `
    : '';

  const launcherCorner = cfg.launcherPill?.corner || 'bottom-right';
  const launcherPosCss =
    launcherCorner === 'top-right'
      ? 'top: 44px; right: 16px;'
      : launcherCorner === 'bottom-left'
        ? 'bottom: 16px; left: 16px;'
        : 'bottom: 16px; right: 16px;';

  const customUserCss = sanitizeCssText(cfg.customCss || '');

  const dynamicCss = minifyCssBlock(`
    :root {
      --agy-ct-accent: ${accent};
      --agy-ct-secondary: ${secondary};
      --agy-ct-dim-alpha: ${dimAlpha};
      --agy-ct-wp-blur: ${wpBlurPx}px;
      --agy-ct-ink: ${uiInk};
      --agy-ct-muted: ${uiMuted};
    }

    html.agy-ct-active,
    body.agy-ct-active {
      background: transparent !important;
      background-color: transparent !important;
      ${
        enabled && isLight
          ? `
        color-scheme: light !important;
        --background: rgb(${overlayRgb}) !important;
        --color-background: rgb(${overlayRgb}) !important;
        --content: rgb(${overlayRgb}) !important;
        --card: rgba(255, 252, 240, 0.96) !important;
        --color-card: rgba(255, 252, 240, 0.96) !important;
        --popover: rgba(255, 252, 240, 0.98) !important;
        --color-popover: rgba(255, 252, 240, 0.98) !important;
        --glass: rgba(255, 252, 240, 0.95) !important;
        --shell: rgba(${overlayRgb}, 0.92) !important;
        --glass-border: rgba(15, 23, 42, 0.14) !important;
        --glass-highlight: rgba(255, 255, 255, 0.72) !important;
        --foreground: ${uiInk} !important;
        --color-foreground: ${uiInk} !important;
        --secondary-foreground: #1e293b !important;
        --color-secondary-foreground: #1e293b !important;
        --muted-foreground: #475569 !important;
        --color-muted-foreground: #475569 !important;
        --placeholder: #64748b !important;
        --color-placeholder: #64748b !important;
        --card-foreground: ${uiInk} !important;
        --popover-foreground: ${uiInk} !important;
        --primary-foreground: #ffffff !important;
        --color-primary-foreground: #ffffff !important;
        --code-foreground: #7c2d12 !important;
        --color-code: #7c2d12 !important;
        --link: #0369a1 !important;
        --color-link: #0369a1 !important;
        --secondary: rgba(15, 23, 42, 0.075) !important;
        --color-secondary: rgba(15, 23, 42, 0.075) !important;
        --muted: rgba(15, 23, 42, 0.05) !important;
        --color-muted: rgba(15, 23, 42, 0.05) !important;
        --border: rgba(15, 23, 42, 0.14) !important;
        --color-border: rgba(15, 23, 42, 0.14) !important;
        --card-border: rgba(15, 23, 42, 0.14) !important;
        --color-card-border: rgba(15, 23, 42, 0.14) !important;
        --onyx-frame: rgba(${overlayRgb}, 0.85) !important;
        --onyx-well: rgba(15, 23, 42, 0.06) !important;
        --onyx-raised: rgba(255, 252, 240, 0.96) !important;
        --onyx-selected: rgba(255, 255, 255, 0.92) !important;
        --onyx-key: #ffffff !important;
      `
          : ''
      }
    }
    ${
      enabled && isLight
        ? `
      html.agy-ct-active .settings-modal-container {
        --background: #18181b !important;
        --color-background: #18181b !important;
        --card: #1f1f24 !important;
        --color-card: #1f1f24 !important;
        --popover: #1f1f24 !important;
        --color-popover: #1f1f24 !important;
        --foreground: #f4f4f5 !important;
        --color-foreground: #f4f4f5 !important;
        --secondary-foreground: #e4e4e7 !important;
        --color-secondary-foreground: #e4e4e7 !important;
        --muted-foreground: #a1a1aa !important;
        --color-muted-foreground: #a1a1aa !important;
        --placeholder: #71717a !important;
        --color-placeholder: #71717a !important;
        --card-foreground: #f4f4f5 !important;
        --popover-foreground: #f4f4f5 !important;
        --secondary: rgba(255, 255, 255, 0.08) !important;
        --color-secondary: rgba(255, 255, 255, 0.08) !important;
        --muted: rgba(255, 255, 255, 0.05) !important;
        --color-muted: rgba(255, 255, 255, 0.05) !important;
        --border: rgba(255, 255, 255, 0.1) !important;
        --color-border: rgba(255, 255, 255, 0.1) !important;
        --card-border: rgba(255, 255, 255, 0.12) !important;
        --color-card-border: rgba(255, 255, 255, 0.12) !important;
        color: #e4e4e7;
      }
    `
        : ''
    }

    #agy-ct-bg-root {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      overflow: hidden;
      display: ${hasWallpaper ? 'block' : enabled ? 'block' : 'none'};
      background: ${
        hasWallpaper
          ? 'transparent'
          : isLight
            ? `linear-gradient(145deg, rgba(${overlayRgb}, 0.96), #e8e2c5)`
            : `radial-gradient(circle at 74% 32%, color-mix(in srgb, ${accent} 18%, transparent), transparent 58%), linear-gradient(160deg, rgba(${overlayRgb}, 0.98) 0%, #070910 100%)`
      };
    }

    #agy-ct-bg-image {
      position: absolute;
      inset: ${wpBlurPx > 0 ? '-16px' : '0'};
      background-image: ${hasWallpaper ? `url("${seSafeCssUrl(wallpaperUrl)}")` : 'none'};
      background-size: ${wpFit};
      background-position: ${wpPos};
      background-repeat: no-repeat;
      filter: ${wpBlurPx > 0 ? 'blur(var(--agy-ct-wp-blur))' : 'none'};
      transform: ${wpBlurPx > 0 ? 'scale(1.03)' : 'none'};
    }

    #agy-ct-bg-dim {
      position: absolute;
      inset: 0;
      display: ${hasWallpaper ? 'block' : 'none'};
      background: linear-gradient(180deg, rgba(${overlayRgb}, ${(dimAlpha * 0.78).toFixed(3)}) 0%, rgba(${overlayRgb}, ${dimAlpha.toFixed(3)}) 100%);
    }

    #agy-ct-ambient-canvas {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      z-index: 1;
      pointer-events: none;
      display: ${enabled && cfg.atmosphereId && cfg.atmosphereId !== 'none' ? 'block' : 'none'};
    }

    ${
      enabled
        ? `
      /* Zero Live Blur Architecture: never apply backdrop-filter blur to shell or scrollable regions */
      .agy-shell,
      .agy-shell .overflow-y-auto,
      .agy-shell [data-main-content-body],
      .agy-shell [data-side-panel-body],
      [data-agy-mock-shell] {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }

      .agy-shell,
      [data-agy-mock-shell] {
        position: relative !important;
        background: transparent !important;
        background-color: transparent !important;
        background-image: none !important;
        z-index: 2;
      }

      .agy-shell .agy-sheet,
      .agy-shell .agy-inset-shell,
      .agy-shell .browser-hole-opaque,
      .agy-shell [data-main-content-body="true"],
      .agy-shell [data-side-panel-body="true"],
      .agy-shell .bg-background:not(.settings-modal-container) {
        background: transparent !important;
      }
      .agy-shell .settings-modal-container .bg-background {
        background-color: #18181b !important;
      }

      /* Pre-baked L-shaped glass frame (Sidebar + Topbar) */
      .agy-shell::before,
      [data-agy-mock-shell]::before {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        background-color: rgba(${overlayRgb}, ${headerAlpha.toFixed(3)});
        background-image: var(--agy-l-glass-bg, none);
        background-size: ${wpFit};
        background-position: ${wpPos};
        background-repeat: no-repeat;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        clip-path: polygon(
          0 0,
          100% 0,
          100% var(--agy-hdr-h, 48px),
          var(--agy-sidebar-w, 240px) var(--agy-hdr-h, 48px),
          var(--agy-sidebar-w, 240px) 100%,
          0 100%
        );
      }

      .agy-shell > *,
      [data-agy-mock-shell] > * {
        position: relative;
        z-index: 2;
      }

      .agy-shell aside,
      .agy-shell [data-sidebar="true"],
      .agy-shell .bg-sidebar,
      [data-agy-mock-shell] .bg-sidebar {
        background: rgba(${overlayRgb}, ${(sidebarAlpha * 0.48).toFixed(3)}) !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }

      /* Eliminate stacked alpha bands and Monokai fade streaks */
      .agy-shell .bg-sidebar .bg-sidebar:not([style*="position: sticky"]) {
        background: transparent !important;
        background-color: transparent !important;
      }
      .agy-shell [data-testid="conversation-list-sidebar"] [style*="position: sticky"] {
        background: rgba(${overlayRgb}, ${Math.min(0.92, sidebarAlpha * 0.88).toFixed(3)}) !important;
      }
      .agy-shell .pointer-events-none.bottom-0[style*="linear-gradient"],
      .agy-shell .pointer-events-none[style*="var(--background)"],
      .agy-shell .pointer-events-none[style*="var(--shell-canvas)"],
      .agy-shell [data-testid="right-cluster-fade"],
      .agy-shell [class*="bg-[var(--shell-canvas)]"] {
        background: transparent !important;
      }
      .agy-shell .agy-sidebar-row[data-selected="true"],
      .agy-shell .agy-sidebar-row.bg-sidebar-secondary,
      .agy-shell .agy-sidebar-row:hover {
        background: color-mix(in srgb, ${accent} 14%, rgba(${overlayRgb}, ${Math.min(0.88, sidebarAlpha + 0.16).toFixed(3)})) !important;
      }
      html.agy-ct-active body.agy-ct-active .agy-shell :is(.agy-sidebar-row, [data-testid="conversation-row-history"]) .agy-row-actions,
      .agy-shell .agy-row-actions {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        padding-left: 4px !important;
        padding-right: 2px !important;
      }
      html.agy-ct-active body.agy-ct-active .agy-shell :is(.agy-sidebar-row, [data-testid="conversation-row-history"]) .agy-row-actions::before,
      .agy-shell .agy-row-actions::before {
        content: none !important;
        display: none !important;
        background: none !important;
      }
      .agy-shell :is(.agy-sidebar-row, [data-testid="conversation-row-history"]):is(:hover, :focus-within) .truncate:first-child {
        -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 78px), transparent calc(100% - 50px));
        mask-image: linear-gradient(to right, #000 calc(100% - 78px), transparent calc(100% - 50px));
      }
      html.agy-ct-active body.agy-ct-active .agy-shell .agy-status-overflow {
        background: color-mix(in srgb, ${accent} 14%, rgba(${overlayRgb}, 0.82)) !important;
        box-shadow: none !important;
      }
      html.agy-ct-active body.agy-ct-active .agy-inset-shell {
        --sash-line: ${accent} !important;
        --sash-glow: color-mix(in srgb, ${accent} 34%, transparent) !important;
        --card-edge: color-mix(in srgb, ${accent} 22%, ${isLight ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.12)'}) !important;
      }
      html.agy-ct-active body.agy-ct-active [data-split-panes] .agy-sheet[data-sheet-inset] :is([data-tiling-pane], [data-tiling-pane] > [data-pane-id]):not([data-has-browser-hole="true"]),
      html.agy-ct-active body[data-has-browser-hole="true"].agy-ct-active [data-split-panes] .agy-sheet[data-sheet-inset] :is([data-tiling-pane], [data-tiling-pane] > [data-pane-id]):not([data-has-browser-hole="true"]),
      html.agy-ct-active body[data-has-browser-hole="true"].agy-ct-active [data-split-panes] .agy-sheet[data-sheet-inset] [data-tiling-pane] > [data-pane-id] > :first-child {
        background: transparent !important;
      }
      html.agy-ct-active body.agy-ct-active [data-split-panes] .agy-sheet[data-sheet-inset] [data-tiling-pane]::after {
        box-shadow: none !important;
        background: none !important;
      }
      html.agy-ct-active body.agy-ct-active [data-split-panes] .agy-sheet[data-sheet-inset] [data-testid="tiling-splitter"] > [data-splitter-band] {
        background: transparent !important;
        background-color: transparent !important;
      }
      html.agy-ct-active body.agy-ct-active [data-split-panes] .agy-sheet[data-sheet-inset] [data-testid="tiling-splitter"][data-axis="horizontal"]::before {
        top: 0 !important;
        bottom: 0 !important;
        box-shadow: inset 1px 0 0 color-mix(in srgb, ${accent} 24%, ${isLight ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.12)'}) !important;
      }
      html.agy-ct-active body.agy-ct-active [data-split-panes] .agy-sheet[data-sheet-inset] [data-testid="tiling-splitter"][data-axis="vertical"]::before {
        left: 0 !important;
        right: 0 !important;
        top: 50% !important;
        height: 1px !important;
        box-shadow: inset 0 1px 0 color-mix(in srgb, ${accent} 24%, ${isLight ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.12)'}) !important;
      }
      html.agy-ct-active body.agy-ct-active [data-split-panes] .agy-sheet[data-sheet-inset] [data-testid="tiling-splitter"]::after {
        background-color: ${accent} !important;
        box-shadow: 0 0 10px color-mix(in srgb, ${accent} 42%, transparent) !important;
      }
      html.agy-ct-active body.agy-ct-active [data-testid="pane-titlebar-toolbar"][data-reveal-on-hover] {
        background: color-mix(in srgb, ${accent} 12%, rgba(${overlayRgb}, 0.88)) !important;
        border-radius: 8px !important;
      }
      html.agy-ct-active body.agy-ct-active [data-testid="pane-titlebar-toolbar"] > [aria-hidden="true"][style*="linear-gradient"] {
        background: none !important;
        background-image: none !important;
      }
      html.agy-ct-active body.agy-ct-active [data-split-panes] .agy-sheet[data-sheet-inset] [data-main-content-body] > [data-testid="bottom-terminal-panel"] {
        background-color: rgba(${overlayRgb}, ${codeAlpha.toFixed(3)}) !important;
      }
      .agy-shell [data-testid="worked-for-collapsible"] {
        background: transparent !important;
      }
      .agy-shell [data-testid="worked-for-collapsible"]:hover {
        background: color-mix(in srgb, ${accent} 12%, rgba(${overlayRgb}, 0.42)) !important;
      }
      .agy-shell [class*="group-hover/terminal-card"][style*="linear-gradient"] {
        background: rgba(${overlayRgb}, 0.9) !important;
        background-image: none !important;
        border-radius: 6px !important;
        padding-left: 6px !important;
      }

      .agy-shell [class*="@container/titlebar"],
      [data-agy-mock-shell] [data-agy-topbar] {
        background: rgba(${overlayRgb}, ${(headerAlpha * 0.45).toFixed(3)}) !important;
        border-bottom: 1px solid ${isLight ? 'rgba(15, 23, 42, 0.1)' : 'rgba(255, 255, 255, 0.08)'} !important;
        color: ${uiInk} !important;
        text-shadow: ${uiShadow};
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
      ${
        isLight
          ? `
        .agy-shell [class*="@container/titlebar"] :is(button, a, span, div, svg),
        [data-agy-mock-shell] [data-agy-topbar] > strong {
          color: ${uiInk} !important;
        }
      `
          : ''
      }

      /* Split-Browser hole cutout for wallpaper, glass, and canvas */
      body[data-has-browser-hole="true"] #agy-ct-bg-root,
      body[data-has-browser-hole="true"] #agy-ct-ambient-canvas {
        clip-path: var(--agy-hole-clip, none);
      }
      body[data-has-browser-hole="true"] .agy-shell[data-agy-hole-active="1"] > :not([data-has-browser-hole="true"]):not([data-browser-hole]:not([data-browser-hole="false"])):not(.settings-modal-container),
      body[data-has-browser-hole="true"] .agy-shell[data-agy-hole-active="1"] [data-browser-hole]:not([data-browser-hole="false"]) {
        background: transparent !important;
        background-color: transparent !important;
      }

      /* Reading scrim on AI responses & right side panel */
      .agy-shell [data-testid="agent-response"],
      [data-agy-mock-shell] [data-testid="agent-response"] {
        background: rgba(${overlayRgb}, ${aiCardAlpha.toFixed(3)}) !important;
        color: ${uiInk} !important;
        border: 1px solid ${isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.1)'} !important;
        border-radius: 12px !important;
        padding: 12px 16px !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
        contain: layout style paint;
      }

      .agy-shell [data-testid="agent-response"] pre,
      [data-agy-mock-shell] [data-testid="agent-response"] pre {
        background: rgba(${overlayRgb}, ${codeAlpha.toFixed(3)}) !important;
        border: 1px solid ${isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.1)'} !important;
        border-radius: 8px !important;
      }

      /* Markdown table horizontal scrolling fix */
      .agy-shell [data-testid="agent-response"] .md-table-scroll {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        scrollbar-width: auto !important;
      }
      .agy-shell [data-testid="agent-response"] .md-table-frame {
        width: fit-content !important;
        min-width: 100% !important;
        max-width: none !important;
      }

      ${
        isLight
          ? `
        .agy-shell .bg-sidebar :is(a, span, button, div, p, svg),
        .agy-shell [data-testid="conversation-list-sidebar"] :is(a, span, button, div, p, svg),
        .agy-shell .agy-sidebar-row,
        .agy-shell .agy-sidebar-row :is(span, div, svg),
        .agy-shell [data-main-content-body="true"],
        .agy-shell [data-side-panel-body="true"],
        .agy-shell [data-side-panel-body="true"] :is(h1, h2, h3, h4, h5, h6, p, li, span, div, code, pre, a, strong, em, td, th),
        .agy-shell [data-testid="agent-response"] :is(p, li, span, code, h1, h2, h3, h4, strong, td, th),
        .agy-shell .animate-shimmer-text {
          color: ${uiInk};
        }
        .agy-shell .bg-sidebar .text-muted-foreground,
        .agy-shell [data-testid="conversation-list-sidebar"] .text-muted-foreground,
        .agy-shell [data-side-panel-body="true"] .text-muted-foreground {
          color: ${uiMuted};
        }
        body:not([data-has-browser-hole="true"]) .agy-shell [data-side-panel-body="true"] {
          background-color: rgba(${overlayRgb}, ${Math.min(0.62, aiCardAlpha * 0.72).toFixed(3)}) !important;
        }
        .agy-shell .surface-composer [contenteditable="true"],
        .agy-shell .surface-composer :is(textarea, input) {
          color: ${uiInk} !important;
          caret-color: ${accent} !important;
        }
        .agy-shell .surface-composer :is(p.pointer-events-none, [data-placeholder]),
        .agy-shell .surface-composer :is(textarea, input)::placeholder {
          color: #475569 !important;
          opacity: 1 !important;
        }
      `
          : ''
      }

      /* High-contrast Composer top pills */
      .surface-composer [data-testid="project-selector-trigger"],
      .surface-composer [data-testid="branch-pill-trigger"],
      .surface-composer [aria-label="Select Environment"],
      [data-agy-mock-shell] [data-testid="project-selector-trigger"],
      [data-agy-mock-shell] [aria-label="Select Environment"] {
        background: ${pillBg} !important;
        color: ${pillText} !important;
        border: 1px solid ${pillBorder} !important;
        border-radius: 9999px !important;
      }
      .surface-composer [data-testid="project-selector-trigger"]:hover,
      .surface-composer [data-testid="branch-pill-trigger"]:hover,
      .surface-composer [aria-label="Select Environment"]:hover {
        background: ${pillHoverBg} !important;
        border-color: ${accent} !important;
      }

      /* Composer Footer Model & Permissions Pills */
      .agy-composer-footer [data-testid="model-selector-trigger"],
      .agy-composer-footer [data-testid="permissions-selector-trigger"],
      .agy-composer-footer button[aria-label="Add context"] {
        background: color-mix(in srgb, ${accent} 10%, ${pillBg}) !important;
        color: ${pillText} !important;
        border: 1px solid color-mix(in srgb, ${accent} 26%, ${pillBorder}) !important;
        border-radius: 9999px !important;
        transition: background 140ms ease, border-color 140ms ease, box-shadow 140ms ease !important;
      }
      .agy-composer-footer [data-testid="model-selector-trigger"]:is(:hover, [aria-expanded="true"], [data-popup-open]),
      .agy-composer-footer [data-testid="permissions-selector-trigger"]:is(:hover, [aria-expanded="true"], [data-popup-open]),
      .agy-composer-footer button[aria-label="Add context"]:is(:hover, [aria-expanded="true"], [data-popup-open]) {
        background: color-mix(in srgb, ${accent} 20%, ${pillHoverBg}) !important;
        border-color: color-mix(in srgb, ${accent} 68%, transparent) !important;
        box-shadow: 0 0 12px color-mix(in srgb, ${accent} 22%, transparent) !important;
        color: ${uiInk} !important;
      }

      /* Portaled Model Selector, Slash Mention Menus & Overview Panel Cards (Zero Live Blur) */
      html.agy-ct-active body.agy-ct-active :is(
        .agy-overlay,
        .agy-overlay.surface-glass,
        .agy-fastpick.surface-glass,
        .quick-input-widget.surface-glass,
        [data-mention-menu],
        [role="listbox"].bg-card,
        .animate-overview-panel,
        [data-testid="overview-panel-host-overlay"],
        [data-testid="overview-panel-host-gutter"],
        [data-testid="overview-panel-host-sibling"],
        [data-base-ui-portal] div:has(> [data-testid="battle-overview-dropdown"])
      ) {
        background: ${
          isLight
            ? `linear-gradient(160deg, color-mix(in srgb, ${accent} 8%, rgba(255, 255, 255, 0.97)) 0%, rgba(${overlayRgb}, 0.98) 100%)`
            : `linear-gradient(160deg, color-mix(in srgb, ${accent} 11%, rgba(${overlayRgb}, 0.96)) 0%, rgba(${overlayRgb}, 0.985) 100%)`
        } !important;
        color: ${uiInk} !important;
        border: 1px solid color-mix(in srgb, ${accent} 34%, ${isLight ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.14)'}) !important;
        border-radius: 12px !important;
        box-shadow:
          inset 0 1px 0 ${isLight ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.1)'},
          0 18px 42px -10px rgba(0, 0, 0, ${isLight ? '0.18' : '0.72'}),
          0 0 24px color-mix(in srgb, ${accent} 14%, transparent) !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
      html.agy-ct-active body.agy-ct-active :is(
        .animate-overview-panel,
        [data-testid="overview-panel-host-overlay"],
        [data-testid="overview-panel-host-gutter"],
        [data-testid="overview-panel-host-sibling"]
      ) {
        contain: style;
      }
      body.agy-ct-active .agy-overlay [data-testid="model-selector-header"] {
        color: color-mix(in srgb, ${accent} 70%, ${uiMuted}) !important;
        font-weight: 600 !important;
        letter-spacing: 0.02em !important;
      }
      body.agy-ct-active :is(.agy-overlay, [data-mention-menu], [role="listbox"].bg-card) :is(.text-foreground, .text-card-foreground, .text-popover-foreground) {
        color: ${uiInk} !important;
      }
      body.agy-ct-active :is(.agy-overlay, [data-mention-menu], [role="listbox"].bg-card) :is(.text-secondary-foreground, .text-muted-foreground) {
        color: ${uiMuted} !important;
      }
      body.agy-ct-active :is([data-mention-menu], [role="listbox"].bg-card) :is([role="option"], [aria-selected="true"], [data-selected="true"]):is(:hover, [aria-selected="true"], [data-selected="true"]) {
        background: color-mix(in srgb, ${accent} 18%, ${isLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.06)'}) !important;
        color: ${uiInk} !important;
      }
      body.agy-ct-active .agy-overlay .from-card {
        background: none !important;
        background-image: none !important;
      }
      body.agy-ct-active .agy-overlay :is(.bg-border, [role="separator"]) {
        background-color: color-mix(in srgb, ${accent} 22%, ${isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.08)'}) !important;
      }
      body.agy-ct-active .agy-overlay .agy-overlay-item {
        color: ${uiMuted} !important;
        border-radius: 8px !important;
        transition: background 120ms ease, color 120ms ease !important;
      }
      body.agy-ct-active .agy-overlay .agy-overlay-item:is(:hover, [data-highlighted], :focus-visible) {
        background: color-mix(in srgb, ${accent} 18%, ${isLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.06)'}) !important;
        color: ${uiInk} !important;
        box-shadow: inset 0 0 0 1px color-mix(in srgb, ${accent} 28%, transparent) !important;
      }
      body.agy-ct-active [data-testid="model-selector-panel"] .agy-overlay-item.text-foreground,
      body.agy-ct-active .agy-overlay .agy-overlay-item:is([aria-checked="true"], [data-checked]) {
        background: color-mix(in srgb, ${accent} 12%, transparent) !important;
        color: ${uiInk} !important;
      }
      body.agy-ct-active [data-testid="model-selector-panel"] .agy-overlay-item.text-foreground > svg:last-child,
      body.agy-ct-active .agy-overlay .agy-overlay-item:is([aria-checked="true"], [data-checked]) svg {
        color: ${accent} !important;
      }
      body.agy-ct-active .agy-overlay .agy-overlay-item .bg-secondary.rounded-full {
        background: color-mix(in srgb, ${accent} 18%, ${isLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.06)'}) !important;
        border: 1px solid color-mix(in srgb, ${accent} 34%, transparent) !important;
        color: ${isLight ? uiInk : `color-mix(in srgb, ${accent} 78%, #ffffff)`} !important;
        opacity: 1 !important;
        font-size: 11px !important;
        line-height: 1.35 !important;
        padding: 1px 7px !important;
      }
      body.agy-ct-active .agy-overlay .bg-secondary:not(.rounded-full) {
        background: color-mix(in srgb, ${accent} 10%, rgba(${overlayRgb}, 0.65)) !important;
        border: 1px solid color-mix(in srgb, ${accent} 22%, transparent) !important;
      }
      body.agy-ct-active .reactTooltipComponentdark {
        background: rgba(${overlayRgb}, 0.96) !important;
        color: ${uiInk} !important;
        border: 1px solid color-mix(in srgb, ${accent} 30%, rgba(255, 255, 255, 0.14)) !important;
        border-radius: 8px !important;
      }

      /* Right-Side Overview Panel Inner Rows */
      body.agy-ct-active [data-testid="overview-panel"] :is(.border-border, .divide-border > :not([hidden]) ~ :not([hidden])) {
        border-color: color-mix(in srgb, ${accent} 22%, ${isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.08)'}) !important;
      }
      body.agy-ct-active [data-testid="overview-panel"] .agy-hover-label.opacity-50 {
        color: color-mix(in srgb, ${accent} 70%, ${uiMuted}) !important;
        opacity: 0.92 !important;
        font-weight: 600 !important;
        letter-spacing: 0.015em !important;
      }
      body.agy-ct-active [data-testid="overview-panel"] button.group:has(.agy-hover-label.opacity-50):is(:hover, :focus-visible) {
        background: color-mix(in srgb, ${accent} 12%, transparent) !important;
        color: ${uiInk} !important;
      }
      body.agy-ct-active [data-testid="overview-panel"] button.group:has(.agy-hover-label.opacity-50):is(:hover, :focus-visible) .agy-hover-label.opacity-50 {
        color: ${uiInk} !important;
        opacity: 1 !important;
      }
      body.agy-ct-active [data-testid="overview-panel"] .rounded-full:is(.bg-border, .bg-muted, .bg-secondary) {
        background: color-mix(in srgb, ${accent} 18%, ${isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.06)'}) !important;
        border: 1px solid color-mix(in srgb, ${accent} 36%, transparent) !important;
        color: ${isLight ? uiInk : `color-mix(in srgb, ${accent} 80%, #ffffff)`} !important;
        opacity: 1 !important;
      }
      body.agy-ct-active [data-testid="overview-panel-customize-trigger"] {
        color: ${uiMuted} !important;
        border-radius: 6px !important;
      }
      body.agy-ct-active [data-testid="overview-panel-customize-trigger"]:is(:hover, :focus-visible, [aria-expanded="true"], [data-popup-open]),
      body.agy-ct-active .agy-shell [data-testid="toggle-overview-panel"]:is(:hover, [aria-expanded="true"], [data-popup-open], .bg-secondary) {
        background: color-mix(in srgb, ${accent} 18%, transparent) !important;
        color: ${uiInk} !important;
      }
      body.agy-ct-active [data-testid="overview-panel"] :is(.agy-hover-row, [data-testid^="overview-panel-row-"]) {
        color: ${uiMuted} !important;
        border-radius: 8px !important;
        transition: background 120ms ease, color 120ms ease, box-shadow 120ms ease !important;
      }
      body.agy-ct-active [data-testid="overview-panel"] :is(.agy-hover-row, [data-testid^="overview-panel-row-"]) :is(svg, .google-symbols, .material-symbols-outlined) {
        color: color-mix(in srgb, ${accent} 36%, ${uiMuted}) !important;
        transition: color 120ms ease !important;
      }
      body.agy-ct-active [data-testid="overview-panel"] :is(.agy-hover-row, [data-testid^="overview-panel-row-"]):is(:hover, :focus-visible, :focus-within, [data-popup-open], [aria-expanded="true"]) {
        background: color-mix(in srgb, ${accent} 18%, ${isLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.06)'}) !important;
        color: ${uiInk} !important;
        box-shadow: inset 0 0 0 1px color-mix(in srgb, ${accent} 28%, transparent) !important;
      }
      body.agy-ct-active [data-testid="overview-panel"] :is(.agy-hover-row, [data-testid^="overview-panel-row-"]):is(:hover, :focus-visible, :focus-within, [data-popup-open], [aria-expanded="true"]) :is(svg, .google-symbols, .material-symbols-outlined) {
        color: ${accent} !important;
      }
      body.agy-ct-active [data-testid="overview-panel"] :is(.agy-hover-row, [data-testid^="overview-panel-row-"]).bg-secondary {
        background: color-mix(in srgb, ${accent} 14%, transparent) !important;
        color: ${uiInk} !important;
      }
      body.agy-ct-active [data-testid="overview-panel"] .agy-hover-actions button:is(:hover, :focus-visible) {
        background: color-mix(in srgb, ${accent} 22%, transparent) !important;
        color: ${uiInk} !important;
      }
    `
        : ''
    }

    ${
      enabled && cfg.bubbleId !== 'none'
        ? `
      .agy-ct-bubble-styled {
        position: relative !important;
        background: ${bubble.bg} !important;
        border: ${bubble.border} !important;
        color: ${bubble.text} !important;
        box-shadow: ${bubble.shadow} !important;
        border-radius: ${bubble.radius} !important;
        overflow: visible !important;
      }
      .agy-ct-bubble-styled > .agy-user-bubble,
      .agy-ct-bubble-styled [data-testid="user-message-bubble"] {
        background: transparent !important;
        background-color: transparent !important;
        background-image: none !important;
        border: none !important;
        box-shadow: none !important;
      }
      .agy-ct-bubble-styled :is(p, span, div, code, pre, a, strong, em) {
        color: inherit;
      }
      ${scrollCapCss}
      ${cornerOrnamentCss}
      ${cyberCornerCss}

      .agy-ct-bubble-mascot {
        position: absolute;
        pointer-events: none;
        z-index: 6;
      }
      .agy-ct-bubble-mascot--right-top {
        top: -32px;
        right: 12px;
        width: 54px;
        height: 44px;
      }
    `
        : ''
    }

    ${
      enabled && cfg.inputId !== 'none'
        ? `
      .agy-ct-input-styled {
        position: relative !important;
        background: ${inputPreset.bg} !important;
        border: ${inputPreset.border} !important;
        box-shadow: ${inputPreset.shadow} !important;
        border-radius: ${inputPreset.radius} !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
      .agy-ct-input-styled > .surface-composer-card,
      .agy-ct-input-styled .surface-composer-card {
        background: transparent !important;
        background-color: transparent !important;
        background-image: none !important;
      }
      .agy-ct-input-styled:focus-within {
        border-color: ${inputPreset.focusBorder} !important;
      }
    `
        : ''
    }

    ${avatarCss}

    .agy-ct-pet-speech {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      --speech-tx: -50%;
      transform: translate(var(--speech-tx, -50%), 4px);
      background: ${isLight ? '#fffbeb' : '#14161f'};
      color: ${isLight ? '#0f172a' : '#f8fafc'};
      border: 1px solid var(--agy-ct-accent);
      border-radius: 8px;
      padding: 5px 9px;
      font-size: 12px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease, transform 0.2s ease;
      ${isLight ? 'box-shadow: 0 4px 14px rgba(15, 23, 42, 0.14);' : ''}
    }
    #agy-ct-launcher {
      position: fixed;
      ${launcherPosCss}
      z-index: 9980;
      display: ${cfg.launcherPill?.enabled === false ? 'none' : 'inline-flex'};
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      background: ${isLight ? '#fffbeb' : '#181a24'};
      color: ${isLight ? '#0f172a' : '#f4f4f5'};
      border: 1px solid ${isLight ? 'rgba(15, 23, 42, 0.18)' : 'rgba(255, 255, 255, 0.16)'};
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      ${isLight ? 'box-shadow: 0 2px 10px rgba(15, 23, 42, 0.12);' : ''}
    }
    #agy-ct-launcher:hover { border-color: var(--agy-ct-accent); }
    ${
      launcherCorner !== 'top-right'
        ? `
      body[data-agy-split-active="1"] #agy-ct-launcher {
        bottom: 112px;
      }
    `
        : ''
    }
  `);

  const fullCss = `${dynamicCss}\n${SE_STATIC_CSS}`;
  return customUserCss ? `${fullCss}\n${customUserCss.trim()}` : fullCss;
}

export class SurfaceEngine {
  constructor({
    getConfig,
    getCustomMedia,
    onCustomNavClick,
    onNativeNavClick,
    onConfigPatch,
    onHoleChange,
    onSplitChange,
    onDomMutate,
    studioElement
  }) {
    this.getConfig = getConfig;
    this.getCustomMedia = getCustomMedia;
    this.onCustomNavClick = onCustomNavClick;
    this.onNativeNavClick = onNativeNavClick;
    this.onConfigPatch = onConfigPatch;
    this.onHoleChange = onHoleChange;
    this.onSplitChange = onSplitChange;
    this.onDomMutate = onDomMutate;
    this.studioElement = studioElement || null;

    this.observer = null;
    this.resizeObserver = null;
    this.observedHoleEl = null;
    this.rafId = 0;
    this.pendingHoleSync = false;
    this.lastCssText = '';
    this.isCustomSettingsOpen = false;
    this.activeContentPane = null;
    this.injectedNavBtn = null;
    this.boundNativeItems = new WeakSet();
    this.pickerCleanup = null;
    this.lastSplitCount = 1;
    this.lastShellEl = null;
    this.lastSidebarW = -1;
    this.lastHdrH = -1;
    this.lastHoleAppliedKey = '';
    this.lastSplitActive = null;
    this.holeState = { active: false, clipPath: 'none', holeRect: null };
  }

  setStudioElement(el) {
    this.studioElement = el;
  }

  mount() {
    this.ensureBackgroundLayers();
    this.scanAndDecorate();

    const hasHoleNode = (node) =>
      Boolean(
        node &&
          node.nodeType === 1 &&
          (node.hasAttribute?.('data-browser-hole') || node.querySelector?.('[data-browser-hole]'))
      );

    const scheduleScan = (records) => {
      if (Array.isArray(records) && records.length > 0) {
        const allInjected = records.every((r) => r.target?.closest?.('[data-agy-ct-injected="true"]'));
        if (allInjected) return;
        const allInsideStreaming = records.every(
          (r) =>
            r.type === 'childList' &&
            Boolean(
              r.target?.closest?.(
                '[data-testid="agent-response"], [data-testid="tool-group-collapsible"], [data-testid="worked-for-collapsible"], [data-testid="overview-panel"], [data-side-panel-body="true"], [data-mention-menu], .agy-overlay, .monaco-editor, .xterm'
              )
            )
        );
        if (allInsideStreaming) return;
        for (const r of records) {
          if (r.type === 'attributes') {
            this.pendingHoleSync = true;
            break;
          }
          for (const n of r.addedNodes || []) {
            if (hasHoleNode(n)) {
              this.pendingHoleSync = true;
              break;
            }
          }
          if (this.pendingHoleSync) break;
          for (const n of r.removedNodes || []) {
            if (hasHoleNode(n)) {
              this.pendingHoleSync = true;
              break;
            }
          }
          if (this.pendingHoleSync) break;
        }
      } else {
        this.pendingHoleSync = true;
      }

      if (this.rafId) return;
      this.rafId = requestAnimationFrame(() => {
        this.rafId = 0;
        const syncHole = this.pendingHoleSync;
        this.pendingHoleSync = false;
        this.scanAndDecorate({ syncHole });
        this.onDomMutate?.();
      });
    };

    this.onWindowResize = () => scheduleScan();
    this.onWindowBlur = () => document.documentElement?.classList?.add?.('agy-ct-idle-paused');
    this.onWindowFocus = () => {
      if (!document.hidden) {
        document.documentElement?.classList?.remove?.('agy-ct-idle-paused');
      }
    };
    this.onVisibilityChange = () => {
      document.documentElement?.classList?.toggle?.('agy-ct-idle-paused', Boolean(document.hidden));
    };

    window.addEventListener?.('resize', this.onWindowResize, { passive: true });
    window.addEventListener?.('blur', this.onWindowBlur);
    window.addEventListener?.('focus', this.onWindowFocus);
    document.addEventListener?.('visibilitychange', this.onVisibilityChange);
    this.observer = new MutationObserver(scheduleScan);
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-has-browser-hole', 'data-browser-hole', 'data-split-panes']
    });
  }

  ensureBackgroundLayers() {
    let canvas = document.getElementById('agy-ct-ambient-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'agy-ct-ambient-canvas';
      canvas.setAttribute('data-agy-ct-injected', 'true');
      document.body.prepend(canvas);
    }
    let root = document.getElementById('agy-ct-bg-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'agy-ct-bg-root';
      root.setAttribute('data-agy-ct-injected', 'true');
      const img = document.createElement('div');
      img.id = 'agy-ct-bg-image';
      const dim = document.createElement('div');
      dim.id = 'agy-ct-bg-dim';
      root.appendChild(img);
      root.appendChild(dim);
      document.body.prepend(root);
    }
    return { root, canvas };
  }

  apply(config, customMedia = {}, { skipPrebake = false } = {}) {
    let styleEl = document.getElementById(SE_STYLE_ID);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = SE_STYLE_ID;
      document.head.appendChild(styleEl);
    }
    const nextCss = buildStylesheet(config, customMedia);
    if (nextCss !== this.lastCssText) {
      this.lastCssText = nextCss;
      styleEl.textContent = nextCss;
    }

    if (config.enabled) {
      document.documentElement.classList.add('agy-ct-active');
      document.body.classList.add('agy-ct-active');
    } else {
      document.documentElement.classList.remove('agy-ct-active');
      document.body.classList.remove('agy-ct-active');
    }

    const shell = dtFindShellElement(config);
    if (!skipPrebake) {
      void syncPrebakedGlass(shell, config, customMedia);
    }
    this.syncTitleBarOverlay(config);
    this.scanAndDecorate({ syncHole: true });
  }

  syncTitleBarOverlay(config) {
    const api = typeof window !== 'undefined' ? window.electronNative : null;
    if (!api || typeof api.setTitleBarOverlay !== 'function') return;
    try {
      api.setTitleBarOverlay({
        color: config.enabled ? '#00000000' : '#111114',
        symbolColor: config.enabled && config.isLight ? '#0f172a' : '#f8fafc'
      });
    } catch {
      // Ignore native titlebar failures
    }
  }

  syncShellAndHoleMetrics(config) {
    const shell = dtFindShellElement(config);
    if (!shell) return;
    const shellSwapped = shell !== this.lastShellEl;
    if (shellSwapped) {
      this.lastShellEl = shell;
      this.lastSidebarW = -1;
      this.lastHdrH = -1;
      this.lastHoleAppliedKey = '';
    }

    const split = shell.querySelector('[data-testid="sidebar-split"]');
    const sidebar = split ? split.firstElementChild : shell.querySelector('aside, [data-sidebar="true"], .bg-sidebar');
    const titleBar = shell.querySelector('[class*="@container/titlebar"], [data-agy-topbar]');
    const shellRect = shell.getBoundingClientRect();
    const sw = sidebar ? Math.round(sidebar.getBoundingClientRect().width) : 0;
    const hdrH = Math.max(0, titleBar ? Math.round(titleBar.getBoundingClientRect().bottom - shellRect.top) : 44);

    if (sw !== this.lastSidebarW) {
      this.lastSidebarW = sw;
      shell.style.setProperty('--agy-sidebar-w', `${sw}px`);
    }
    if (hdrH !== this.lastHdrH) {
      this.lastHdrH = hdrH;
      shell.style.setProperty('--agy-hdr-h', `${hdrH}px`);
    }

    const prevHoleKey = `${Boolean(this.holeState?.active)}:${this.holeState?.clipPath || 'none'}`;
    const hasHole = document.body.getAttribute('data-has-browser-hole') === 'true';
    const holeEl = hasHole ? shell.querySelector('[data-browser-hole]:not([data-browser-hole="false"])') : null;
    const nextHole = computeBrowserHoleClip(shellRect, holeEl ? holeEl.getBoundingClientRect() : null, hasHole);
    this.holeState = nextHole;
    const nextHoleKey = `${Boolean(nextHole.active)}:${nextHole.clipPath || 'none'}`;

    if (nextHoleKey !== this.lastHoleAppliedKey) {
      this.lastHoleAppliedKey = nextHoleKey;
      const bgRoot = document.getElementById('agy-ct-bg-root');
      const ambientCanvas = document.getElementById('agy-ct-ambient-canvas');

      if (nextHole.active) {
        shell.setAttribute('data-agy-hole-active', '1');
        shell.style.setProperty('--agy-hole-clip', nextHole.clipPath);
        document.documentElement.style.setProperty('--agy-hole-clip', nextHole.clipPath);
        if (bgRoot) bgRoot.style.clipPath = nextHole.clipPath;
        if (ambientCanvas) ambientCanvas.style.clipPath = nextHole.clipPath;
      } else {
        shell.removeAttribute('data-agy-hole-active');
        shell.style.removeProperty('--agy-hole-clip');
        document.documentElement.style.removeProperty('--agy-hole-clip');
        if (bgRoot) bgRoot.style.clipPath = 'none';
        if (ambientCanvas) ambientCanvas.style.clipPath = 'none';
      }
    }

    if (!this.resizeObserver && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.syncShellAndHoleMetrics(this.getConfig()));
      this.resizeObserver.observe(shell);
      if (sidebar) this.resizeObserver.observe(sidebar);
    }
    if (this.resizeObserver && holeEl !== this.observedHoleEl) {
      if (this.observedHoleEl) {
        this.resizeObserver.unobserve?.(this.observedHoleEl);
      }
      this.observedHoleEl = holeEl || null;
      if (this.observedHoleEl) {
        this.resizeObserver.observe(this.observedHoleEl);
      }
    }

    if (nextHoleKey !== prevHoleKey) {
      this.onHoleChange?.(nextHole);
    }

    const isSplit = Boolean(document.querySelector?.('[data-split-panes]'));
    const rawPanes = isSplit ? (document.querySelectorAll?.('[data-tiling-pane]')?.length || 2) : 1;
    const nextSplitCount = isSplit ? Math.max(2, rawPanes) : 1;
    if (isSplit !== this.lastSplitActive) {
      this.lastSplitActive = isSplit;
      if (isSplit) {
        document.body?.setAttribute?.('data-agy-split-active', '1');
      } else {
        document.body?.removeAttribute?.('data-agy-split-active');
      }
    }
    if (nextSplitCount !== this.lastSplitCount) {
      this.lastSplitCount = nextSplitCount;
      this.onSplitChange?.(nextSplitCount);
    }
  }

  getHoleState() {
    return this.holeState;
  }

  scanAndDecorate({ syncHole = true } = {}) {
    const cfg = this.getConfig();
    if (syncHole) {
      this.syncShellAndHoleMetrics(cfg);
    }
    this.ensureSettingsEntry(cfg);

    if (!cfg.enabled) {
      document.querySelectorAll('.agy-ct-bubble-styled').forEach((el) => el.classList.remove('agy-ct-bubble-styled'));
      document.querySelectorAll('.agy-ct-bubble-mascot').forEach((el) => el.remove());
      document.querySelectorAll('.agy-ct-input-styled').forEach((el) => el.classList.remove('agy-ct-input-styled'));
      return;
    }

    this.decorateChatBubbles(cfg);
    this.decorateChatInput(cfg);
  }

  decorateChatBubbles(cfg) {
    if (cfg.bubbleId === 'none') {
      document.querySelectorAll('.agy-ct-bubble-styled').forEach((el) => {
        el.classList.remove('agy-ct-bubble-styled');
        el.querySelector(':scope > .agy-ct-bubble-mascot')?.remove();
      });
      return;
    }

    const preset = BUBBLE_PRESETS.find((b) => b.id === cfg.bubbleId) || BUBBLE_PRESETS[0];
    const bubbles = dtFindChatBubbles(cfg);
    const bubbleSet = new Set(bubbles);

    document.querySelectorAll('.agy-ct-bubble-styled').forEach((el) => {
      if (!bubbleSet.has(el)) {
        el.classList.remove('agy-ct-bubble-styled');
        el.querySelector(':scope > .agy-ct-bubble-mascot')?.remove();
      }
    });

    for (const el of bubbles) {
      el.classList.add('agy-ct-bubble-styled');
      let mascotHost = el.querySelector(':scope > .agy-ct-bubble-mascot');
      if (cfg.bubbleMascotEnabled && preset.mascotId) {
        const key = `${preset.id}:${preset.mascotId}`;
        if (!mascotHost) {
          mascotHost = document.createElement('div');
          mascotHost.setAttribute('data-agy-ct-injected', 'true');
          el.appendChild(mascotHost);
        }
        if (mascotHost.dataset.mascotKey !== key) {
          mascotHost.dataset.mascotKey = key;
          mascotHost.className = `agy-ct-bubble-mascot agy-ct-bubble-mascot--${preset.mascotAlign || 'right-top'}`;
          mascotHost.innerHTML = renderMascotSvg(preset.mascotId, 'bubble');
        }
      } else if (mascotHost) {
        mascotHost.remove();
      }
    }
  }

  decorateChatInput(cfg) {
    const inputs = dtFindChatInputContainers(cfg);
    if (cfg.inputId === 'none') {
      document.querySelectorAll('.agy-ct-input-styled').forEach((el) => el.classList.remove('agy-ct-input-styled'));
      return null;
    }
    const inputSet = new Set(inputs);
    document.querySelectorAll('.agy-ct-input-styled').forEach((el) => {
      if (!inputSet.has(el)) el.classList.remove('agy-ct-input-styled');
    });
    for (const box of inputs) {
      box.classList.add('agy-ct-input-styled');
    }
    return inputs[0] || null;
  }

  ensureSettingsEntry(cfg) {
    const ctx = dtFindSettingsContext(cfg);
    if (!ctx || !ctx.navList) return;
    const { navList, contentPane } = ctx;
    this.activeContentPane = contentPane;

    const navItems = Array.from(navList.children).filter(
      (el) => el.getAttribute('data-agy-ct-injected') !== 'true'
    );
    for (const item of navItems) {
      if (dtIsSettingsLabel(item.textContent) && !this.boundNativeItems.has(item)) {
        this.boundNativeItems.add(item);
        item.addEventListener('click', () => {
          this.setCustomSettingsOpen(false);
          this.onNativeNavClick?.();
        });
      }
    }

    let customBtn = navList.querySelector('[data-agy-ct-nav="custom-theme"]');
    if (!customBtn) {
      const appearanceEl = navItems.find((el) => {
        const txt = (el.textContent || '').trim().toLowerCase();
        return txt === 'appearance' || txt === 'giao diện';
      });
      const templateEl = appearanceEl || navItems[0];

      customBtn = document.createElement(templateEl?.tagName === 'LI' ? 'li' : 'button');
      if (customBtn.tagName === 'BUTTON') customBtn.type = 'button';
      customBtn.setAttribute('data-agy-ct-injected', 'true');
      customBtn.setAttribute('data-agy-ct-nav', 'custom-theme');
      customBtn.className = templateEl?.className
        ? `${templateEl.className} agy-ct-nav-item`.replace(/\b(active|is-active|selected)\b/g, '').trim()
        : 'agy-ct-nav-item';

      const label = document.createElement('span');
      label.textContent = 'Custom theme';
      customBtn.appendChild(label);

      customBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setCustomSettingsOpen(true);
        this.onCustomNavClick?.();
      });

      if (appearanceEl && appearanceEl.nextSibling) {
        navList.insertBefore(customBtn, appearanceEl.nextSibling);
      } else {
        navList.appendChild(customBtn);
      }
      this.injectedNavBtn = customBtn;
    }

    if (contentPane && this.studioElement && this.studioElement.parentElement !== contentPane) {
      contentPane.appendChild(this.studioElement);
    }
    if (this.isCustomSettingsOpen) {
      this.syncSettingsPaneVisibility();
    }
  }

  setCustomSettingsOpen(open) {
    this.isCustomSettingsOpen = Boolean(open);
    this.syncSettingsPaneVisibility();
  }

  syncSettingsPaneVisibility() {
    if (!this.activeContentPane || !this.studioElement) return;
    const nativeChildren = Array.from(this.activeContentPane.children).filter((ch) => ch !== this.studioElement);
    if (this.isCustomSettingsOpen) {
      nativeChildren.forEach((ch) => ch.classList.add('agy-ct-hidden-native'));
      this.studioElement.classList.add('is-open');
      this.injectedNavBtn?.classList.add('is-active');
    } else {
      nativeChildren.forEach((ch) => ch.classList.remove('agy-ct-hidden-native'));
      this.studioElement.classList.remove('is-open');
      this.injectedNavBtn?.classList.remove('is-active');
    }
  }

  startVisualPicker(targetKey, labelText, onPicked) {
    this.cancelPicker();
    const banner = document.createElement('div');
    banner.id = 'agy-ct-picker-banner';
    banner.setAttribute('data-agy-ct-injected', 'true');
    const txt = document.createElement('span');
    txt.textContent = `🎯 Click element for "${labelText}" (Esc to cancel)`;
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'agy-ct-btn';
    cancelBtn.textContent = 'Cancel';
    banner.append(txt, cancelBtn);
    document.body.appendChild(banner);

    let lastHover = null;
    const onMove = (e) => {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (lastHover && lastHover !== target) lastHover.classList.remove('agy-ct-picker-hover');
      if (target && !dtIsInsideInjectorUi(target)) {
        lastHover = target;
        target.classList.add('agy-ct-picker-hover');
      }
    };
    const onClick = (e) => {
      const target = e.target;
      if (target?.closest?.('#agy-ct-picker-banner')) return;
      e.preventDefault();
      e.stopPropagation();
      if (target && !dtIsInsideInjectorUi(target)) {
        const selector = dtBuildSelectorPath(target);
        this.onConfigPatch?.({ customSelectors: { [targetKey]: selector } });
        onPicked?.(targetKey, selector);
      }
      this.cancelPicker();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') this.cancelPicker();
    };

    cancelBtn.addEventListener('click', () => this.cancelPicker());
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);

    this.pickerCleanup = () => {
      lastHover?.classList.remove('agy-ct-picker-hover');
      banner.remove();
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }

  cancelPicker() {
    if (this.pickerCleanup) {
      this.pickerCleanup();
      this.pickerCleanup = null;
    }
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.onWindowResize) window.removeEventListener?.('resize', this.onWindowResize);
    if (this.onWindowBlur) window.removeEventListener?.('blur', this.onWindowBlur);
    if (this.onWindowFocus) window.removeEventListener?.('focus', this.onWindowFocus);
    if (this.onVisibilityChange) document.removeEventListener?.('visibilitychange', this.onVisibilityChange);
    document.documentElement?.classList?.remove?.('agy-ct-idle-paused');
    this.observer?.disconnect();
    this.observer = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.observedHoleEl = null;
    this.cancelPicker();
    this.lastCssText = '';

    document.getElementById(SE_STYLE_ID)?.remove();
    document.getElementById('agy-ct-bg-root')?.remove();
    document.getElementById('agy-ct-ambient-canvas')?.remove();
    document.querySelectorAll('[data-agy-ct-injected="true"]').forEach((el) => el.remove());
    document.querySelectorAll('.agy-ct-bubble-styled, .agy-ct-input-styled, .agy-ct-hidden-native').forEach((el) => {
      el.classList.remove('agy-ct-bubble-styled', 'agy-ct-input-styled', 'agy-ct-hidden-native');
    });
    const shell = dtFindShellElement(this.getConfig?.());
    if (shell) {
      shell.removeAttribute('data-agy-hole-active');
      shell.style.removeProperty('--agy-hole-clip');
      shell.style.removeProperty('--agy-l-glass-bg');
      shell.style.removeProperty('--agy-sidebar-w');
      shell.style.removeProperty('--agy-hdr-h');
    }
    document.documentElement.classList.remove('agy-ct-active');
    document.body.classList.remove('agy-ct-active');
    document.body?.removeAttribute?.('data-agy-split-active');
    this.lastSplitCount = 1;
    this.lastShellEl = null;
    this.lastSidebarW = -1;
    this.lastHdrH = -1;
    this.lastHoleAppliedKey = '';
    this.lastSplitActive = null;
    document.documentElement.style.removeProperty('--agy-hole-clip');

    const api = typeof window !== 'undefined' ? window.electronNative : null;
    if (api && typeof api.setTitleBarOverlay === 'function') {
      try {
        api.setTitleBarOverlay({ color: '#111114', symbolColor: '#f8fafc' });
      } catch {
        // Ignore
      }
    }
  }
}
