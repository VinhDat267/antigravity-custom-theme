import test from 'node:test';
import assert from 'node:assert/strict';

import { AmbientCanvasEngine } from '../src/fx/ambient-canvas.js';
import { clampOutsideHole, PetStage } from '../src/fx/pet-stage.js';
import { StickerLayer } from '../src/fx/sticker-layer.js';

function createMockCanvas() {
  const calls = [];
  const ctx = {
    setTransform: (...args) => calls.push(['setTransform', ...args]),
    clearRect: (...args) => calls.push(['clearRect', ...args]),
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fill: () => {},
    arc: () => {},
    ellipse: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {}
  };
  return {
    calls,
    width: 0,
    height: 0,
    style: { clipPath: 'none' },
    getContext: () => ctx
  };
}

test('AmbientCanvasEngine seeds particles for all 6 active weather modes, pauses when hidden, and applies hole clipPath', () => {
  const listeners = new Map();
  let rafCounter = 1;
  const cancelled = [];
  const mockDoc = {
    hidden: false,
    addEventListener: (ev, fn) => listeners.set(ev, fn),
    removeEventListener: (ev) => listeners.delete(ev)
  };
  const mockWin = {
    innerWidth: 1400,
    innerHeight: 900,
    devicePixelRatio: 2,
    addEventListener: () => {},
    removeEventListener: () => {},
    requestAnimationFrame: () => rafCounter++,
    cancelAnimationFrame: (id) => cancelled.push(id)
  };

  const canvas = createMockCanvas();
  const engine = new AmbientCanvasEngine(canvas, { envWindow: mockWin, envDocument: mockDoc });

  for (const mode of ['thunder-rain', 'rain', 'stardust', 'sakura', 'fireflies', 'snow']) {
    engine.configure(mode, 70);
    assert.ok(engine.particles.length > 0, `Expected seeded particles for ${mode}`);
  }

  engine.setHoleClip('polygon(evenodd, 0 0, 100% 0)');
  assert.equal(canvas.style.clipPath, 'polygon(evenodd, 0 0, 100% 0)');

  assert.ok(engine.rafId !== null);
  mockDoc.hidden = true;
  listeners.get('visibilitychange')?.();
  assert.equal(engine.rafId, null);
  assert.ok(cancelled.length > 0);

  engine.configure('none', 0);
  assert.equal(engine.particles.length, 0);
  engine.destroy();
});

test('clampOutsideHole keeps pets and stickers outside active Split-Browser hole', () => {
  const hole = { left: 700, top: 40, right: 1400, bottom: 900 };
  const viewport = { width: 1400, height: 900 };

  const clamped = clampOutsideHole(850, 200, 88, hole, viewport);
  assert.ok(clamped.x <= 700 - 88 - 8, `Expected x <= 604, got ${clamped.x}`);

  const untouched = clampOutsideHole(120, 180, 88, hole, viewport);
  assert.deepEqual(untouched, { x: 120, y: 180 });

  const noHole = clampOutsideHole(850, 200, 88, null, viewport);
  assert.deepEqual(noHole, { x: 850, y: 200 });

  assert.equal(typeof PetStage, 'function');
  assert.equal(typeof StickerLayer, 'function');
});

