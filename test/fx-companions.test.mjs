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
