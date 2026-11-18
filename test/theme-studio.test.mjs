import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

import { buildBundle } from '../scripts/build.mjs';
import { MASCOT_TEMPLATES } from '../src/assets/mascots.js';
import { DEFAULT_CONFIG } from '../src/core/config-store.js';
import { SurfaceEngine } from '../src/core/surface-engine.js';
import { ThemeStudio } from '../src/ui/theme-studio.js';

function createDomStubEnvironment() {
  const makeClassList = () => {
    const set = new Set();
    return {
      add: (...cls) => cls.forEach((c) => set.add(c)),
      remove: (...cls) => cls.forEach((c) => set.delete(c)),
      toggle: (c, force) => (force === undefined ? (set.has(c) ? set.delete(c) : set.add(c)) : force ? set.add(c) : set.delete(c)),
      contains: (c) => set.has(c)
    };
  };

  const makeEl = (tag) => {
    const listeners = new Map();
    const el = {
      tagName: tag.toUpperCase(),
      id: '',
      className: '',
      dataset: {},
      style: { setProperty() {}, removeProperty() {} },
      classList: makeClassList(),
      children: [],
      parentElement: null,
      parentNode: null,
      attributes: {},
      _value: '',
      _textContent: '',
      get value() {
        return this._value;
      },
      set value(v) {
        this._value = String(v);
      },
      get textContent() {
        return this._textContent;
      },
      set textContent(v) {
        this._textContent = String(v);
        if (v === '') this.children = [];
      },
      set innerHTML(_v) {},
      appendChild(child) {
        if (child && typeof child === 'object') {
          if (child.parentElement && Array.isArray(child.parentElement.children)) {
            child.parentElement.children = child.parentElement.children.filter((c) => c !== child);
          }
          child.parentElement = this;
          child.parentNode = this;
          this.children.push(child);
        }
        return child;
      },
      insertBefore(newNode, refNode) {
        if (!refNode) return this.appendChild(newNode);
        const idx = this.children.indexOf(refNode);
        newNode.parentElement = this;
        newNode.parentNode = this;
        if (idx === -1) this.children.push(newNode);
        else this.children.splice(idx, 0, newNode);
        return newNode;
      },
      prepend(child) {
        if (child && typeof child === 'object') {
          child.parentElement = this;
          child.parentNode = this;
          this.children.unshift(child);
        }
      },
      append(...nodes) {
        nodes.forEach((n) => {
          if (typeof n !== 'string') this.appendChild(n);
        });
      },
      setAttribute(k, v) {
        if (k === 'id') this.id = String(v);
        if (k === 'class') this.className = String(v);
        this.attributes[k] = v;
      },
      getAttribute(k) {
        return this.attributes[k] ?? null;
      },
      removeAttribute(k) {
        delete this.attributes[k];
      },
      closest() {
        return null;
      },
      contains(target) {
        if (target === this) return true;
        return this.children.some((c) => c.contains?.(target));
      },
      getBoundingClientRect() {
        return { left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 };
      },
      addEventListener(type, fn) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(fn);
      },
      removeEventListener() {},
      dispatch(type) {
        for (const fn of listeners.get(type) || []) {
          fn({ target: this, preventDefault() {}, stopPropagation() {} });
        }
      },
      click() {
        this.dispatch('click');
      },
      querySelectorAll() {
        return [];
      },
      querySelector() {
        return null;
      },
      remove() {}
    };
    return el;
  };

  const doc = {
    readyState: 'complete',
    documentElement: makeEl('html'),
    head: makeEl('head'),
    body: makeEl('body'),
    createElement: (tag) => makeEl(tag),
    createTextNode: (t) => t,
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    removeEventListener() {}
  };
  return { doc, makeEl };
}

function findFirst(root, predicate) {
  if (!root || typeof root !== 'object') return null;
  if (predicate(root)) return root;
  for (const ch of root.children || []) {
    const found = findFirst(ch, predicate);
    if (found) return found;
  }
  return null;
}

