/**
 * Lightweight Ambient Particle Canvas Engine.
 * Supports 6 weather modes: thunder-rain, rain, stardust, sakura, fireflies, snow (+ none).
 * Caps DPR at 1.5, paces frames (~24ms), pauses when document.hidden, and clips to Split-Browser holes.
 */

export class AmbientCanvasEngine {
  constructor(canvas, { envWindow, envDocument } = {}) {
    this.canvas = canvas;
    this.win = envWindow || (typeof window !== 'undefined' ? window : null);
    this.doc = envDocument || (typeof document !== 'undefined' ? document : null);
    this.ctx = canvas?.getContext ? canvas.getContext('2d') : null;
    this.mode = 'none';
    this.intensity = 65;
    this.particles = [];
    this.sparks = [];
    this.rafId = null;
    this.lastTs = 0;
    this.lastDrawTs = 0;
    this.splitCount = 1;
    this.frameIntervalMs = 14;
    this.unfocused = false;
    this.dpr = 1;
    this.spriteCache = new Map();
    this.width = 0;
    this.height = 0;
    this.destroyed = false;

    this.onResize = this.resize.bind(this);
    this.onBlur = () => {
      this.unfocused = true;
      this.syncFrameInterval();
    };
    this.onFocus = () => {
      this.unfocused = false;
      this.syncFrameInterval();
    };
    this.onVisibility = () => {
      if (this.doc?.hidden) {
        this.stopLoop();
      } else if (this.mode !== 'none' && !this.destroyed) {
        this.startLoop();
      }
    };

    this.win?.addEventListener?.('resize', this.onResize, { passive: true });
    this.win?.addEventListener?.('blur', this.onBlur);
    this.win?.addEventListener?.('focus', this.onFocus);
    this.doc?.addEventListener?.('visibilitychange', this.onVisibility);
    this.resize();
  }

  syncFrameInterval() {
    if (this.unfocused) {
      this.frameIntervalMs = 48;
    } else if (this.splitCount >= 3) {
      this.frameIntervalMs = 36;
    } else if (this.splitCount === 2) {
      this.frameIntervalMs = 28;
    } else {
      this.frameIntervalMs = 14;
    }
  }

  setSplitCount(count) {
    const next = Math.max(1, Math.round(Number(count) || 1));
    if (next === this.splitCount) return;
    const prevMulti = this.splitCount >= 2;
    const nextMulti = next >= 2;
    this.splitCount = next;
    this.syncFrameInterval();
    if (prevMulti !== nextMulti) {
      this.resize();
    }
    if (this.mode !== 'none' && this.particles.length > 0) {
      this.seedParticles();
    }
  }

  resize() {
    if (!this.canvas || !this.win) return;
    const maxDpr = this.splitCount >= 2 ? 1 : 1.5;
    const dpr = Math.min(this.win.devicePixelRatio || 1, maxDpr);
    this.dpr = dpr;
    this.width = this.win.innerWidth || 1280;
    this.height = this.win.innerHeight || 720;
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.ctx?.setTransform?.(dpr, 0, 0, dpr, 0, 0);
  }

  getGlowSprite(hexColor) {
    if (this.spriteCache.has(hexColor)) {
      return this.spriteCache.get(hexColor);
    }
    if (typeof this.doc?.createElement !== 'function') {
      return null;
    }
    const off = this.doc.createElement('canvas');
    off.width = 32;
    off.height = 32;
    const sctx = off.getContext?.('2d');
    if (!sctx?.createRadialGradient) {
      return null;
    }
    const m = /^#([0-9a-fA-F]{6})$/.exec(String(hexColor || ''));
    const r = m ? parseInt(m[1].slice(0, 2), 16) : 254;
    const g = m ? parseInt(m[1].slice(2, 4), 16) : 243;
    const b = m ? parseInt(m[1].slice(4, 6), 16) : 199;
    const grad = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
    grad.addColorStop(0.28, `rgba(${r}, ${g}, ${b}, 0.55)`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 32, 32);
    this.spriteCache.set(hexColor, off);
    return off;
  }

  setHoleClip(clipPath) {
    if (!this.canvas?.style) return;
    this.canvas.style.clipPath = clipPath || 'none';
  }

  configure(mode, intensity = 65) {
    const nextMode = mode || 'none';
    const nextIntensity = Math.max(10, Math.min(100, Number(intensity) || 65));
    const changed = this.mode !== nextMode || Math.abs(this.intensity - nextIntensity) > 8;
    this.mode = nextMode;
    this.intensity = nextIntensity;

    if (this.mode === 'none') {
      this.stopLoop();
      this.particles = [];
      this.sparks = [];
      this.clear();
      return;
    }

    if (changed || this.particles.length === 0) {
      this.seedParticles();
    }
    if (!this.doc?.hidden && !this.rafId) {
      this.startLoop();
    }
  }

