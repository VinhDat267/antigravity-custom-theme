/**
 * Bilingual 5-Tab Theme Studio UI for Antigravity 2.x.
 * Built with flat 1px hairline surfaces, tabular-nums readouts, and client-side WebP compression.
 */

import { MASCOT_TEMPLATES, renderAgentStarSvg, renderMascotSvg } from '../assets/mascots.js';
import { STICKER_TEMPLATES, renderStickerSvg } from '../assets/stickers.js';
import { WALLPAPERS } from '../assets/wallpapers-manifest.js';
import { BUBBLE_PRESETS } from '../presets/bubbles.js';
import { INPUT_PRESETS } from '../presets/inputs.js';
import { ACCENT_COLORS, ATMOSPHERE_PRESETS, THEME_BUNDLES } from '../presets/themes.js';
import { exportPortableConfig, sanitizeImportedConfig } from '../core/config-store.js';
import { t } from './i18n.js';

function tsCompressImage(file, maxDim = 2560, square = false) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || '');
      if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
        resolve(raw);
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          const nw = img.naturalWidth || maxDim;
          const nh = img.naturalHeight || maxDim;
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(raw);
            return;
          }
          if (square) {
            const side = Math.min(nw, nh);
            const sx = Math.max(0, Math.floor((nw - side) / 2));
            const sy = Math.max(0, Math.floor((nh - side) / 2));
            canvas.width = maxDim;
            canvas.height = maxDim;
            ctx.drawImage(img, sx, sy, side, side, 0, 0, maxDim, maxDim);
          } else {
            const scale = Math.min(1, maxDim / Math.max(nw, nh));
            canvas.width = Math.max(1, Math.round(nw * scale));
            canvas.height = Math.max(1, Math.round(nh * scale));
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
          const webp = canvas.toDataURL('image/webp', 0.88);
          resolve(webp && webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png'));
        } catch {
          resolve(raw);
        }
      };
      img.onerror = () => resolve(raw);
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}

function tsEl(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') node.className = v;
    else if (k === 'textContent') node.textContent = v;
    else if (k === 'style') node.style.cssText = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, String(v));
  }
  for (const ch of Array.isArray(children) ? children : [children]) {
    if (ch === null || ch === undefined) continue;
    node.appendChild(typeof ch === 'string' ? document.createTextNode(ch) : ch);
  }
  return node;
}

export class ThemeStudio {
  constructor({
    getConfig,
    getCustomMedia,
    onPatch,
    onLiveUpdate,
    onBundleApply,
    onReset,
    onUploadMedia,
    onDeleteMedia,
    onClearUnusedMedia,
    onStartPicker,
    onClose
  }) {
    this.getConfig = getConfig;
    this.getCustomMedia = getCustomMedia;
    this.onPatch = onPatch;
    this.onLiveUpdate = onLiveUpdate;
    this.onBundleApply = onBundleApply;
    this.onReset = onReset;
    this.onUploadMedia = onUploadMedia;
    this.onDeleteMedia = onDeleteMedia;
    this.onClearUnusedMedia = onClearUnusedMedia;
    this.onStartPicker = onStartPicker;
    this.onClose = onClose;

    this.activeTab = 'presets';
    this.showImportBox = false;
    this.importDraft = '';
    this.importError = '';
    this.presetPromptOpen = false;
    this.confirmResetPending = false;
    this.rootEl = tsEl('div', { id: 'agy-ct-settings-panel', 'data-agy-ct-injected': 'true' });
  }

  getElement() {
    return this.rootEl;
  }

  isOpen() {
    return this.rootEl.classList.contains('is-open');
  }

  open(tabId) {
    if (tabId) this.activeTab = tabId;
    this.rootEl.classList.add('is-open');
    this.render();
  }

  close() {
    this.rootEl.classList.remove('is-open');
    this.onClose?.();
  }

  toggle() {
    if (this.isOpen()) this.close();
    else this.open();
  }

  clearView() {
    this.rootEl.classList.remove('is-open');
  }

  makeSliderRow(labelText, min, max, step, value, unit, onInput, onCommit) {
    const valSpan = tsEl('span', { className: 'agy-ct-range-val', textContent: `${value}${unit}` });
    const range = tsEl('input', {
      type: 'range',
      min,
      max,
      step,
      value
    });
    range.addEventListener('input', (e) => {
      const next = Number(e.target.value);
      valSpan.textContent = `${next}${unit}`;
      onInput(next);
    });
    range.addEventListener('change', (e) => {
      onCommit?.(Number(e.target.value));
    });
    return tsEl('label', { className: 'agy-ct-slider-row' }, [
      tsEl('span', { textContent: labelText }),
      range,
      valSpan
    ]);
  }