test('ThemeStudio Export JSON retains payload in textarea when clipboard rejects or is absent', async () => {
  const origDoc = globalThis.document;
  const origNavDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const { doc } = createDomStubEnvironment();
  globalThis.document = doc;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      clipboard: {
        writeText: () => Promise.reject(new Error('Clipboard permission denied'))
      }
    }
  });

  try {
    const studio = new ThemeStudio({
      getConfig: () => ({ ...DEFAULT_CONFIG, lang: 'en' }),
      getCustomMedia: () => ({}),
      onPatch: () => {},
      onLiveUpdate: () => {},
      onBundleApply: () => {},
      onReset: () => {},
      onUploadMedia: () => {},
      onDeleteMedia: () => {},
      onClearUnusedMedia: () => {},
      onStartPicker: () => {},
      onClose: () => {}
    });

    studio.open('presets');
    const exportBtn = findFirst(studio.getElement(), (el) => el.tagName === 'BUTTON' && el.textContent.includes('Export JSON'));
    assert.ok(exportBtn, 'Expected Export JSON button');
    exportBtn.dispatch('click');
    await new Promise((r) => setTimeout(r, 10));

    const textarea = findFirst(studio.getElement(), (el) => el.tagName === 'TEXTAREA');
    assert.ok(textarea, 'Fallback textarea must be rendered when clipboard rejects');
    assert.ok(textarea.value.includes('"wallpaperId"'), 'Exported JSON must survive render() into fallback textarea');
  } finally {
    globalThis.document = origDoc;
    if (origNavDesc) Object.defineProperty(globalThis, 'navigator', origNavDesc);
    else delete globalThis.navigator;
  }
});

test('Bundle ThemeStudio close button restores native Settings panes without leaving them blank', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..');
  const tmpOut = path.join(os.tmpdir(), `agy-studio-close-${Date.now()}.js`);
  try {
    const built = buildBundle({ rootDir: repoRoot, outFile: tmpOut });
    const { doc, makeEl } = createDomStubEnvironment();
    const shell = makeEl('div');
    const modal = makeEl('div');
    const navList = makeEl('div');
    navList.id = 'mock-nav';
    const appearanceBtn = makeEl('button');
    appearanceBtn.textContent = 'Appearance';
    const contentPane = makeEl('div');
    contentPane.id = 'mock-content';
    const nativePane = makeEl('div');
    nativePane.textContent = 'Native Appearance Controls';

    navList.appendChild(appearanceBtn);
    navList.querySelectorAll = () => navList.children;
    contentPane.appendChild(nativePane);
    modal.append(navList, contentPane);
    doc.body.append(shell, modal);

    const byId = (root, id) => findFirst(root, (el) => el.id === id);
    doc.getElementById = (id) => byId(doc.body, id) || byId(doc.head, id);
    doc.querySelector = (sel) => {
      if (sel.includes('.agy-shell') || sel.includes('data-agy-mock-shell')) return shell;
      if (sel.includes('.settings-modal-container')) return modal;
      if (sel.includes('[data-agy-ct-nav="custom-theme"]')) {
        return findFirst(doc.body, (el) => el.getAttribute?.('data-agy-ct-nav') === 'custom-theme');
      }
      return null;
    };
    doc.querySelectorAll = (sel) => {
      if (sel === '#mock-nav') return [navList];
      if (sel === '#mock-content') return [contentPane];
      if (sel.includes('settings-modal-container')) return [modal];
      return [];
    };

    const sandbox = {
      __AGY_THEME_BOOT__: {
        config: {
          ...DEFAULT_CONFIG,
          customSelectors: { settingsNavList: '#mock-nav', settingsContent: '#mock-content' }
        },
        media: {}
      },
      document: doc,
      innerWidth: 1280,
      innerHeight: 720,
      devicePixelRatio: 1,
      addEventListener() {},
      removeEventListener() {},
      getComputedStyle: () => ({ position: 'static', display: 'block' }),
      requestAnimationFrame: () => 1,
      cancelAnimationFrame() {},
      MutationObserver: class {
        observe() {}
        disconnect() {}
      },
      ResizeObserver: class {
        observe() {}
        disconnect() {}
      },
      navigator: {},
      setTimeout,
      clearTimeout
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;

    new vm.Script(built.code).runInNewContext(sandbox);
    assert.equal(sandbox.__AGY_CUSTOM_THEME__.isMounted, true);

    const navBtn = doc.querySelector('[data-agy-ct-nav="custom-theme"]');
    assert.ok(navBtn, 'Expected injected Custom theme nav button');
    navBtn.click();
    assert.equal(nativePane.classList.contains('agy-ct-hidden-native'), true);

    const studioPanel = doc.getElementById('agy-ct-settings-panel');
    const closeBtn = findFirst(
      studioPanel,
      (el) => el.tagName === 'BUTTON' && (el.textContent.includes('Đóng') || el.textContent.includes('Close'))
    );
    assert.ok(closeBtn, 'Expected Studio close button');
    closeBtn.click();

    assert.equal(
      nativePane.classList.contains('agy-ct-hidden-native'),
      false,
      'Closing Theme Studio inside native Settings must restore hidden native Settings panes'
    );
  } finally {
    fs.rmSync(tmpOut, { force: true });
  }
});

