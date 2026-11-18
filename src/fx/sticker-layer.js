/**
 * Slot-Anchored & Free-Draggable Decorative Sticker Layer.
 * Automatically avoids overlapping active Split-Browser holes.
 */

import { STICKER_TEMPLATES, renderStickerSvg } from '../assets/stickers.js';
import { clampOutsideHole } from './pet-stage.js';

export class StickerLayer {
  constructor({ getConfig, getCustomMedia, findInputBox, findInputBoxes, getBrowserHoleRect, onStickerMove }) {
    this.getConfig = getConfig;
    this.getCustomMedia = getCustomMedia;
    this.findInputBox = findInputBox;
    this.findInputBoxes = findInputBoxes || null;
    this.getBrowserHoleRect = getBrowserHoleRect;
    this.onStickerMove = onStickerMove;

    this.nodes = new Map();
    this.activePaneId = null;
    this.rafId = 0;
    this.resizeObserver = null;
    this.observedTargets = new Set();

    this.repositionHandler = () => this.scheduleReposition();
    this.onPaneInteract = (e) => {
      const pane = e?.target?.closest?.('[data-pane-id]');
      const id = pane?.getAttribute?.('data-pane-id') || null;
      if (id && id !== this.activePaneId) {
        this.activePaneId = id;
        this.scheduleReposition();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener?.('resize', this.repositionHandler, { passive: true });
    }
    if (typeof document !== 'undefined') {
      document.addEventListener?.('pointerdown', this.onPaneInteract, { passive: true });
      document.addEventListener?.('focusin', this.onPaneInteract);
    }
  }

  scheduleReposition() {
    if (this.nodes.size === 0 || this.rafId) return;
    if (typeof requestAnimationFrame === 'function') {
      this.rafId = requestAnimationFrame(() => {
        this.rafId = 0;
        this.repositionAll();
      });
    } else {
      this.repositionAll();
    }
  }

  syncResizeTargets(targets) {
    if (typeof ResizeObserver === 'undefined') return;
    if (!this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.scheduleReposition());
    }
    const nextSet = new Set(targets.filter(Boolean));
    for (const el of this.observedTargets) {
      if (!nextSet.has(el)) {
        this.resizeObserver.unobserve?.(el);
        this.observedTargets.delete(el);
      }
    }
    for (const el of nextSet) {
      if (!this.observedTargets.has(el)) {
        this.resizeObserver.observe(el);
        this.observedTargets.add(el);
      }
    }
  }

  update() {
    const cfg = this.getConfig();
    const stickersCfg = cfg.stickers || { enabled: false, items: [] };

    if (!cfg.enabled || !stickersCfg.enabled || !Array.isArray(stickersCfg.items) || stickersCfg.items.length === 0) {
      this.clearAll();
      return;
    }

    const activeKeys = new Set();
    const customUrl = this.getCustomMedia?.().sticker || '';

    stickersCfg.items.forEach((item, index) => {
      const key = `${index}:${item.id}`;
      activeKeys.add(key);

      let node = this.nodes.get(key);
      if (!node) {
        node = this.createNode(index, item, customUrl);
        this.nodes.set(key, node);
        document.body.appendChild(node);
      } else {
        const expectedRender = item.id === 'custom' ? `custom:${customUrl}` : `tpl:${item.id}`;
        if (node.dataset.renderKey !== expectedRender) {
          node.dataset.renderKey = expectedRender;
          this.renderIntoNode(node, item.id, customUrl);
        }
      }

      const size = Math.max(24, Math.min(120, Number(item.size) || 50));
      const opacity = Math.max(0.2, Math.min(1, (item.opacity ?? 95) / 100));
      node.style.width = `${size}px`;
      node.style.height = `${size}px`;
      node.style.opacity = String(opacity);
      node.classList.toggle('has-glow', item.glow !== false);
      node.dataset.index = String(index);
    });

    for (const [key, node] of this.nodes.entries()) {
      if (!activeKeys.has(key)) {
        node.remove();
        this.nodes.delete(key);
      }
    }

    this.repositionAll();
  }

  applyNodeCoords(node, x, y) {
    const next = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    if (node.dataset?.lastTransform !== next) {
      if (node.dataset) node.dataset.lastTransform = next;
      node.style.transform = next;
    }
  }

  renderIntoNode(node, id, customUrl) {
    if (id === 'custom' && customUrl) {
      node.textContent = '';
      const img = document.createElement('img');
      img.src = customUrl;
      img.alt = 'Custom Sticker';
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;';
      node.appendChild(img);
      return;
    }
    const tplId = STICKER_TEMPLATES[id] ? id : 'trang-sao';
    node.innerHTML = renderStickerSvg(tplId);
  }