  seedParticles() {
    const factor = this.intensity / 100;
    const w = this.width || this.win?.innerWidth || 1280;
    const h = this.height || this.win?.innerHeight || 720;
    this.particles = [];
    this.sparks = [];

    let count = 40;
    if (this.mode === 'thunder-rain' || this.mode === 'rain') {
      count = Math.round(52 + factor * 80);
    } else if (this.mode === 'stardust') {
      count = Math.round(35 + factor * 65);
    } else if (this.mode === 'sakura') {
      count = Math.round(18 + factor * 30);
    } else if (this.mode === 'fireflies') {
      count = Math.round(22 + factor * 36);
    } else if (this.mode === 'snow') {
      count = Math.round(28 + factor * 50);
    }

    const splitScale = this.splitCount >= 3 ? 0.5 : this.splitCount === 2 ? 0.68 : 1;
    count = Math.max(10, Math.round(count * splitScale));

    for (let i = 0; i < count; i += 1) {
      this.particles.push(this.createParticle(w, h, true));
    }
  }

  createParticle(w, h, randomY = false) {
    const x = Math.random() * (w + 120) - 60;
    const y = randomY ? Math.random() * h : -20;

    if (this.mode === 'thunder-rain' || this.mode === 'rain') {
      return {
        x,
        y,
        len: 12 + Math.random() * 18,
        vx: -1.4 - Math.random() * 1.1,
        vy: 8 + Math.random() * 7,
        alpha: 0.14 + Math.random() * 0.24
      };
    }

    if (this.mode === 'sakura') {
      return {
        x,
        y,
        size: 5 + Math.random() * 6,
        vx: 0.4 + Math.random() * 0.9,
        vy: 0.8 + Math.random() * 1.1,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.04,
        swayPhase: Math.random() * Math.PI * 2,
        alpha: 0.45 + Math.random() * 0.4
      };
    }

    if (this.mode === 'fireflies') {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        r: 1.5 + Math.random() * 2.4,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.45,
        phase: Math.random() * Math.PI * 2,
        hue: Math.random() > 0.28 ? '#34d399' : '#fde047'
      };
    }

    if (this.mode === 'snow') {
      return {
        x: Math.random() * w,
        y,
        r: 1.3 + Math.random() * 2.5,
        vx: (Math.random() - 0.5) * 0.55,
        vy: 0.7 + Math.random() * 1.2,
        swayPhase: Math.random() * Math.PI * 2,
        alpha: 0.4 + Math.random() * 0.45
      };
    }

