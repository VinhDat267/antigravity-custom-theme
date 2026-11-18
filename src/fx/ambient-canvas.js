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
    this.width = 0;
    this.height = 0;
    this.destroyed = false;

    this.onResize = this.resize.bind(this);
    this.onVisibility = () => {
      if (this.doc?.hidden) {
        this.stopLoop();
      } else if (this.mode !== 'none' && !this.destroyed) {
        this.startLoop();
      }
    };

    this.win?.addEventListener?.('resize', this.onResize, { passive: true });
    this.doc?.addEventListener?.('visibilitychange', this.onVisibility);
    this.resize();
  }

  resize() {
    if (!this.canvas || !this.win) return;
    const dpr = Math.min(this.win.devicePixelRatio || 1, 1.5);
    this.width = this.win.innerWidth || 1280;
    this.height = this.win.innerHeight || 720;
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.ctx?.setTransform?.(dpr, 0, 0, dpr, 0, 0);
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
      if (ts - this.lastTs >= 24) {
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
  }

  clear() {
    this.ctx?.clearRect?.(0, 0, this.width || 0, this.height || 0);
  }

  drawFrame(ts) {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = this.width;
    const h = this.height;
    ctx.clearRect(0, 0, w, h);

    if (this.mode === 'thunder-rain' || this.mode === 'rain') {
      ctx.lineCap = 'round';
      ctx.lineWidth = 1;
      for (const p of this.particles) {
        ctx.strokeStyle =
          this.mode === 'thunder-rain'
            ? `rgba(210, 224, 245, ${p.alpha})`
            : `rgba(190, 215, 255, ${p.alpha})`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 1.4, p.y + p.len);
        ctx.stroke();

        p.x += p.vx;
        p.y += p.vy;
        if (p.y > h + 20 || p.x < -80) {
          Object.assign(p, this.createParticle(w, h, false));
        }
      }

      if (this.mode === 'thunder-rain') {
        this.maybeSpawnLightningSpark(w, h);
        for (let i = this.sparks.length - 1; i >= 0; i -= 1) {
          const sp = this.sparks[i];
          ctx.save();
          ctx.strokeStyle = `rgba(253, 224, 71, ${sp.life * 0.85})`;
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 10;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          sp.pts.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();
          ctx.restore();
          sp.life -= sp.decay;
          if (sp.life <= 0) this.sparks.splice(i, 1);
        }
      }
      return;
    }

    if (this.mode === 'sakura') {
      for (const p of this.particles) {
        p.swayPhase += 0.03;
        p.x += p.vx + Math.sin(p.swayPhase) * 0.65;
        p.y += p.vy;
        p.angle += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = `rgba(249, 168, 212, ${p.alpha})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (p.y > h + 20 || p.x > w + 40) {
          Object.assign(p, this.createParticle(w, h, false));
        }
      }
      return;
    }

    if (this.mode === 'snow') {
      for (const p of this.particles) {
        p.swayPhase += 0.02;
        p.x += p.vx + Math.sin(p.swayPhase) * 0.4;
        p.y += p.vy;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (p.y > h + 14) {
          Object.assign(p, this.createParticle(w, h, false));
        }
      }
      return;
    }

    if (this.mode === 'fireflies') {
      for (const p of this.particles) {
        p.x += p.vx + Math.sin(ts * 0.001 + p.phase) * 0.25;
        p.y += p.vy + Math.cos(ts * 0.0012 + p.phase) * 0.2;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        const glow = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(ts * 0.003 + p.phase));
        ctx.save();
        ctx.globalAlpha = glow;
        ctx.fillStyle = p.hue;
        ctx.shadowColor = p.hue;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      return;
    }

    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10) {
        p.y = h + 10;
        p.x = Math.random() * w;
      }
      const alpha = 0.25 + 0.65 * (0.5 + 0.5 * Math.sin(ts * 0.0025 + p.phase));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  destroy() {
    this.destroyed = true;
    this.stopLoop();
    this.win?.removeEventListener?.('resize', this.onResize);
    this.doc?.removeEventListener?.('visibilitychange', this.onVisibility);
  }
}
