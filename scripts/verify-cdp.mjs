#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CdpSession,
  DEFAULT_ROOT_DIR,
  fetchCdpTargets,
  filterAntigravityTargets,
  isShellTarget,
  readActivePort
} from '../daemon/cdp-daemon.mjs';

const __filename = fileURLToPath(import.meta.url);

export async function inspectLiveTargets({ expectMounted = true, portFileOpts = {} } = {}) {
  const active = readActivePort(portFileOpts);
  if (!active) {
    throw new Error('Antigravity DevToolsActivePort not found. Ensure Antigravity 2.x is running.');
  }

  const allTargets = await fetchCdpTargets(active.port);
  const candidates = filterAntigravityTargets(allTargets);
  const reports = [];

  for (const target of candidates) {
    let session;
    try {
      session = await CdpSession.connect(target.webSocketDebuggerUrl);
      const hasShell = await isShellTarget(session);
      if (!hasShell) continue;

      const metrics = await session.evalExpr(`(() => {
        const shell = document.querySelector('.agy-shell') || document.querySelector('[data-agy-mock-shell]');
        const styleEl = document.getElementById('agy-ct-styles');
        const bgRoot = document.getElementById('agy-ct-bg-root');
        const canvas = document.getElementById('agy-ct-ambient-canvas');
        const launcher = document.getElementById('agy-ct-launcher');
        const sidebarBtn = document.getElementById('agy-ct-sidebar-btn');
        const settingsNav = document.querySelector('[data-agy-ct-nav="custom-theme"]');
        const pet = document.getElementById('agy-ct-pet-stage');
        const stickerCount = document.querySelectorAll('.agy-ct-sticker-node').length;

        const shellStyle = shell ? getComputedStyle(shell) : null;
        const scrollers = shell
          ? [shell, ...shell.querySelectorAll('.overflow-y-auto, [data-main-content-body], [data-side-panel-body]')]
          : [];
        let hasLiveBlurOnScrollers = false;
        for (const el of scrollers) {
          const st = getComputedStyle(el);
          const bf = (st.backdropFilter || st.webkitBackdropFilter || '').toLowerCase();
          if (bf && bf !== 'none' && bf.includes('blur(')) {
            hasLiveBlurOnScrollers = true;
            break;
          }
        }

        const lGlassBg = shell ? shell.style.getPropertyValue('--agy-l-glass-bg') : '';
        const holeActive = shell?.getAttribute('data-agy-hole-active') === '1';

        return {
          title: document.title,
          url: location.href,
          themeActive: Boolean(window.__AGY_CUSTOM_THEME__ && window.__AGY_CUSTOM_THEME__.isMounted),
          stylePresent: Boolean(styleEl && styleEl.textContent && styleEl.textContent.length > 100),
          bgRootPresent: Boolean(bgRoot),
          canvasPresent: Boolean(canvas),
          studioOpenerPresent: Boolean(launcher || sidebarBtn || settingsNav),
          petPresent: Boolean(pet),
          stickerCount,
          stickerLayerPresent: stickerCount > 0,
          shellTransparentBg: Boolean(
            shellStyle &&
            (shellStyle.backgroundColor === 'rgba(0, 0, 0, 0)' || shellStyle.backgroundColor === 'transparent')
          ),
          hasLiveBlurOnScrollers,
          prebakedGlassSet: Boolean(lGlassBg && lGlassBg.startsWith('url(')),
          holeActive,
          bundleVersion: window.__AGY_CUSTOM_THEME__?.version || null,
          activeBundleId: window.__AGY_CUSTOM_THEME__?.getConfig?.()?.activeBundleId || null
        };
      })()`);

      const passed = expectMounted
        ? Boolean(
            metrics.themeActive &&
            metrics.stylePresent &&
            metrics.bgRootPresent &&
            metrics.canvasPresent &&
            metrics.studioOpenerPresent &&
            metrics.shellTransparentBg &&
            !metrics.hasLiveBlurOnScrollers
          )
        : Boolean(!metrics.themeActive && !metrics.stylePresent && !metrics.bgRootPresent);

      reports.push({
        id: target.id,
        passed,
        metrics
      });
    } finally {
      session?.close();
    }
  }

  const ok = reports.length > 0 && reports.every((r) => r.passed);
  return {
    ok,
    expectMounted,
    port: active.port,
    totalTargets: allTargets.length,
    candidatePages: candidates.length,
    shellTargets: reports.length,
    reports
  };
}

export async function runVerifyCli(argv = process.argv.slice(2)) {
  const expectMounted = !argv.includes('--unmounted');
  const result = await inspectLiveTargets({ expectMounted });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    console.error('FAIL: Live CDP verification did not satisfy assertions.');
    process.exitCode = 1;
  } else {
    console.log(`PASS: Verified ${result.shellTargets} live Antigravity 2.x shell target(s) on port ${result.port}.`);
  }
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  runVerifyCli().catch((err) => {
    console.error(`FAIL: ${err.message}`);
    process.exit(1);
  });
}