  makeFileButton(labelText, accept, squareDim, onLoaded) {
    const input = tsEl('input', { type: 'file', accept, style: 'display:none;' });
    input.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const dataUrl = await tsCompressImage(file, squareDim || 2560, Boolean(squareDim));
      onLoaded(dataUrl);
      input.value = '';
    });
    return tsEl('label', { className: 'agy-ct-btn', style: 'display:inline-flex;align-items:center;cursor:pointer;' }, [
      labelText,
      input
    ]);
  }

  render() {
    const cfg = this.getConfig();
    const lang = cfg.lang === 'en' ? 'en' : 'vi';
    const media = this.getCustomMedia() || {};
    this.rootEl.textContent = '';

    // Header
    const enableCb = tsEl('input', { type: 'checkbox' });
    enableCb.checked = Boolean(cfg.enabled);
    enableCb.addEventListener('change', (e) => this.onPatch({ enabled: e.target.checked }));

    const header = tsEl('div', { className: 'agy-ct-head' }, [
      tsEl('div', {}, [
        tsEl('h2', { textContent: `🎨 ${t(lang, 'studioTitle')}` }),
        tsEl('div', { style: 'font-size:12px;color:#9ca3af;margin-top:2px;', textContent: t(lang, 'studioSubtitle') })
      ]),
      tsEl('div', { style: 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;' }, [
        tsEl('label', { style: 'display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;' }, [
          enableCb,
          t(lang, 'enabledLabel')
        ]),
        tsEl('button', {
          type: 'button',
          className: 'agy-ct-btn',
          textContent: t(lang, 'langSwitch'),
          onClick: () => this.onPatch({ lang: lang === 'vi' ? 'en' : 'vi' })
        }),
        tsEl('button', {
          type: 'button',
          className: 'agy-ct-btn',
          textContent: t(lang, 'closeBtn'),
          onClick: () => this.close()
        })
      ])
    ]);

    // Tabs
    const tabDefs = [
      ['presets', t(lang, 'tabPresets')],
      ['wallpaper', t(lang, 'tabWallpaper')],
      ['chat', t(lang, 'tabChat')],
      ['fx', t(lang, 'tabFx')],
      ['advanced', t(lang, 'tabAdvanced')]
    ];
    const tabsRow = tsEl(
      'div',
      { className: 'agy-ct-tabs' },
      tabDefs.map(([id, label]) =>
        tsEl('button', {
          type: 'button',
          className: `agy-ct-tab ${this.activeTab === id ? 'is-active' : ''}`,
          textContent: label,
          onClick: () => {
            this.activeTab = id;
            this.render();
          }
        })
      )
    );

    const body = tsEl('div', { style: 'display:flex;flex-direction:column;gap:14px;' });
    if (this.activeTab === 'presets') this.renderPresetsTab(body, cfg, lang);
    else if (this.activeTab === 'wallpaper') this.renderWallpaperTab(body, cfg, media, lang);
    else if (this.activeTab === 'chat') this.renderChatTab(body, cfg, media, lang);
    else if (this.activeTab === 'fx') this.renderFxTab(body, cfg, media, lang);
    else this.renderAdvancedTab(body, cfg, lang);

    this.rootEl.append(header, tabsRow, body);
  }

  renderPresetsTab(container, cfg, lang) {
    const allBundles = [...THEME_BUNDLES, ...(cfg.customBundles || [])];
    const exportBtn = tsEl('button', { type: 'button', className: 'agy-ct-btn', textContent: t(lang, 'exportJson') });
    const importText = tsEl('textarea', {
      className: 'agy-ct-textarea',
      placeholder: '{"wallpaperId":"kanagawa-wave","dimming":28}'
    });
    importText.value = this.importDraft || '';
    importText.addEventListener('input', () => {
      this.importDraft = importText.value;
    });

    const openExportFallback = (json) => {
      this.showImportBox = true;
      this.importDraft = json;
      this.importError = '';
      this.render();
    };

    exportBtn.addEventListener('click', () => {
      const json = exportPortableConfig(cfg);
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
          Promise.resolve(navigator.clipboard.writeText(json))
            .then(() => {
              exportBtn.textContent = t(lang, 'copied');
              setTimeout(() => {
                exportBtn.textContent = t(lang, 'exportJson');
              }, 1400);
            })
            .catch(() => openExportFallback(json));
        } catch {
          openExportFallback(json);
        }
      } else {
        openExportFallback(json);
      }
    });

    const savePresetWrap = tsEl('div', { style: 'display:flex;gap:8px;align-items:center;' });
    if (this.presetPromptOpen) {
      const nameInput = tsEl('input', {
        type: 'text',
        className: 'agy-ct-input',
        style: 'width:170px;',
        placeholder: t(lang, 'presetNamePrompt')
      });
      const okBtn = tsEl('button', {
        type: 'button',
        className: 'agy-ct-btn',
        textContent: 'OK',
        onClick: () => {
          const name = nameInput.value.trim();
          if (name) {
            const id = `custom-${Date.now()}`;
            const nextBundles = [
              ...(cfg.customBundles || []),
              {
                id,
                name,
                nameEn: name,
                subtitle: 'Custom saved combo',
                subtitleEn: 'Custom saved combo',
                badge: 'Custom',
                patch: JSON.parse(exportPortableConfig(cfg))
              }
            ];
            this.presetPromptOpen = false;
            this.onPatch({ customBundles: nextBundles, activeBundleId: id });
          }
        }
      });
      savePresetWrap.append(nameInput, okBtn);
    } else {
      savePresetWrap.appendChild(
        tsEl('button', {
          type: 'button',
          className: 'agy-ct-btn',
          textContent: t(lang, 'savePresetBtn'),
          onClick: () => {
            this.presetPromptOpen = true;
            this.render();
          }
        })
      );
    }

    const actions = tsEl('div', { className: 'agy-ct-row' }, [
      tsEl('strong', { style: 'font-size:13.5px;', textContent: t(lang, 'presetsTitle') }),
      tsEl('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;' }, [
        savePresetWrap,
        exportBtn,
        tsEl('button', {
          type: 'button',
          className: 'agy-ct-btn',
          textContent: t(lang, 'importJson'),
          onClick: () => {
            this.showImportBox = !this.showImportBox;
            this.importError = '';
            this.render();
          }
        })
      ])
    ]);

    const card = tsEl('div', { className: 'agy-ct-card' }, [actions]);

    if (this.showImportBox) {
      const applyBtn = tsEl('button', {
        type: 'button',
        className: 'agy-ct-btn',
        textContent: t(lang, 'applyJson'),
        onClick: () => {
          try {
            const parsed = JSON.parse(importText.value.trim());
            const clean = sanitizeImportedConfig(parsed);
            this.showImportBox = false;
            this.importDraft = '';
            this.importError = '';
            this.onPatch(clean);
          } catch (err) {
            this.importError = err.message;
            this.render();
          }
        }
      });
      card.append(
        importText,
        tsEl('div', { className: 'agy-ct-row' }, [
          tsEl('span', { style: 'font-size:12px;color:#fca5a5;', textContent: this.importError }),
          applyBtn
        ])
      );
    }

    const grid = tsEl(
      'div',
      { className: 'agy-ct-grid-2' },
      allBundles.map((b) => {
        const isSel = cfg.activeBundleId === b.id;
        const isCustom = b.id.startsWith('custom-');
        const head = tsEl('div', { className: 'agy-ct-row' }, [
          tsEl('span', {
            style: 'font-size:11px;color:var(--agy-ct-accent);font-weight:600;',
            textContent: b.badge || 'Preset'
          }),
          isCustom
            ? tsEl('button', {
                type: 'button',
                className: 'agy-ct-btn agy-ct-btn-danger',
                style: 'padding:2px 6px;font-size:11px;',
                textContent: '✕',
                onClick: (ev) => {
                  ev.stopPropagation();
                  const next = (cfg.customBundles || []).filter((x) => x.id !== b.id);
                  this.onPatch({ customBundles: next });
                }
              })
            : null
        ]);
        return tsEl(
          'button',
          {
            type: 'button',
            className: `agy-ct-item-card ${isSel ? 'is-selected' : ''}`,
            onClick: () => this.onBundleApply(b.id)
          },
          [
            head,
            tsEl('strong', { style: 'font-size:13px;', textContent: lang === 'en' ? b.nameEn || b.name : b.name }),
            tsEl('span', {
              style: 'font-size:11.5px;color:#a1a1aa;',
              textContent: lang === 'en' ? b.subtitleEn || b.subtitle : b.subtitle
            })
          ]
        );
      })
    );

    card.appendChild(grid);
    container.appendChild(card);
  }

  renderWallpaperTab(container, cfg, media, lang) {
    const lightCb = tsEl('input', { type: 'checkbox' });
    lightCb.checked = Boolean(cfg.isLight);
    lightCb.addEventListener('change', (e) => {
      const isLight = e.target.checked;
      this.onPatch({
        isLight,
        overlayRgb: isLight ? '242, 236, 188' : '11, 16, 27'
      });
    });

    const topCard = tsEl('div', { className: 'agy-ct-card' }, [
      tsEl('div', { className: 'agy-ct-row' }, [
        tsEl('strong', { style: 'font-size:13.5px;', textContent: t(lang, 'wallpaperSection') }),
        tsEl('label', { style: 'display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;' }, [
          lightCb,
          t(lang, 'lightModeLabel')
        ])
      ]),
      tsEl('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;' }, [
        this.makeFileButton(t(lang, 'uploadWallpaper'), 'image/*', 0, (dataUrl) => {
          const slot = cfg.isLight ? 'wallpaperLight' : 'wallpaper';
          this.onUploadMedia(slot, dataUrl);
          this.onPatch({ wallpaperId: 'custom', enabled: true });
        }),
        media.wallpaper || media.wallpaperLight
          ? tsEl('button', {
              type: 'button',
              className: 'agy-ct-btn',
              textContent: t(lang, 'clearCustomWp'),
              onClick: () => {
                this.onDeleteMedia(cfg.isLight ? 'wallpaperLight' : 'wallpaper');
                if (cfg.wallpaperId === 'custom') this.onPatch({ wallpaperId: 'thunder-samurai' });
              }
            })
          : null
      ]),
      tsEl(
        'div',
        { className: 'agy-ct-grid-auto' },
        WALLPAPERS.filter((w) => !(cfg.hiddenWallpapers || []).includes(w.id)).map((w) => {
          const isSel = cfg.wallpaperId === w.id;
          const bgStyle = w.embeddedDataUri ? `url("${w.embeddedDataUri}") center/cover` : w.previewCss;
          return tsEl(
            'button',
            {
              type: 'button',
              className: `agy-ct-item-card ${isSel ? 'is-selected' : ''}`,
              style: 'padding:0;overflow:hidden;',
              onClick: () => this.onPatch({ wallpaperId: w.id, enabled: true })
            },
            [
              tsEl('div', { style: `height:68px;width:100%;background:${bgStyle};` }),
              tsEl('div', {
                style: 'padding:6px 8px;font-size:11.5px;font-weight:500;',
                textContent: lang === 'en' ? w.nameEn : w.name
              })
            ]
          );
        })
      )
    ]);

    const fitSelect = tsEl('select', { className: 'agy-ct-select', style: 'width:auto;' }, [
      tsEl('option', { value: 'cover', textContent: 'Cover' }),
      tsEl('option', { value: 'contain', textContent: 'Contain' })
    ]);
    fitSelect.value = cfg.wallpaperFit || 'cover';
    fitSelect.addEventListener('change', (e) => this.onPatch({ wallpaperFit: e.target.value }));

    const posSelect = tsEl(
      'select',
      { className: 'agy-ct-select', style: 'width:auto;' },
      ['center center', 'center top', 'center bottom', 'left center', 'right center'].map((p) =>
        tsEl('option', { value: p, textContent: p })
      )
    );
    posSelect.value = cfg.wallpaperPos || 'center center';
    posSelect.addEventListener('change', (e) => this.onPatch({ wallpaperPos: e.target.value }));

    const slidersCard = tsEl('div', { className: 'agy-ct-card' }, [
      tsEl('div', { className: 'agy-ct-row' }, [
        tsEl('span', { style: 'font-size:12.5px;', textContent: t(lang, 'wallpaperFit') }),
        fitSelect,
        tsEl('span', { style: 'font-size:12.5px;', textContent: t(lang, 'wallpaperPos') }),
        posSelect
      ]),
      this.makeSliderRow(
        t(lang, 'dimming'),
        0,
        92,
        1,
        cfg.dimming,
        '%',
        (v) => this.onLiveUpdate({ dimming: v }),
        (v) => this.onPatch({ dimming: v })
      ),
      this.makeSliderRow(
        t(lang, 'wpBlur'),
        0,
        20,
        1,
        cfg.wpBlur,
        'px',
        (v) => this.onLiveUpdate({ wpBlur: v }),
        (v) => this.onPatch({ wpBlur: v })
      ),
      this.makeSliderRow(
        t(lang, 'glassBlur'),
        0,
        16,
        1,
        cfg.glassBlur,
        'px',
        (v) => this.onLiveUpdate({ glassBlur: v }),
        (v) => this.onPatch({ glassBlur: v })
      ),
      this.makeSliderRow(
        t(lang, 'sidebarOpacity'),
        0,
        98,
        2,
        cfg.surfaces.sidebarOpacity,
        '%',
        (v) => this.onLiveUpdate({ surfaces: { sidebarOpacity: v } }),
        (v) => this.onPatch({ surfaces: { sidebarOpacity: v } })
      ),
      this.makeSliderRow(
        t(lang, 'headerOpacity'),
        0,
        98,
        2,
        cfg.surfaces.headerOpacity,
        '%',
        (v) => this.onLiveUpdate({ surfaces: { headerOpacity: v } }),
        (v) => this.onPatch({ surfaces: { headerOpacity: v } })
      ),
      this.makeSliderRow(
        t(lang, 'aiCardOpacity'),
        0,
        98,
        2,
        cfg.surfaces.aiCardOpacity,
        '%',
        (v) => this.onLiveUpdate({ surfaces: { aiCardOpacity: v } }),
        (v) => this.onPatch({ surfaces: { aiCardOpacity: v } })
      ),
      this.makeSliderRow(
        t(lang, 'codeOpacity'),
        0,
        98,
        2,
        cfg.surfaces.codeOpacity,
        '%',
        (v) => this.onLiveUpdate({ surfaces: { codeOpacity: v } }),
        (v) => this.onPatch({ surfaces: { codeOpacity: v } })
      )
    ]);

    container.append(topCard, slidersCard);
  }

  renderChatTab(container, cfg, media, lang) {
    // Accent colors + Bubbles
    const mascotCb = tsEl('input', { type: 'checkbox' });
    mascotCb.checked = Boolean(cfg.bubbleMascotEnabled);
    mascotCb.addEventListener('change', (e) => this.onPatch({ bubbleMascotEnabled: e.target.checked }));

    const swatchRow = tsEl('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;' }, [
      tsEl('span', { style: 'font-size:12.5px;', textContent: `${t(lang, 'accentSection')}:` }),
      ...ACCENT_COLORS.map((c) =>
        tsEl('button', {
          type: 'button',
          className: `agy-ct-swatch ${cfg.accentColor === c.hex ? 'is-selected' : ''}`,
          style: `background:${c.hex};`,
          title: c.name,
          onClick: () => this.onPatch({ accentColor: c.hex })
        })
      )
    ]);

    const bubbleCard = tsEl('div', { className: 'agy-ct-card' }, [
      swatchRow,
      tsEl('div', { className: 'agy-ct-row' }, [
        tsEl('strong', { style: 'font-size:13.5px;', textContent: t(lang, 'bubbleSection') }),
        tsEl('label', { style: 'display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;' }, [
          mascotCb,
          t(lang, 'bubbleMascot')
        ])
      ]),
      tsEl(
        'div',
        { className: 'agy-ct-grid-2' },
        BUBBLE_PRESETS.map((b) =>
          tsEl(
            'button',
            {
              type: 'button',
              className: `agy-ct-item-card ${cfg.bubbleId === b.id ? 'is-selected' : ''}`,
              onClick: () => this.onPatch({ bubbleId: b.id })
            },
            [
              tsEl('div', {
                style: `padding:7px 11px;border-radius:${b.radius};background:${b.bg};border:${b.border};color:${b.text};font-size:12px;`,
                textContent: 'Hello ✨'
              }),
              tsEl('span', {
                style: 'font-size:11.5px;color:#d4d4d8;',
                textContent: lang === 'en' ? b.nameEn : b.name
              })
            ]
          )
        )
      )
    ]);

    // Input frames
    const inputCard = tsEl('div', { className: 'agy-ct-card' }, [
      tsEl('strong', { style: 'font-size:13.5px;', textContent: t(lang, 'inputSection') }),
      tsEl(
        'div',
        { className: 'agy-ct-grid-2' },
        INPUT_PRESETS.map((inp) =>
          tsEl(
            'button',
            {
              type: 'button',
              className: `agy-ct-item-card ${cfg.inputId === inp.id ? 'is-selected' : ''}`,
              onClick: () => this.onPatch({ inputId: inp.id })
            },
            [
              tsEl('div', {
                style: `padding:7px 10px;border-radius:${inp.radius};background:${inp.bg};border:${inp.border};font-size:11.5px;color:${inp.isLight ? '#475569' : '#9ca3af'};`,
                textContent: 'Ask anything...'
              }),
              tsEl('span', { style: 'font-size:11.5px;', textContent: lang === 'en' ? inp.nameEn : inp.name })
            ]
          )
        )
      )
    ]);

    // Avatars
    const userAvCb = tsEl('input', { type: 'checkbox' });
    userAvCb.checked = Boolean(cfg.avatars.userEnabled);
    userAvCb.addEventListener('change', (e) => this.onPatch({ avatars: { userEnabled: e.target.checked } }));

    const agentAvCb = tsEl('input', { type: 'checkbox' });
    agentAvCb.checked = Boolean(cfg.avatars.agentEnabled);
    agentAvCb.addEventListener('change', (e) => this.onPatch({ avatars: { agentEnabled: e.target.checked } }));

    const agentModeSel = tsEl('select', { className: 'agy-ct-select', style: 'width:auto;' }, [
      tsEl('option', { value: 'star', textContent: t(lang, 'agentModeStar') }),
      tsEl('option', { value: 'custom', textContent: t(lang, 'agentModeCustom') })
    ]);
    agentModeSel.value = cfg.avatars.agentMode || 'star';
    agentModeSel.addEventListener('change', (e) => this.onPatch({ avatars: { agentMode: e.target.value } }));

    const agentPreviewSrc =
      cfg.avatars.agentMode === 'custom' && media.agentAvatar
        ? media.agentAvatar
        : renderAgentStarSvg(cfg.accentColor, cfg.secondaryColor);

    const avCard = tsEl('div', { className: 'agy-ct-card' }, [
      tsEl('strong', { style: 'font-size:13.5px;', textContent: t(lang, 'avatarSection') }),
      tsEl('div', { className: 'agy-ct-row' }, [
        tsEl('label', { style: 'display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;' }, [
          userAvCb,
          t(lang, 'userAvatarEnable')
        ]),
        this.makeFileButton(t(lang, 'uploadUserAv'), 'image/*', 192, (dataUrl) => {
          this.onUploadMedia('userAvatar', dataUrl);
          this.onPatch({ avatars: { userEnabled: true } });
        }),
        tsEl('label', { style: 'display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;' }, [
          agentAvCb,
          t(lang, 'agentAvatarEnable')
        ]),
        agentModeSel,
        tsEl('img', {
          src: agentPreviewSrc,
          alt: 'Agent Avatar',
          style: `width:28px;height:28px;border-radius:${cfg.avatars.radius}%;transform:rotate(${cfg.avatars.rotate}deg);object-fit:cover;`
        }),
        this.makeFileButton(t(lang, 'uploadAgentAv'), 'image/*', 192, (dataUrl) => {
          this.onUploadMedia('agentAvatar', dataUrl);
          this.onPatch({ avatars: { agentEnabled: true, agentMode: 'custom' } });
        })
      ]),
      this.makeSliderRow(
        t(lang, 'avSize'),
        18,
        64,
        1,
        cfg.avatars.size,
        'px',
        (v) => this.onLiveUpdate({ avatars: { size: v } }),
        (v) => this.onPatch({ avatars: { size: v } })
      ),
      this.makeSliderRow(
        t(lang, 'avRadius'),
        0,
        50,
        1,
        cfg.avatars.radius,
        '%',
        (v) => this.onLiveUpdate({ avatars: { radius: v } }),
        (v) => this.onPatch({ avatars: { radius: v } })
      ),
      this.makeSliderRow(
        t(lang, 'avRotate'),
        -45,
        45,
        1,
        cfg.avatars.rotate,
        '°',
        (v) => this.onLiveUpdate({ avatars: { rotate: v } }),
        (v) => this.onPatch({ avatars: { rotate: v } })
      )
    ]);

    container.append(bubbleCard, inputCard, avCard);
  }

  renderFxTab(container, cfg, media, lang) {
    const weatherCard = tsEl('div', { className: 'agy-ct-card' }, [
      tsEl('strong', { style: 'font-size:13.5px;', textContent: t(lang, 'weatherSection') }),
      tsEl(
        'div',
        { className: 'agy-ct-grid-sm' },
        ATMOSPHERE_PRESETS.map((at) =>
          tsEl('button', {
            type: 'button',
            className: `agy-ct-item-card ${cfg.atmosphereId === at.id ? 'is-selected' : ''}`,
            textContent: lang === 'en' ? at.nameEn : at.name,
            onClick: () => this.onPatch({ atmosphereId: at.id })
          })
        )
      ),
      this.makeSliderRow(
        t(lang, 'weatherIntensity'),
        10,
        100,
        5,
        cfg.atmosphereIntensity,
        '%',
        (v) => this.onLiveUpdate({ atmosphereIntensity: v }),
        (v) => this.onPatch({ atmosphereIntensity: v })
      )
    ]);

    // Pet section
    const petCb = tsEl('input', { type: 'checkbox' });
    petCb.checked = Boolean(cfg.pet.enabled);
    petCb.addEventListener('change', (e) => this.onPatch({ pet: { enabled: e.target.checked } }));

    const speechCb = tsEl('input', { type: 'checkbox' });
    speechCb.checked = Boolean(cfg.pet.showSpeechOnClick);
    speechCb.addEventListener('change', (e) => this.onPatch({ pet: { showSpeechOnClick: e.target.checked } }));

    const modeSelect = tsEl('select', { className: 'agy-ct-select', style: 'width:auto;' }, [
      tsEl('option', { value: 'float', textContent: t(lang, 'modeFloat') }),
      tsEl('option', { value: 'roam', textContent: t(lang, 'modeRoam') }),
      tsEl('option', { value: 'follow', textContent: t(lang, 'modeFollow') })
    ]);
    modeSelect.value = cfg.pet.mode || 'float';
    modeSelect.addEventListener('change', (e) => this.onPatch({ pet: { mode: e.target.value } }));

    const petCards = Object.values(MASCOT_TEMPLATES).map((m) => {
      const iconBox = tsEl('div', {
        style: 'width:46px;height:46px;margin:0 auto;display:flex;align-items:center;justify-content:center;'
      });
      if (m.embeddedDataUri) {
        iconBox.appendChild(
          tsEl('img', {
            src: m.embeddedDataUri,
            alt: lang === 'en' ? m.nameEn : m.name,
            style: 'width:100%;height:100%;object-fit:contain;pointer-events:none;'
          })
        );
      } else {
        iconBox.innerHTML = renderMascotSvg(m.id, 'pet');
      }
      return tsEl(
        'button',
        {
          type: 'button',
          className: `agy-ct-item-card ${cfg.pet.id === m.id ? 'is-selected' : ''}`,
          style: 'align-items:center;text-align:center;',
          onClick: () => this.onPatch({ pet: { enabled: true, id: m.id } })
        },
        [iconBox, tsEl('span', { style: 'font-size:11px;', textContent: lang === 'en' ? m.nameEn : m.name })]
      );
    });

    if (media.pet) {
      petCards.push(
        tsEl(
          'button',
          {
            type: 'button',
            className: `agy-ct-item-card ${cfg.pet.id === 'custom' ? 'is-selected' : ''}`,
            style: 'align-items:center;text-align:center;',
            onClick: () => this.onPatch({ pet: { enabled: true, id: 'custom' } })
          },
          [
            tsEl('img', { src: media.pet, alt: 'Custom Pet', style: 'width:46px;height:46px;object-fit:contain;' }),
            tsEl('span', { style: 'font-size:11px;', textContent: 'Custom Pet' })
          ]
        )
      );
    }

    const petCard = tsEl('div', { className: 'agy-ct-card' }, [
      tsEl('div', { className: 'agy-ct-row' }, [
        tsEl('strong', { style: 'font-size:13.5px;', textContent: t(lang, 'petSection') }),
        tsEl('div', { style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;' }, [
          tsEl('label', { style: 'display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;' }, [
            petCb,
            t(lang, 'petEnable')
          ]),
          tsEl('label', { style: 'display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;' }, [
            speechCb,
            t(lang, 'petSpeech')
          ]),
          modeSelect,
          this.makeFileButton(t(lang, 'uploadPet'), 'image/*', 0, (dataUrl) => {
            this.onUploadMedia('pet', dataUrl);
            this.onPatch({ pet: { enabled: true, id: 'custom' } });
          })
        ])
      ]),
      tsEl('div', { className: 'agy-ct-grid-sm' }, petCards),
      this.makeSliderRow(
        t(lang, 'petSize'),
        44,
        240,
        2,
        cfg.pet.size,
        'px',
        (v) => this.onLiveUpdate({ pet: { size: v } }),
        (v) => this.onPatch({ pet: { size: v } })
      ),
      this.makeSliderRow(
        t(lang, 'petOpacity'),
        20,
        100,
        2,
        cfg.pet.opacity,
        '%',
        (v) => this.onLiveUpdate({ pet: { opacity: v } }),
        (v) => this.onPatch({ pet: { opacity: v } })
      )
    ]);

    // Stickers
    const stickerCb = tsEl('input', { type: 'checkbox' });
    stickerCb.checked = Boolean(cfg.stickers?.enabled);
    stickerCb.addEventListener('change', (e) => this.onPatch({ stickers: { enabled: e.target.checked } }));

    const activeIds = new Set((cfg.stickers?.items || []).map((it) => it.id));
    const toggleSticker = (id) => {
      const items = [...(cfg.stickers?.items || [])];
      const idx = items.findIndex((it) => it.id === id);
      if (idx >= 0) items.splice(idx, 1);
      else items.push({ id, slot: 'free', size: 50, glow: true, opacity: 95, pos: { xPct: 76, yPct: 68 } });
      this.onPatch({ stickers: { enabled: true, items } });
    };

    const stickerNodes = Object.values(STICKER_TEMPLATES).map((st) => {
      const box = tsEl('div', { style: 'width:40px;height:40px;margin:0 auto;' });
      box.innerHTML = renderStickerSvg(st.id);
      return tsEl(
        'button',
        {
          type: 'button',
          className: `agy-ct-item-card ${activeIds.has(st.id) ? 'is-selected' : ''}`,
          style: 'align-items:center;text-align:center;',
          onClick: () => toggleSticker(st.id)
        },
        [box, tsEl('span', { style: 'font-size:11px;', textContent: lang === 'en' ? st.nameEn : st.name })]
      );
    });

    if (media.sticker) {
      stickerNodes.push(
        tsEl(
          'button',
          {
            type: 'button',
            className: `agy-ct-item-card ${activeIds.has('custom') ? 'is-selected' : ''}`,
            style: 'align-items:center;text-align:center;',
            onClick: () => toggleSticker('custom')
          },
          [
            tsEl('img', { src: media.sticker, alt: 'Custom Sticker', style: 'width:40px;height:40px;object-fit:contain;' }),
            tsEl('span', { style: 'font-size:11px;', textContent: 'Custom' })
          ]
        )
      );
    }

    const stickerCard = tsEl('div', { className: 'agy-ct-card' }, [
      tsEl('div', { className: 'agy-ct-row' }, [
        tsEl('strong', { style: 'font-size:13.5px;', textContent: t(lang, 'stickerSection') }),
        tsEl('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;' }, [
          tsEl('label', { style: 'display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;' }, [
            stickerCb,
            t(lang, 'stickerEnable')
          ]),
          this.makeFileButton(t(lang, 'uploadSticker'), 'image/*', 0, (dataUrl) => {
            this.onUploadMedia('sticker', dataUrl);
            if (!activeIds.has('custom')) toggleSticker('custom');
          })
        ])
      ]),
      tsEl('div', { style: 'font-size:12px;color:#9ca3af;', textContent: t(lang, 'addStickerHint') }),
      tsEl('div', { className: 'agy-ct-grid-sm' }, stickerNodes)
    ]);

    container.append(weatherCard, petCard, stickerCard);
  }

  renderAdvancedTab(container, cfg, lang) {
    const cssArea = tsEl('textarea', {
      className: 'agy-ct-textarea',
      placeholder: '/* Custom CSS rules */'
    });
    cssArea.value = cfg.customCss || '';
    cssArea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.onPatch({ customCss: cssArea.value });
      }
    });

    const cssCard = tsEl('div', { className: 'agy-ct-card' }, [
      tsEl('div', { className: 'agy-ct-row' }, [
        tsEl('strong', { style: 'font-size:13.5px;', textContent: t(lang, 'customCssTitle') }),
        tsEl('button', {
          type: 'button',
          className: 'agy-ct-btn',
          textContent: t(lang, 'applyCss'),
          onClick: () => this.onPatch({ customCss: cssArea.value })
        })
      ]),
      cssArea
    ]);

    const pillCb = tsEl('input', { type: 'checkbox' });
    pillCb.checked = cfg.launcherPill?.enabled !== false;
    pillCb.addEventListener('change', (e) => this.onPatch({ launcherPill: { enabled: e.target.checked } }));

    const cornerSelect = tsEl('select', { className: 'agy-ct-select', style: 'width:auto;' }, [
      tsEl('option', { value: 'bottom-right', textContent: 'bottom-right' }),
      tsEl('option', { value: 'top-right', textContent: 'top-right' }),
      tsEl('option', { value: 'bottom-left', textContent: 'bottom-left' })
    ]);
    cornerSelect.value = cfg.launcherPill?.corner || 'bottom-right';
    cornerSelect.addEventListener('change', (e) => this.onPatch({ launcherPill: { corner: e.target.value } }));

    const pickerCard = tsEl('div', { className: 'agy-ct-card' }, [
      tsEl('strong', { style: 'font-size:13.5px;', textContent: t(lang, 'launcherSection') }),
      tsEl('div', { className: 'agy-ct-row' }, [
        tsEl('label', { style: 'display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;' }, [
          pillCb,
          t(lang, 'showLauncherPill')
        ]),
        tsEl('div', { style: 'display:flex;gap:8px;align-items:center;' }, [
          tsEl('span', { style: 'font-size:12px;', textContent: t(lang, 'pillCorner') }),
          cornerSelect
        ])
      ]),
      tsEl('strong', { style: 'font-size:13.5px;margin-top:6px;', textContent: t(lang, 'pickerTitle') }),
      tsEl('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;' }, [
        tsEl('button', {
          type: 'button',
          className: 'agy-ct-btn',
          textContent: t(lang, 'pickBubble'),
          onClick: () => this.onStartPicker('chatBubble', 'Chat Bubble')
        }),
        tsEl('button', {
          type: 'button',
          className: 'agy-ct-btn',
          textContent: t(lang, 'pickInput'),
          onClick: () => this.onStartPicker('chatInput', 'Composer Input')
        }),
        tsEl('button', {
          type: 'button',
          className: 'agy-ct-btn',
          textContent: t(lang, 'pickShell'),
          onClick: () => this.onStartPicker('appShell', 'App Shell')
        }),
        tsEl('button', {
          type: 'button',
          className: 'agy-ct-btn',
          textContent: t(lang, 'clearSelectors'),
          onClick: () =>
            this.onPatch({
              customSelectors: {
                appShell: '',
                sidebar: '',
                mainCanvas: '',
                chatBubble: '',
                chatInput: '',
                settingsNavList: '',
                settingsContent: ''
              }
            })
        })
      ]),
      tsEl('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;padding-top:6px;border-top:1px solid rgba(255,255,255,0.08);' }, [
        tsEl('button', {
          type: 'button',
          className: 'agy-ct-btn',
          textContent: t(lang, 'clearRamBtn'),
          onClick: () => this.onClearUnusedMedia()
        }),
        this.confirmResetPending
          ? tsEl('span', { style: 'display:inline-flex;gap:6px;align-items:center;' }, [
              tsEl('span', { style: 'font-size:12px;color:#fca5a5;', textContent: t(lang, 'confirmReset') }),
              tsEl('button', {
                type: 'button',
                className: 'agy-ct-btn agy-ct-btn-danger',
                textContent: 'OK',
                onClick: () => {
                  this.confirmResetPending = false;
                  this.onReset();
                }
              }),
              tsEl('button', {
                type: 'button',
                className: 'agy-ct-btn',
                textContent: 'Cancel',
                onClick: () => {
                  this.confirmResetPending = false;
                  this.render();
                }
              })
            ])
          : tsEl('button', {
              type: 'button',
              className: 'agy-ct-btn agy-ct-btn-danger',
              textContent: t(lang, 'resetBtn'),
              onClick: () => {
                this.confirmResetPending = true;
                this.render();
              }
            })
      ])
    ]);

    container.append(cssCard, pickerCard);
  }
}
