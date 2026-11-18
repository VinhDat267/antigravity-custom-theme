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

function seSafeCssUrl(url) {
  return String(url || '').replace(/"/g, '\\"').replace(/[\r\n]/g, '');
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

  const wpPos = cfg.wallpaperPos || 'center center';
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

  return `
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

      .agy-shell .overflow-y-auto {
        will-change: scroll-position;
      }

      .agy-shell .agy-sheet,
      .agy-shell .agy-inset-shell,
      .agy-shell .browser-hole-opaque,
      .agy-shell [data-main-content-body="true"],
      .agy-shell [data-side-panel-body="true"],
      .agy-shell .bg-background:not(.settings-modal-container):not(.settings-modal-container *):not(#agy-ct-settings-panel *) {
        background: transparent !important;
        background-color: transparent !important;
        background-image: none !important;
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

      .agy-shell [class*="@container/titlebar"],
      [data-agy-mock-shell] [data-agy-topbar] {
        background: rgba(${overlayRgb}, ${(headerAlpha * 0.45).toFixed(3)}) !important;
        border-bottom: 1px solid ${isLight ? 'rgba(15, 23, 42, 0.1)' : 'rgba(255, 255, 255, 0.08)'} !important;
        color: ${uiInk} !important;
        text-shadow: ${uiShadow};
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
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
        .agy-shell .bg-sidebar a,
        .agy-shell .bg-sidebar span,
        .agy-shell .bg-sidebar button,
        .agy-shell [data-main-content-body="true"],
        .agy-shell [data-testid="agent-response"] :is(p, li, span, code, h1, h2, h3, h4, strong, td, th) {
          color: ${uiInk};
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
      .agy-ct-bubble-styled * {
        color: inherit;
      }
      ${scrollCapCss}
      ${cornerOrnamentCss}
      ${cyberCornerCss}

      .agy-ct-bubble-mascot {
        position: absolute;
        pointer-events: none;
        z-index: 6;
        filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.45));
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
      .agy-ct-input-styled:focus-within {
        border-color: ${inputPreset.focusBorder} !important;
      }
    `
        : ''
    }

    ${avatarCss}

    /* SVG Character Animations */
    .agy-ct-svg-art { width: 100%; height: 100%; display: block; overflow: visible; }
    @keyframes agyCtBob { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-2.5px); } }
    @keyframes agyCtFloat { 0%, 100% { transform: translateY(0px) rotate(-1deg); } 50% { transform: translateY(-6px) rotate(1.5deg); } }
    @keyframes agyCtBlink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
    @keyframes agyCtWag { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(6deg); } }
    @keyframes agyCtTwinkle { 0%, 100% { opacity: 0.45; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.12); } }
    @keyframes agyCtSpark { 0%, 100% { opacity: 0.6; } 45% { opacity: 1; } 52% { opacity: 0.35; } 60% { opacity: 1; } }
    @keyframes agyCtSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .agy-ct-anim-bob { animation: agyCtBob 3.2s ease-in-out infinite; }
    .agy-ct-anim-float { animation: agyCtFloat 4.2s ease-in-out infinite; }
    .agy-ct-anim-blink { animation: agyCtBlink 4.6s ease-in-out infinite; }
    .agy-ct-anim-wag { animation: agyCtWag 2.4s ease-in-out infinite; }
    .agy-ct-anim-twinkle { animation: agyCtTwinkle 2.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
    .agy-ct-anim-spark { animation: agyCtSpark 1.8s linear infinite; }
    .agy-ct-anim-spin { animation: agyCtSpin 16s linear infinite; }

    /* Pet & Sticker Layers */
    #agy-ct-pet-stage {
      position: fixed;
      z-index: 45;
      cursor: grab;
      user-select: none;
      touch-action: none;
    }
    #agy-ct-pet-stage:active { cursor: grabbing; }
    .agy-ct-pet-body { width: 100%; height: 100%; transition: transform 0.16s ease; }
    #agy-ct-pet-stage:hover .agy-ct-pet-body { transform: scale(1.06); }
    .agy-ct-pet-speech {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%) translateY(4px);
      background: #14161f;
      color: #f8fafc;
      border: 1px solid var(--agy-ct-accent);
      border-radius: 8px;
      padding: 5px 9px;
      font-size: 12px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
    .agy-ct-pet-speech.is-visible { opacity: 1; transform: translateX(-50%) translateY(0); }
    .agy-ct-pet-burst {
      position: fixed;
      pointer-events: none;
      z-index: 960;
      font-size: 14px;
      animation: agyCtBurstUp 0.9s ease-out forwards;
    }
    @keyframes agyCtBurstUp {
      0% { opacity: 1; transform: translate(0, 0) scale(0.7); }
      100% { opacity: 0; transform: translate(var(--dx, 0px), var(--dy, -36px)) scale(1.2); }
    }
    .agy-ct-sticker-node {
      position: fixed;
      z-index: 40;
      cursor: grab;
      user-select: none;
      touch-action: none;
    }
    .agy-ct-sticker-node.has-glow { filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.22)); }

    /* Studio Panel & Launcher (flat hairline design) */
    #agy-ct-launcher {
      position: fixed;
      ${launcherPosCss}
      z-index: 9980;
      display: ${cfg.launcherPill?.enabled === false ? 'none' : 'inline-flex'};
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      background: #181a24;
      color: #f4f4f5;
      border: 1px solid rgba(255, 255, 255, 0.16);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
    }
    #agy-ct-launcher:hover { border-color: var(--agy-ct-accent); }

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
    #agy-ct-settings-panel * { box-sizing: border-box; }
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

    /* Custom User CSS Override */
    ${customUserCss}
  `;
}

export class SurfaceEngine {
  constructor({ getConfig, getCustomMedia, onCustomNavClick, onNativeNavClick, onConfigPatch, studioElement }) {
    this.getConfig = getConfig;
    this.getCustomMedia = getCustomMedia;
    this.onCustomNavClick = onCustomNavClick;
    this.onNativeNavClick = onNativeNavClick;
    this.onConfigPatch = onConfigPatch;
    this.studioElement = studioElement || null;

    this.observer = null;
    this.resizeObserver = null;
    this.rafId = 0;
    this.isCustomSettingsOpen = false;
    this.activeContentPane = null;
    this.injectedNavBtn = null;
    this.boundNativeItems = new WeakSet();
    this.pickerCleanup = null;
    this.holeState = { active: false, clipPath: 'none', holeRect: null };
  }

  setStudioElement(el) {
    this.studioElement = el;
  }

  mount() {
    this.ensureBackgroundLayers();
    this.scanAndDecorate();

    const scheduleScan = () => {
      if (this.rafId) return;
      this.rafId = requestAnimationFrame(() => {
        this.rafId = 0;
        this.scanAndDecorate();
      });
    };

    this.onWindowResize = scheduleScan;
    window.addEventListener('resize', this.onWindowResize, { passive: true });
    this.observer = new MutationObserver(scheduleScan);
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-has-browser-hole', 'data-browser-hole']
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

  apply(config, customMedia = {}) {
    let styleEl = document.getElementById(SE_STYLE_ID);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = SE_STYLE_ID;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = buildStylesheet(config, customMedia);

    if (config.enabled) {
      document.documentElement.classList.add('agy-ct-active');
      document.body.classList.add('agy-ct-active');
    } else {
      document.documentElement.classList.remove('agy-ct-active');
      document.body.classList.remove('agy-ct-active');
    }

    const shell = dtFindShellElement(config);
    void syncPrebakedGlass(shell, config, customMedia);
    this.syncTitleBarOverlay(config);
    this.scanAndDecorate();
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

    const split = shell.querySelector('[data-testid="sidebar-split"]');
    const sidebar = split ? split.firstElementChild : shell.querySelector('aside, [data-sidebar="true"], .bg-sidebar');
    const titleBar = shell.querySelector('[class*="@container/titlebar"], [data-agy-topbar]');
    const shellRect = shell.getBoundingClientRect();
    const sw = sidebar ? Math.round(sidebar.getBoundingClientRect().width) : 0;
    const hdrH = titleBar ? Math.round(titleBar.getBoundingClientRect().bottom - shellRect.top) : 44;

    shell.style.setProperty('--agy-sidebar-w', `${sw}px`);
    shell.style.setProperty('--agy-hdr-h', `${Math.max(0, hdrH)}px`);

    const hasHole = document.body.getAttribute('data-has-browser-hole') === 'true';
    const holeEl = hasHole ? shell.querySelector('[data-browser-hole]:not([data-browser-hole="false"])') : null;
    const nextHole = computeBrowserHoleClip(shellRect, holeEl ? holeEl.getBoundingClientRect() : null, hasHole);
    this.holeState = nextHole;

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

    if (!this.resizeObserver && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.syncShellAndHoleMetrics(this.getConfig()));
      this.resizeObserver.observe(shell);
      if (sidebar) this.resizeObserver.observe(sidebar);
      if (holeEl) this.resizeObserver.observe(holeEl);
    }
  }

  getHoleState() {
    return this.holeState;
  }

  scanAndDecorate() {
    const cfg = this.getConfig();
    this.syncShellAndHoleMetrics(cfg);
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
    if (this.onWindowResize) window.removeEventListener('resize', this.onWindowResize);
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
    this.cancelPicker();

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
