/**
 * Idempotent Runtime Entrypoint for Antigravity 2.x Custom Theme Suite.
 * Strictly guards mounting to .agy-shell or [data-agy-mock-shell] pages.
 */

import {
  clearUnusedMedia,
  deleteCustomMedia,
  loadConfig,
  loadCustomMediaMap,
  mergeConfig,
  resetConfig,
  saveConfig,
  saveCustomMedia,
  syncConfigToHost
} from './core/config-store.js';
import { dtFindChatInputContainers, dtFindShellElement } from './core/dom-targets.js';
import { SurfaceEngine } from './core/surface-engine.js';
import { AmbientCanvasEngine } from './fx/ambient-canvas.js';
import { PetStage } from './fx/pet-stage.js';
import { StickerLayer } from './fx/sticker-layer.js';
import { THEME_BUNDLES } from './presets/themes.js';
import { ThemeStudio } from './ui/theme-studio.js';

class CustomThemeController {
  constructor() {
    this.config = loadConfig();
    this.customMedia = {};
    this.surface = null;
    this.ambient = null;
    this.petStage = null;
    this.stickerLayer = null;
    this.studio = null;
    this.fallbackModal = null;
    this.launcherBtn = null;
    this.sidebarBtn = null;
    this.settingsBtn = null;
    this.checkedSidebarEl = null;
    this.checkedSidebarCount = -1;
    this.liveRafId = 0;
    this.pendingLivePatch = null;
    this.initialized = false;
    this.isMounted = false;
    this.pendingOpenSettings = false;

    this.onKeyDown = (e) => {
      const k = (e.key || '').toLowerCase();
      if ((e.metaKey || e.ctrlKey) && ((e.shiftKey && k === 'y') || (e.altKey && k === 'k'))) {
        e.preventDefault();
        this.toggleSettings();
      } else if (e.key === 'Escape' && this.fallbackModal?.overlay?.parentNode) {
        this.closeSettings();
      }
    };
  }

  init() {
    if (this.initialized) return this;
    this.initialized = true;

    const shell = dtFindShellElement(this.config);
    if (!shell) {
      this.isMounted = false;
      return this;
    }

    this.mountNow();
    return this;
  }