test('PetStage positions via GPU translate3d and puts follow rAF loop to sleep once settled', () => {
  const origDoc = globalThis.document;
  const origWin = globalThis.window;
  const rafQueue = [];
  const winListeners = new Map();
  const makeStubEl = () => ({
    id: '',
    className: '',
    style: { left: '', top: '', transform: '', width: '', height: '', opacity: '', cssText: '' },
    children: [],
    setAttribute() {},
    addEventListener() {},
    remove() {},
    append(...kids) {
      this.children.push(...kids);
    },
    appendChild(k) {
      this.children.push(k);
    }
  });

  const bodyEl = {
    contains: () => true,
    appendChild() {}
  };
  globalThis.document = {
    hidden: false,
    body: bodyEl,
    createElement: () => makeStubEl(),
    addEventListener() {},
    removeEventListener() {}
  };
  globalThis.window = {
    innerWidth: 1200,
    innerHeight: 800,
    addEventListener: (k, fn) => winListeners.set(k, fn),
    removeEventListener: (k) => winListeners.delete(k),
    requestAnimationFrame: (fn) => {
      rafQueue.push(fn);
      return rafQueue.length;
    },
    cancelAnimationFrame: () => {}
  };

  try {
    const pet = new PetStage({
      getConfig: () => ({
        enabled: true,
        lang: 'en',
        pet: { enabled: true, id: 'rong-ngoc', mode: 'follow', size: 80, opacity: 95, pos: { xPct: 20, yPct: 20 } }
      }),
      getCustomMedia: () => ({}),
      getBrowserHoleRect: () => null,
      onPositionSave: () => {}
    });
    pet.update();

    assert.match(pet.stageEl.style.transform, /^translate3d\(\d+px,\s*\d+px,\s*0\)$/);
    assert.equal(pet.stageEl.style.left, '');

    // Settle target equal to current pos -> rAF loop must sleep (rafId === null)
    pet.target = { ...pet.pos };
    const tick = rafQueue.pop();
    assert.ok(typeof tick === 'function');
    tick();
    assert.equal(pet.rafId, null, 'Follow mode must sleep rAF when mouse and pet are settled');

    // Moving mouse wakes rAF loop again
    winListeners.get('mousemove')?.({ clientX: 600, clientY: 300 });
    assert.ok(pet.rafId !== null, 'Mousemove must wake follow rAF loop');
    pet.destroy();
  } finally {
    globalThis.document = origDoc;
    globalThis.window = origWin;
  }
});