    // stardust
    return {
      x: Math.random() * w,
      y: randomY ? Math.random() * h : h + 10,
      r: 0.8 + Math.random() * 1.9,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -0.25 - Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.35 ? '#fef3c7' : '#93c5fd'
    };
  }

  maybeSpawnLightningSpark(w, h) {
    if (this.mode !== 'thunder-rain') return;
    if (this.sparks.length < 4 && Math.random() < 0.028 * (this.intensity / 65)) {
      const startX = w * (0.25 + Math.random() * 0.55);
      const startY = h * (0.15 + Math.random() * 0.65);
      const pts = [{ x: startX, y: startY }];
      let cx = startX;
      let cy = startY;
      const segs = 4 + Math.floor(Math.random() * 4);
      for (let i = 0; i < segs; i += 1) {
        cx += (Math.random() - 0.5) * 42;
        cy += (Math.random() - 0.35) * 40;
        pts.push({ x: cx, y: cy });
      }
      this.sparks.push({ pts, life: 1, decay: 0.045 + Math.random() * 0.03 });
    }
  }

  startLoop() {
    this.stopLoop();
    const rafFn =
      this.win?.requestAnimationFrame?.bind(this.win) ||
      (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : null);
    if (!rafFn) return;
    const tick = (ts) => {
      if (this.destroyed || this.mode === 'none') return;
      if (ts - this.lastTs >= this.frameIntervalMs) {
        this.lastTs = ts;
        this.drawFrame(ts);
      }
      this.rafId = rafFn(tick);
    };
    this.rafId = rafFn(tick);
  }

  stopLoop() {
    if (this.rafId !== null) {
      const cancelFn =
        this.win?.cancelAnimationFrame?.bind(this.win) ||
        (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : null);
      cancelFn?.(this.rafId);
      this.rafId = null;
    }
    this.lastDrawTs = 0;
  }

  clear() {
    this.ctx?.clearRect?.(0, 0, this.width || 0, this.height || 0);
  }

  drawFrame(ts) {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = this.width;
    const h = this.height;
    const dpr = this.dpr || 1;
    const rawDt = this.lastDrawTs ? (ts - this.lastDrawTs) / 16.667 : 1;
    const dt = Math.max(0.25, Math.min(2.2, rawDt));
    this.lastDrawTs = ts;

    ctx.clearRect(0, 0, w, h);

    if (this.mode === 'thunder-rain' || this.mode === 'rain') {
      const isThunder = this.mode === 'thunder-rain';
      ctx.lineCap = 'round';
      ctx.lineWidth = 1;

      // Batch raindrops into 2 opacity passes instead of 100+ individual stroke() calls
      ctx.strokeStyle = isThunder ? 'rgba(210, 224, 245, 0.2)' : 'rgba(190, 215, 255, 0.18)';
      ctx.beginPath();
      for (const p of this.particles) {
        if (p.alpha < 0.26) {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 1.4, p.y + p.len);
        }
      }
      ctx.stroke();

      ctx.strokeStyle = isThunder ? 'rgba(210, 224, 245, 0.34)' : 'rgba(190, 215, 255, 0.32)';
      ctx.beginPath();
      for (const p of this.particles) {
        if (p.alpha >= 0.26) {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 1.4, p.y + p.len);
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y > h + 20 || p.x < -80) {
          Object.assign(p, this.createParticle(w, h, false));
        }
      }
      ctx.stroke();

      if (isThunder) {
        this.maybeSpawnLightningSpark(w, h);
        for (let i = this.sparks.length - 1; i >= 0; i -= 1) {
          const sp = this.sparks[i];
          ctx.beginPath();
          sp.pts.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.lineWidth = 4.2;
          ctx.strokeStyle = `rgba(250, 204, 21, ${(sp.life * 0.24).toFixed(3)})`;
          ctx.stroke();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = `rgba(254, 240, 138, ${(sp.life * 0.9).toFixed(3)})`;
          ctx.stroke();
          sp.life -= sp.decay * dt;
          if (sp.life <= 0) this.sparks.splice(i, 1);
        }
        ctx.lineWidth = 1;
      }
      return;
    }

    if (this.mode === 'sakura') {
      for (const p of this.particles) {
        p.swayPhase += 0.03 * dt;
        p.x += (p.vx + Math.sin(p.swayPhase) * 0.65) * dt;
        p.y += p.vy * dt;
        p.angle += p.spin * dt;

        const cos = Math.cos(p.angle) * dpr;
        const sin = Math.sin(p.angle) * dpr;
        ctx.setTransform(cos, sin, -sin, cos, p.x * dpr, p.y * dpr);
        ctx.fillStyle = `rgba(249, 168, 212, ${p.alpha})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        if (p.y > h + 20 || p.x > w + 40) {
          Object.assign(p, this.createParticle(w, h, false));
        }
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return;
    }

    if (this.mode === 'snow') {
      ctx.fillStyle = '#f8fafc';
      for (const p of this.particles) {
        p.swayPhase += 0.02 * dt;
        p.x += (p.vx + Math.sin(p.swayPhase) * 0.4) * dt;
        p.y += p.vy * dt;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        if (p.y > h + 14) {
          Object.assign(p, this.createParticle(w, h, false));
        }
      }
      ctx.globalAlpha = 1;
      return;
    }

    const canDrawImg = typeof ctx.drawImage === 'function';
    if (this.mode === 'fireflies') {
      for (const p of this.particles) {
        p.x += (p.vx + Math.sin(ts * 0.001 + p.phase) * 0.25) * dt;
        p.y += (p.vy + Math.cos(ts * 0.0012 + p.phase) * 0.2) * dt;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        const glow = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(ts * 0.003 + p.phase));
        const sprite = canDrawImg ? this.getGlowSprite(p.hue) : null;
        ctx.globalAlpha = glow;
        if (sprite) {
          const drawSize = Math.max(14, p.r * 7);
          ctx.drawImage(sprite, p.x - drawSize * 0.5, p.y - drawSize * 0.5, drawSize, drawSize);
        } else {
          ctx.fillStyle = p.hue;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      return;
    }

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y < -10) {
        p.y = h + 10;
        p.x = Math.random() * w;
      }
      const alpha = 0.25 + 0.65 * (0.5 + 0.5 * Math.sin(ts * 0.0025 + p.phase));
      const sprite = canDrawImg ? this.getGlowSprite(p.color) : null;
      ctx.globalAlpha = alpha;
      if (sprite) {
        const drawSize = Math.max(10, p.r * 5.5);
        ctx.drawImage(sprite, p.x - drawSize * 0.5, p.y - drawSize * 0.5, drawSize, drawSize);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  destroy() {
    this.destroyed = true;
    this.stopLoop();
    this.spriteCache.clear();
    this.win?.removeEventListener?.('resize', this.onResize);
    this.win?.removeEventListener?.('blur', this.onBlur);
    this.win?.removeEventListener?.('focus', this.onFocus);
    this.doc?.removeEventListener?.('visibilitychange', this.onVisibility);
  }
}