  mountNow() {
    if (this.isMounted) return;
    this.isMounted = true;

    this.studio = new ThemeStudio({
      getConfig: () => this.config,
      getCustomMedia: () => this.customMedia,
      onPatch: (patch) => this.updateConfig(patch, true),
      onLiveUpdate: (patch) => this.updateConfigLive(patch),
      onBundleApply: (id) => this.applyBundle(id),
      onReset: () => {
        this.config = resetConfig(this.config);
        this.refreshAll(true);
      },
      onUploadMedia: (slot, dataUrl) => {
        this.customMedia[slot] = dataUrl;
        void saveCustomMedia(slot, dataUrl);
        this.refreshAll(true);
      },
      onDeleteMedia: (slot) => {
        delete this.customMedia[slot];
        void deleteCustomMedia(slot);
        this.refreshAll(true);
      },
      onClearUnusedMedia: () => {
        const keep = [];
        if (this.config.wallpaperId === 'custom') {
          keep.push(this.config.isLight ? 'wallpaperLight' : 'wallpaper');
        }
        if (this.config.avatars?.userEnabled) keep.push('userAvatar');
        if (this.config.avatars?.agentEnabled && this.config.avatars?.agentMode === 'custom') keep.push('agentAvatar');
        if (this.config.pet?.enabled && this.config.pet?.id === 'custom') keep.push('pet');
        if (this.config.stickers?.enabled && (this.config.stickers.items || []).some((it) => it.id === 'custom')) {
          keep.push('sticker');
        }
        for (const k of Object.keys(this.customMedia)) {
          if (!keep.includes(k)) delete this.customMedia[k];
        }
        void clearUnusedMedia(keep);
        this.refreshAll(true);
      },
      onStartPicker: (key, label) => {
        this.closeFallbackModal();
        this.surface?.startVisualPicker(key, label, () => this.openSettings('advanced'));
      },
      onClose: () => {
        this.closeSettings();
      }
    });

    this.surface = new SurfaceEngine({
      getConfig: () => this.config,
      getCustomMedia: () => this.customMedia,
      onCustomNavClick: () => this.studio?.open(),
      onNativeNavClick: () => this.studio?.clearView(),
      onConfigPatch: (patch) => this.updateConfig(patch, true),
      onHoleChange: (holeState) => {
        this.ambient?.setHoleClip(holeState?.active ? holeState.clipPath : 'none');
        this.petStage?.update();
        this.stickerLayer?.repositionAll();
      },
      onSplitChange: (count) => this.ambient?.setSplitCount(count),
      onDomMutate: () => {
        this.ensureLauncherAndSidebarHooks();
        this.stickerLayer?.scheduleReposition?.();
      },
      studioElement: this.studio.getElement()
    });

    this.surface.mount();
    const { canvas } = this.surface.ensureBackgroundLayers();
    this.ambient = new AmbientCanvasEngine(canvas);

    this.petStage = new PetStage({
      getConfig: () => this.config,
      getCustomMedia: () => this.customMedia,
      getBrowserHoleRect: () => this.surface?.getHoleState()?.holeRect || null,
      onPositionSave: (pos) => this.updateConfig({ pet: { pos } }, false)
    });

    this.stickerLayer = new StickerLayer({
      getConfig: () => this.config,
      getCustomMedia: () => this.customMedia,
      findInputBoxes: () => dtFindChatInputContainers(this.config),
      getBrowserHoleRect: () => this.surface?.getHoleState()?.holeRect || null,
      onStickerMove: (idx, patch) => {
        const items = [...(this.config.stickers?.items || [])];
        if (items[idx]) {
          items[idx] = { ...items[idx], ...patch };
          this.updateConfig({ stickers: { items } }, true);
        }
      }
    });

    this.ensureLauncherAndSidebarHooks();
    document.addEventListener('keydown', this.onKeyDown);

    syncConfigToHost(this.config);
    this.refreshAll(false);

    void loadCustomMediaMap().then((map) => {
      if (!this.isMounted) return;
      this.customMedia = map || {};
      this.refreshAll(this.studio?.isOpen() || false);
      if (this.pendingOpenSettings) {
        this.pendingOpenSettings = false;
        this.openSettings();
      }
    });
  }