test('ThemeStudio Chat tab renders readable dark text inside light input preset previews', () => {
  const origDoc = globalThis.document;
  const origLuffyUri = MASCOT_TEMPLATES['luffy-anime'].embeddedDataUri;
  const { doc } = createDomStubEnvironment();
  globalThis.document = doc;

  try {
    MASCOT_TEMPLATES['luffy-anime'].embeddedDataUri = 'data:image/webp;base64,STUDIOIMG';
    const studio = new ThemeStudio({
      getConfig: () => ({ ...DEFAULT_CONFIG, lang: 'en' }),
      getCustomMedia: () => ({}),
      onPatch: () => {},
      onLiveUpdate: () => {},
      onBundleApply: () => {},
      onReset: () => {},
      onUploadMedia: () => {},
      onDeleteMedia: () => {},
      onClearUnusedMedia: () => {},
      onStartPicker: () => {},
      onClose: () => {}
    });

    studio.open('chat');
    const root = studio.getElement();

    const findInputButton = (label) =>
      findFirst(root, (el) => el.tagName === 'BUTTON' && el.className.includes('agy-ct-item-card') && findFirst(el, (c) => c.tagName === 'SPAN' && c.textContent === label));

    for (const lightLabel of ['Frosted Lotus Light', 'Grand Line Chart (Light)']) {
      const btn = findInputButton(lightLabel);
      assert.ok(btn, `Expected input preset button for ${lightLabel}`);
      const preview = findFirst(btn, (el) => el.tagName === 'DIV' && el.textContent === 'Ask anything...');
      assert.ok(preview, `Expected Ask anything... preview in ${lightLabel}`);
      assert.ok(!preview.style.cssText.includes('#9ca3af'), `${lightLabel} preview must not use low-contrast #9ca3af text`);
      assert.ok(/#475569|#334155|#0f172a|#1e293b/i.test(preview.style.cssText), `${lightLabel} preview must use dark slate ink`);
    }

    const darkBtn = findInputButton('Sunny Sunset Deck');
    assert.ok(darkBtn, 'Expected Sunny Sunset Deck input button');
    const darkPreview = findFirst(darkBtn, (el) => el.tagName === 'DIV' && el.textContent === 'Ask anything...');
    assert.ok(darkPreview, 'Expected Ask anything... preview in Sunny Sunset Deck');
    assert.ok(darkPreview.style.cssText.includes('#9ca3af') || darkPreview.style.cssText.includes('#cbd5e1'), 'Dark input preview should keep light muted text');

    studio.open('fx');
    const fxRoot = studio.getElement();
    const petSizeSlider = findFirst(
      fxRoot,
      (el) => el.tagName === 'INPUT' && el.getAttribute?.('type') === 'range' && String(el.getAttribute?.('min')) === '44'
    );
    assert.ok(petSizeSlider, 'Expected pet size range slider in FX tab');
    assert.equal(String(petSizeSlider.getAttribute('max')), '240', 'Pet size slider max must be 240 for full-body models');

    const petThumbImg = findFirst(
      fxRoot,
      (el) => el.tagName === 'IMG' && el.getAttribute?.('src') === 'data:image/webp;base64,STUDIOIMG'
    );
    assert.ok(petThumbImg, 'Expected FX tab mascot card to render <img> thumbnail when embeddedDataUri is present');
    assert.equal(petThumbImg.getAttribute?.('alt'), 'Anime Luffy (Full Body)');
    assert.ok(petThumbImg.style.cssText.includes('pointer-events:none'), 'FX pet thumbnail img must use pointer-events:none');
  } finally {
    MASCOT_TEMPLATES['luffy-anime'].embeddedDataUri = origLuffyUri;
    globalThis.document = origDoc;
  }
});