  createNode(index, item, customUrl) {
    const node = document.createElement('div');
    node.className = 'agy-ct-sticker-node';
    node.setAttribute('data-agy-ct-injected', 'true');
    node.dataset.index = String(index);
    node.dataset.renderKey = item.id === 'custom' ? `custom:${customUrl}` : `tpl:${item.id}`;
    node.title = 'Drag sticker';
    this.renderIntoNode(node, item.id, customUrl);

    let dragging = false;
    let offset = { x: 0, y: 0 };

    node.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      dragging = true;
      const rect = node.getBoundingClientRect();
      offset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      node.setPointerCapture?.(e.pointerId);
    });

    node.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const size = parseFloat(node.style.width) || 50;
      const clamped = clampOutsideHole(
        e.clientX - offset.x,
        e.clientY - offset.y,
        size,
        this.getBrowserHoleRect?.(),
        { width: window.innerWidth, height: window.innerHeight }
      );
      this.applyNodeCoords(node, clamped.x, clamped.y);
    });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      const rect = node.getBoundingClientRect();
      const xPct = Math.round((rect.left / Math.max(1, window.innerWidth)) * 1000) / 10;
      const yPct = Math.round((rect.top / Math.max(1, window.innerHeight)) * 1000) / 10;
      const idx = Number(node.dataset.index);
      this.onStickerMove?.(idx, { slot: 'free', pos: { xPct, yPct } });
    };

    node.addEventListener('pointerup', endDrag);
    node.addEventListener('pointercancel', endDrag);
    return node;
  }

  repositionAll() {
    if (this.nodes.size === 0) return;
    const cfg = this.getConfig();
    const items = cfg.stickers?.items || [];
    const boxes = this.findInputBoxes
      ? this.findInputBoxes()
      : this.findInputBox
        ? [this.findInputBox()].filter(Boolean)
        : [];
    const sidebarEl =
      typeof document !== 'undefined'
        ? document.querySelector?.('.agy-shell .bg-sidebar, [data-agy-mock-shell] .bg-sidebar')
        : null;
    this.syncResizeTargets([...boxes, ...(sidebarEl ? [sidebarEl] : [])]);
    const inputEl =
      (this.activePaneId &&
        boxes.find((b) => b.closest?.('[data-pane-id]')?.getAttribute?.('data-pane-id') === this.activePaneId)) ||
      boxes[0] ||
      null;
    const inputRect = inputEl ? inputEl.getBoundingClientRect() : null;
    const sidebarRect = sidebarEl ? sidebarEl.getBoundingClientRect() : null;
    const holeRect = this.getBrowserHoleRect?.();

    items.forEach((item, index) => {
      const key = `${index}:${item.id}`;
      const node = this.nodes.get(key);
      if (!node) return;
      const size = Math.max(24, Math.min(120, Number(item.size) || 50));
      let x = 0;
      let y = 0;

      if (item.slot === 'input-top-right' && inputRect && inputRect.width > 40) {
        x = inputRect.right - size * 0.72;
        y = inputRect.top - size * 0.56;
      } else if (item.slot === 'input-top-left' && inputRect && inputRect.width > 40) {
        x = inputRect.left - size * 0.28;
        y = inputRect.top - size * 0.56;
      } else if (item.slot === 'sidebar-bottom-right' && sidebarRect && sidebarRect.width > 40) {
        x = sidebarRect.right - size - 10;
        y = sidebarRect.bottom - size - 14;
      } else if (item.slot === 'greeting-badge') {
        x = inputRect ? inputRect.left + inputRect.width * 0.78 : window.innerWidth * 0.65;
        y = inputRect ? Math.max(60, inputRect.top - 110) : window.innerHeight * 0.42;
      } else if (item.slot === 'free' && item.pos) {
        x = (item.pos.xPct / 100) * window.innerWidth;
        y = (item.pos.yPct / 100) * window.innerHeight;
      } else {
        x = window.innerWidth - size - 36;
        y = window.innerHeight - size - 120;
      }

      const clamped = clampOutsideHole(x, y, size, holeRect, {
        width: window.innerWidth,
        height: window.innerHeight
      });
      this.applyNodeCoords(node, clamped.x, clamped.y);
    });
  }

  clearAll() {
    for (const node of this.nodes.values()) {
      node.remove();
    }
    this.nodes.clear();
    for (const el of this.observedTargets) {
      this.resizeObserver?.unobserve?.(el);
    }
    this.observedTargets.clear();
  }

  destroy() {
    if (this.rafId && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.rafId);
    }
    this.rafId = 0;
    if (typeof window !== 'undefined') {
      window.removeEventListener?.('resize', this.repositionHandler);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener?.('pointerdown', this.onPaneInteract);
      document.removeEventListener?.('focusin', this.onPaneInteract);
    }
    this.resizeObserver?.disconnect?.();
    this.resizeObserver = null;
    this.observedTargets.clear();
    this.clearAll();
  }
}