  ensureLauncherAndSidebarHooks() {
    const sidebar = document.querySelector('.agy-shell .bg-sidebar, [data-agy-mock-shell] .bg-sidebar');
    const sidebarChildCount = sidebar ? sidebar.childElementCount || 0 : -1;
    const sidebarHasBtn = Boolean(this.sidebarBtn && document.body.contains(this.sidebarBtn));
    const sidebarCachedMiss = !sidebarHasBtn && sidebar === this.checkedSidebarEl && sidebarChildCount === this.checkedSidebarCount;

    if (
      this.launcherBtn &&
      document.body.contains(this.launcherBtn) &&
      (sidebarHasBtn || sidebarCachedMiss) &&
      !document.querySelector('.settings-modal-container')
    ) {
      return;
    }

    if (!this.launcherBtn || !document.body.contains(this.launcherBtn)) {
      document.getElementById('agy-ct-launcher')?.remove();
      const btn = document.createElement('button');
      btn.id = 'agy-ct-launcher';
      btn.type = 'button';
      btn.setAttribute('data-agy-ct-injected', 'true');
      btn.title = 'Custom Theme Studio (Ctrl+Shift+Y / Ctrl+Alt+K)';
      btn.textContent = '🎨 Theme';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleSettings();
      });
      document.body.appendChild(btn);
      this.launcherBtn = btn;
    }

    // Sidebar button below Customizations
    if (sidebar && !document.getElementById('agy-ct-sidebar-btn') && !sidebarCachedMiss) {
      this.checkedSidebarEl = sidebar;
      this.checkedSidebarCount = sidebarChildCount;
      const spans = Array.from(sidebar.querySelectorAll('span, button, a'));
      const anchor = spans.find((el) => (el.textContent || '').trim() === 'Customizations');
      const row = anchor?.closest('a, button, div[role="button"]') || anchor?.parentElement;
      if (row && row.parentNode) {
        const sBtn = document.createElement('button');
        sBtn.id = 'agy-ct-sidebar-btn';
        sBtn.type = 'button';
        sBtn.setAttribute('data-agy-ct-injected', 'true');
        sBtn.className = row.className || '';
        sBtn.style.cssText = 'display:flex;align-items:center;gap:8px;width:100%;text-align:left;cursor:pointer;';
        sBtn.textContent = '🎨 Custom theme';
        sBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.openSettings();
        });
        row.parentNode.insertBefore(sBtn, row.nextSibling);
        this.sidebarBtn = sBtn;
      }
    }

    // Settings modal quick button
    const modal = document.querySelector('.settings-modal-container');
    if (modal && !document.getElementById('agy-ct-settings-modal-btn')) {
      const heading = Array.from(modal.querySelectorAll('h2, h3')).find(
        (h) => (h.textContent || '').trim() === 'Appearance'
      );
      if (heading?.parentNode) {
        const mBtn = document.createElement('button');
        mBtn.id = 'agy-ct-settings-modal-btn';
        mBtn.type = 'button';
        mBtn.setAttribute('data-agy-ct-injected', 'true');
        mBtn.className = 'agy-ct-btn';
        mBtn.style.marginTop = '8px';
        mBtn.textContent = '🎨 Open Custom Theme Studio';
        mBtn.addEventListener('click', () => this.openSettings());
        heading.parentNode.appendChild(mBtn);
        this.settingsBtn = mBtn;
      }
    }
  }

  updateConfigLive(patch) {
    this.pendingLivePatch = this.pendingLivePatch ? mergeConfig(this.pendingLivePatch, patch) : patch;
    if (this.liveRafId) return;
    const rafFn = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (fn) => setTimeout(fn, 0);
    this.liveRafId = rafFn(() => {
      this.liveRafId = 0;
      if (!this.pendingLivePatch) return;
      this.config = mergeConfig(this.config, this.pendingLivePatch);
      this.pendingLivePatch = null;
      this.refreshAll(false, { skipPrebake: true });
    });
  }

  updateConfig(patch, rerenderStudio = true) {
    if (this.liveRafId && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.liveRafId);
    }
    this.liveRafId = 0;
    this.pendingLivePatch = null;
    this.config = mergeConfig(this.config, patch);
    this.config = saveConfig(this.config);
    this.refreshAll(rerenderStudio, { skipPrebake: false });
  }

  applyBundle(bundleId) {
    const customBundle = (this.config.customBundles || []).find((b) => b.id === bundleId);
    const bundle = customBundle || THEME_BUNDLES.find((b) => b.id === bundleId);
    if (!bundle) return;
    const patch = JSON.parse(JSON.stringify(bundle.patch || {}));
    const hiddenWps = new Set(this.config.hiddenWallpapers || []);
    const hiddenStickers = new Set(this.config.hiddenStickers || []);
    const hiddenPets = new Set(this.config.hiddenPets || []);

    if (patch.wallpaperId && hiddenWps.has(patch.wallpaperId)) patch.wallpaperId = 'none';
    if (patch.stickers?.items) {
      patch.stickers.items = patch.stickers.items.filter((it) => !hiddenStickers.has(it.id));
    }
    if (patch.pet?.id && hiddenPets.has(patch.pet.id)) {
      patch.pet.enabled = false;
      patch.pet.id = 'none';
    }
    this.updateConfig({ ...patch, activeBundleId: bundle.id, enabled: true }, true);
  }

  refreshAll(rerenderStudio = false, { skipPrebake = false } = {}) {
    if (!this.isMounted) return;
    this.surface?.apply(this.config, this.customMedia, { skipPrebake });

    const holeState = this.surface?.getHoleState();
    this.ambient?.setHoleClip(holeState?.active ? holeState.clipPath : 'none');

    if (this.ambient) {
      this.ambient.setSplitCount(this.surface?.lastSplitCount || 1);
      if (this.config.enabled) {
        this.ambient.configure(this.config.atmosphereId, this.config.atmosphereIntensity);
      } else {
        this.ambient.configure('none', 0);
      }
    }

    this.petStage?.update();
    this.stickerLayer?.update();

    if (rerenderStudio && this.studio?.isOpen()) {
      this.studio.render();
    }
  }

  openSettings(tabId) {
    if (!this.isMounted || !this.studio) {
      this.pendingOpenSettings = true;
      return false;
    }

    this.surface?.ensureSettingsEntry(this.config);
    const navBtn = document.querySelector('[data-agy-ct-nav="custom-theme"]');
    if (navBtn && navBtn.getBoundingClientRect().width > 0) {
      if (tabId) this.studio.activeTab = tabId;
      navBtn.click();
      return true;
    }

    if (!this.fallbackModal) {
      const overlay = document.createElement('div');
      overlay.id = 'agy-ct-fallback-modal';
      overlay.setAttribute('data-agy-ct-injected', 'true');
      overlay.style.cssText =
        'position:fixed;inset:0;z-index:9990;background:rgba(0,0,0,0.68);display:flex;align-items:center;justify-content:center;padding:24px;';
      const card = document.createElement('div');
      card.style.cssText =
        'width:min(840px,95vw);max-height:88vh;overflow:auto;background:#14161e;border:1px solid rgba(255,255,255,0.14);border-radius:12px;';
      overlay.appendChild(card);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeFallbackModal();
      });
      this.fallbackModal = { overlay, card };
    }

    this.fallbackModal.card.appendChild(this.studio.getElement());
    this.studio.open(tabId);
    document.body.appendChild(this.fallbackModal.overlay);
    return true;
  }

  closeFallbackModal() {
    if (!this.fallbackModal) return;
    this.fallbackModal.overlay.remove();
    this.studio?.clearView();
    this.surface?.ensureSettingsEntry(this.config);
  }

  closeSettings() {
    this.closeFallbackModal();
    this.surface?.setCustomSettingsOpen(false);
    this.studio?.clearView();
  }

  toggleSettings() {
    if (this.studio?.isOpen() || this.fallbackModal?.overlay?.parentNode) {
      this.closeSettings();
    } else {
      this.openSettings();
    }
  }

  destroy() {
    document.removeEventListener('keydown', this.onKeyDown);
    if (this.liveRafId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.liveRafId);
    this.liveRafId = 0;
    this.pendingLivePatch = null;
    this.checkedSidebarEl = null;
    this.checkedSidebarCount = -1;
    this.ambient?.destroy();
    this.petStage?.destroy();
    this.stickerLayer?.destroy();
    this.surface?.destroy();
    this.fallbackModal?.overlay?.remove();
    this.launcherBtn?.remove();
    this.sidebarBtn?.remove();
    this.settingsBtn?.remove();
    this.isMounted = false;
    this.initialized = false;
    delete window.__AGY_CUSTOM_THEME__;
  }
}

if (typeof window !== 'undefined') {
  if (window.__AGY_CUSTOM_THEME__?.destroy) {
    window.__AGY_CUSTOM_THEME__.destroy();
  }

  const controller = new CustomThemeController();
  window.__AGY_CUSTOM_THEME__ = {
    version: '__AGY_THEME_VERSION__',
    get isMounted() {
      return controller.isMounted;
    },
    init: () => controller.init(),
    destroy: () => controller.destroy(),
    openSettings: (tabId) => controller.openSettings(tabId),
    closeSettings: () => controller.closeSettings(),
    toggleSettings: () => controller.toggleSettings(),
    applyBundle: (id) => controller.applyBundle(id),
    getConfig: () => controller.config,
    setConfig: (patch) => controller.updateConfig(patch, true)
  };

  controller.init();
}