test('AmbientCanvasEngine draws fireflies and stardust without ctx.shadowBlur and respects delta-time', () => {
  const ctxShadowSets = [];
  const drawnImages = [];
  const offCtx = {
    createRadialGradient: () => ({ addColorStop() {} }),
    fillStyle: '',
    fillRect: () => {}
  };
  const mockDoc = {
    hidden: false,
    createElement: () => ({ width: 0, height: 0, getContext: () => offCtx }),
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  const mockWin = {
    innerWidth: 1200,
    innerHeight: 800,
    devicePixelRatio: 1,
    addEventListener: () => {},
    removeEventListener: () => {},
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {}
  };
  const mainCtx = {
    setTransform: () => {},
    clearRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fill: () => {},
    arc: () => {},
    ellipse: () => {},
    drawImage: (...args) => drawnImages.push(args),
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    globalAlpha: 1
  };
  Object.defineProperty(mainCtx, 'shadowBlur', {
    get: () => 0,
    set: (v) => {
      if (v > 0) ctxShadowSets.push(v);
    }
  });
  const canvas = { width: 0, height: 0, style: { clipPath: 'none' }, getContext: () => mainCtx };

  const engine = new AmbientCanvasEngine(canvas, { envWindow: mockWin, envDocument: mockDoc });
  engine.configure('fireflies', 60);
  engine.drawFrame(100);
  engine.configure('stardust', 60);
  engine.drawFrame(132);

  assert.equal(ctxShadowSets.length, 0, 'Glow modes must use cached radial sprite instead of ctx.shadowBlur');
  assert.ok(drawnImages.length > 0, 'Expected cached glow sprite drawImage calls');
  engine.destroy();
});

test('AmbientCanvasEngine throttles frame interval when window blurs and restores 60fps on focus', () => {
  const winListeners = new Map();
  const mockDoc = {
    hidden: false,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  const mockWin = {
    innerWidth: 1200,
    innerHeight: 800,
    devicePixelRatio: 1,
    addEventListener: (ev, fn) => winListeners.set(ev, fn),
    removeEventListener: (ev) => winListeners.delete(ev),
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {}
  };

  const canvas = createMockCanvas();
  const engine = new AmbientCanvasEngine(canvas, { envWindow: mockWin, envDocument: mockDoc });
  engine.configure('snow', 50);
  assert.equal(engine.frameIntervalMs, 14);

  winListeners.get('blur')?.();
  assert.ok(engine.frameIntervalMs >= 45, `Expected blurred interval >= 45ms, got ${engine.frameIntervalMs}`);

  winListeners.get('focus')?.();
  assert.equal(engine.frameIntervalMs, 14);
  engine.destroy();
});

test('StickerLayer repositions on split composer ResizeObserver and follows focused [data-pane-id] session', () => {
  const origDoc = globalThis.document;
  const origWin = globalThis.window;
  const origRO = globalThis.ResizeObserver;
  const origRaf = globalThis.requestAnimationFrame;
  const origCancelRaf = globalThis.cancelAnimationFrame;

  try {
    const docListeners = new Map();
    const observed = new Set();
    let roCallback = null;
    const rafQueue = [];

    const makeStickerNode = () => ({
      className: '',
      title: '',
      innerHTML: '',
      textContent: '',
      dataset: {},
      classList: { toggle() {} },
      style: { width: '', height: '', opacity: '', transform: '' },
      setAttribute() {},
      addEventListener() {},
      remove() {},
      appendChild() {}
    });

    const rect1 = { left: 260, top: 820, right: 960, bottom: 910, width: 700, height: 90 };
    const rect2 = { left: 980, top: 820, right: 1680, bottom: 910, width: 700, height: 90 };
    const makeComposer = (paneId, rect) => ({
      getBoundingClientRect: () => rect,
      closest: (sel) => (sel === '[data-pane-id]' ? { getAttribute: (k) => (k === 'data-pane-id' ? paneId : null) } : null)
    });
    const comp1 = makeComposer('pane-1', rect1);
    const comp2 = makeComposer('pane-2', rect2);

    const nodes = [];
    globalThis.document = {
      body: {
        appendChild: (el) => nodes.push(el)
      },
      createElement: () => makeStickerNode(),
      querySelector: () => null,
      addEventListener: (ev, fn) => docListeners.set(ev, fn),
      removeEventListener: (ev) => docListeners.delete(ev)
    };
    globalThis.window = {
      innerWidth: 1753,
      innerHeight: 942,
      addEventListener() {},
      removeEventListener() {}
    };
    globalThis.ResizeObserver = class {
      constructor(cb) {
        roCallback = cb;
      }
      observe(el) {
        observed.add(el);
      }
      unobserve(el) {
        observed.delete(el);
      }
      disconnect() {
        observed.clear();
      }
    };
    globalThis.requestAnimationFrame = (fn) => {
      rafQueue.push(fn);
      return rafQueue.length;
    };
    globalThis.cancelAnimationFrame = () => {};

    const flushRaf = () => {
      while (rafQueue.length > 0) {
        rafQueue.shift()();
      }
    };

    const layer = new StickerLayer({
      getConfig: () => ({
        enabled: true,
        stickers: {
          enabled: true,
          items: [
            { id: 'hoa-anh-dao', slot: 'input-top-right', size: 50 },
            { id: 'den-long', slot: 'input-top-left', size: 46 }
          ]
        }
      }),
      getCustomMedia: () => ({}),
      findInputBoxes: () => [comp1, comp2],
      getBrowserHoleRect: () => null,
      onStickerMove: () => {}
    });

    layer.update();
    assert.equal(observed.has(comp1), true);
    assert.equal(observed.has(comp2), true);
    assert.equal(nodes.length, 2);
    assert.match(nodes[0].style.transform, /^translate3d\(924px,/);
    assert.match(nodes[1].style.transform, /^translate3d\(247px,/);

    docListeners.get('focusin')?.({
      target: { closest: (sel) => (sel === '[data-pane-id]' ? { getAttribute: () => 'pane-2' } : null) }
    });
    flushRaf();
    assert.match(nodes[0].style.transform, /^translate3d\(1644px,/);
    assert.match(nodes[1].style.transform, /^translate3d\(967px,/);

    rect2.right = 1500;
    rect2.width = 520;
    roCallback?.();
    flushRaf();
    assert.match(nodes[0].style.transform, /^translate3d\(1464px,/);

    layer.destroy();
  } finally {
    globalThis.document = origDoc;
    globalThis.window = origWin;
    globalThis.ResizeObserver = origRO;
    globalThis.requestAnimationFrame = origRaf;
    globalThis.cancelAnimationFrame = origCancelRaf;
  }
});

test('PetStage roam mode sleeps rAF once target is reached and wakes on next roam interval; AmbientCanvasEngine scales DPR, interval, and particle count in multi-split mode', () => {
  const origDoc = globalThis.document;
  const origWin = globalThis.window;
  const rafQueue = [];

  const makeStubEl = () => ({
    id: '',
    className: '',
    style: { left: '', top: '', transform: '', width: '', height: '', opacity: '', cssText: '' },
    children: [],
    classList: { add() {}, remove() {} },
    setAttribute() {},
    addEventListener() {},
    remove() {},
    append(...kids) {
      this.children.push(...kids);
    },
    appendChild(k) {
      this.children.push(k);
    }
  });

  try {
    globalThis.document = {
      hidden: false,
      body: { contains: () => true, appendChild() {} },
      createElement: () => makeStubEl(),
      addEventListener() {},
      removeEventListener() {}
    };
    globalThis.window = {
      innerWidth: 1600,
      innerHeight: 900,
      addEventListener() {},
      removeEventListener() {},
      requestAnimationFrame: (fn) => {
        rafQueue.push(fn);
        return rafQueue.length;
      },
      cancelAnimationFrame() {}
    };

    const pet = new PetStage({
      getConfig: () => ({
        enabled: true,
        lang: 'en',
        pet: { enabled: true, id: 'ho-ly-chibi', mode: 'roam', size: 80, opacity: 95, pos: { xPct: 20, yPct: 20 } }
      }),
      getCustomMedia: () => ({}),
      getBrowserHoleRect: () => null,
      onPositionSave: () => {}
    });
    try {
      pet.update();
      assert.ok(pet.rafId !== null, 'Roam loop must start initially');

      pet.target = { ...pet.pos };
      const tick = rafQueue.pop();
      assert.ok(typeof tick === 'function');
      tick();
      assert.equal(pet.rafId, null, 'Roam mode must sleep rAF loop once pet settles at target');
    } finally {
      pet.destroy();
    }

    const canvas = createMockCanvas();
    const mockDoc = {
      hidden: false,
      addEventListener() {},
      removeEventListener() {}
    };
    const mockWin = {
      innerWidth: 1600,
      innerHeight: 900,
      devicePixelRatio: 2,
      addEventListener() {},
      removeEventListener() {},
      requestAnimationFrame: () => 1,
      cancelAnimationFrame() {}
    };
    const engine = new AmbientCanvasEngine(canvas, { envWindow: mockWin, envDocument: mockDoc });
    engine.configure('sakura', 70);
    assert.equal(canvas.width, 2400);
    assert.equal(engine.frameIntervalMs, 14);
    const singleCount = engine.particles.length;

    engine.setSplitCount(3);
    assert.equal(canvas.width, 1600);
    assert.ok(engine.frameIntervalMs >= 32, `Expected frameIntervalMs >= 32 for 3 panes, got ${engine.frameIntervalMs}`);
    assert.ok(engine.particles.length < singleCount, 'Expected fewer particles in 3-pane split mode');

    engine.setSplitCount(1);
    assert.equal(canvas.width, 2400);
    assert.equal(engine.frameIntervalMs, 14);
    engine.destroy();
  } finally {
    globalThis.document = origDoc;
    globalThis.window = origWin;
  }
});
