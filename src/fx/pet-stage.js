/**
 * Interactive Floating/Roaming/Following Pet Stage + Split-Browser Hole Clamping.
 */

import { MASCOT_TEMPLATES, renderMascotSvg } from '../assets/mascots.js';

const FX_PET_QUIPS = {
  'loi-kiem': {
    vi: ['Lôi Chi Hô Hấp: Nhất Thiểm! ⚡', 'Mưa rơi nhưng kiếm vẫn sáng~ 🗡️', 'Tập trung viết code nào!'],
    en: ['Thunder Breathing: First Form! ⚡', 'Rain falls, blade stays sharp~ 🗡️', 'Ship clean code!']
  },
  'rong-ngoc': {
    vi: ['Rồng ngọc chúc bạn bug-free! 🐉', 'Năng lượng ngọc bích đang tràn đầy ✨', 'Bay một vòng rồi làm tiếp nhé~'],
    en: ['Jade Dragon blesses zero bugs! 🐉', 'Emerald mana fully charged ✨', 'Take a quick stretch~']
  },
  'ho-ly-chibi': {
    vi: ['Hồ ly tới cổ vũ bạn đây! 🦊', 'Nghỉ uống ngụm nước nha~ 🍵', 'Code mượt như đuôi hồ ly ✨'],
    en: ['Chibi Fox cheering you on! 🦊', 'Hydration check~ 🍵', 'Smooth code, fluffy tails ✨']
  },
  'meo-than': {
    vi: ['Meow~ Xoa đầu mèo lấy hên nào 🐱', 'Mèo than đang canh màn hình cho bạn~', 'Nghỉ tay 5 phút không nè? 🐾'],
    en: ['Meow~ Pet the kitty for good luck 🐱', 'Purring at 120 FPS~', 'Guard cat on duty 🐾']
  },
  'meo-huyen-thuat': {
    vi: ['Phép thuật cổ ngữ đã sẵn sàng 🔮', 'Mọi lỗi compile sẽ tan biến~ ✨', 'Meow! Triệu hồi thuật toán tối ưu!'],
    en: ['Arcane runes aligned 🔮', 'May all build errors vanish~ ✨', 'Summoning clean architecture!']
  },
  'phu-thuy-anh-trang': {
    vi: ['Ánh trăng soi đường cho dev đêm 🌙', 'Pha chế xong lọ mana code sạch ✨', 'Đêm nay deploy suôn sẻ nha~'],
    en: ['Moonlight guides midnight devs 🌙', 'Brewed a clean-code potion ✨', 'Smooth deploys tonight~']
  },
  'hoa-anh-dao': {
    vi: ['Gió xuân mang hoa anh đào tới 🌸', 'Bình tĩnh debug từng dòng nhé~', 'Thật nhẹ nhàng và tập trung ✨'],
    en: ['Sakura breeze brings calm focus 🌸', 'One clean step at a time~', 'Peaceful coding vibes ✨']
  },
  'den-long': {
    vi: ['Đèn lồng thắp sáng ý tưởng mới 🏮', 'Ấm áp giữa đêm mưa ✨', 'Tiếp tục hành trình nào!'],
    en: ['Lantern glowing with fresh ideas 🏮', 'Warm light in the dark night ✨', 'Keep building!']
  },
  'ca-koi': {
    vi: ['Cá Koi mang may mắn tới nè 🐟', 'Bơi giữa dải ngân hà tinh tú ✨', 'Mọi thứ sẽ trôi chảy như nước~'],
    en: ['Cosmic Koi brings good fortune 🐟', 'Swimming through starlight ✨', 'Flow like water~']
  },
  'chopper-chibi': {
    vi: ['Đừng khen nữa mà, đồ ngốc~ 🌸', 'Bác sĩ Chopper kiểm tra bug giúp bạn nè! 🩺', 'Uống nước và nghỉ ngơi xíu rồi code tiếp nha ✨'],
    en: ["Stop praising me, you idiot~ 🌸", 'Dr. Chopper reporting for bug checkup! 🩺', 'Drink some water and keep shipping ✨']
  },
  'thousand-sunny': {
    vi: ['Gió thuận rồi, căng buồm ra Tân Thế Giới thôi! 🏴‍☠️', 'Thousand Sunny đang lướt êm ở 120 FPS~ ⛵', 'Coup de Burst tới đích deploy nào! ✨'],
    en: ['Fair winds ahead—set sail for the New World! 🏴‍☠️', 'Cruising smooth at 120 FPS~ ⛵', 'Coup de Burst straight to deploy! ✨']
  }
};

export function clampOutsideHole(x, y, size, holeRect, viewport) {
  const vw = viewport?.width || 1280;
  const vh = viewport?.height || 720;
  const minPad = 8;
  let nx = Math.max(minPad, Math.min(vw - size - minPad, x));
  let ny = Math.max(minPad, Math.min(vh - size - minPad, y));

  if (!holeRect) {
    return { x: nx, y: ny };
  }

  const overlapsX = nx + size > holeRect.left && nx < holeRect.right;
  const overlapsY = ny + size > holeRect.top && ny < holeRect.bottom;
  if (!overlapsX || !overlapsY) {
    return { x: nx, y: ny };
  }

  const leftRoom = holeRect.left - size - minPad;
  const rightRoom = holeRect.right + minPad;
  if (leftRoom >= minPad) {
    nx = leftRoom;
  } else if (rightRoom + size <= vw - minPad) {
    nx = rightRoom;
  } else if (holeRect.top - size - minPad >= minPad) {
    ny = holeRect.top - size - minPad;
  } else {
    ny = Math.max(minPad, Math.min(vh - size - minPad, holeRect.bottom + minPad));
  }

  return { x: Math.round(nx), y: Math.round(ny) };
}

export class PetStage {
  constructor({ getConfig, getCustomMedia, getBrowserHoleRect, onPositionSave }) {
    this.getConfig = getConfig;
    this.getCustomMedia = getCustomMedia;
    this.getBrowserHoleRect = getBrowserHoleRect;
    this.onPositionSave = onPositionSave;

    this.stageEl = null;
    this.bodyEl = null;
    this.speechEl = null;
    this.speechTimer = null;
    this.reactTimer = null;
    this.lastPetKey = '';
    this.lastTransform = '';
    this.lastStepTs = 0;
    this.pos = { x: 180, y: 120 };
    this.target = { x: 180, y: 120 };
    this.dragging = false;
    this.dragMoved = false;
    this.dragStart = { x: 0, y: 0 };
    this.dragOffset = { x: 0, y: 0 };
    this.motionTimer = null;
    this.rafId = null;
    this.activeMode = null;
    this.destroyed = false;

    this.onMouseMove = (e) => {
      const cfg = this.getConfig();
      if (cfg.pet?.mode === 'follow' && !this.dragging && typeof window !== 'undefined') {
        const size = cfg.pet?.size || 88;
        const clamped = clampOutsideHole(
          e.clientX + 42,
          e.clientY - 48,
          size,
          this.getBrowserHoleRect?.(),
          { width: window.innerWidth, height: window.innerHeight }
        );
        this.target.x = clamped.x;
        this.target.y = clamped.y;
        if (!this.rafId && !this.destroyed && !(typeof document !== 'undefined' && document.hidden)) {
          this.startStepLoop('follow');
        }
      }
    };

    this.onVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        this.stopMotion();
      } else if (!this.destroyed && this.stageEl) {
        this.configureMotion(this.getConfig().pet?.mode, true);
      }
    };
    this.onWindowBlur = () => {
      if (this.getConfig().pet?.mode === 'roam') {
        this.stopMotion();
      }
    };
    this.onWindowFocus = () => {
      if (!this.destroyed && this.stageEl && !(typeof document !== 'undefined' && document.hidden)) {
        this.configureMotion(this.getConfig().pet?.mode, true);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', this.onMouseMove, { passive: true });
      window.addEventListener('blur', this.onWindowBlur);
      window.addEventListener('focus', this.onWindowFocus);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  ensureMounted() {
    if (this.stageEl && document.body.contains(this.stageEl)) return;
    const el = document.createElement('div');
    el.id = 'agy-ct-pet-stage';
    el.setAttribute('data-agy-ct-injected', 'true');

    const speech = document.createElement('div');
    speech.className = 'agy-ct-pet-speech';
    speech.setAttribute('aria-live', 'polite');

    const body = document.createElement('div');
    body.className = 'agy-ct-pet-body';

    el.append(speech, body);
    document.body.appendChild(el);
    this.stageEl = el;
    this.bodyEl = body;
    this.speechEl = speech;
    this.bindInteractions();
  }

  bindInteractions() {
    if (!this.stageEl) return;

    this.stageEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      this.dragging = true;
      this.dragMoved = false;
      const rect = this.stageEl.getBoundingClientRect();
      this.dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.stageEl.setPointerCapture?.(e.pointerId);
    });

    this.stageEl.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      if (Math.abs(e.clientX - this.dragStart.x) > 4 || Math.abs(e.clientY - this.dragStart.y) > 4) {
        this.dragMoved = true;
      }
      const size = this.getConfig().pet?.size || 88;
      const clamped = clampOutsideHole(
        e.clientX - this.dragOffset.x,
        e.clientY - this.dragOffset.y,
        size,
        this.getBrowserHoleRect?.(),
        { width: window.innerWidth, height: window.innerHeight }
      );
      this.pos = clamped;
      this.target = { ...clamped };
      this.applyCoords();
    });

    const finishDrag = () => {
      if (!this.dragging) return;
      this.dragging = false;
      if (this.dragMoved) {
        const xPct = Math.round((this.pos.x / Math.max(1, window.innerWidth)) * 1000) / 10;
        const yPct = Math.round((this.pos.y / Math.max(1, window.innerHeight)) * 1000) / 10;
        this.onPositionSave?.({ xPct, yPct });
      } else {
        this.triggerClickReaction();
      }
    };

    this.stageEl.addEventListener('pointerup', finishDrag);
    this.stageEl.addEventListener('pointercancel', finishDrag);
  }

  triggerClickReaction() {
    if (this.stageEl) {
      this.stageEl.classList?.add?.('is-reacting');
      clearTimeout(this.reactTimer);
      this.reactTimer = setTimeout(() => {
        this.stageEl?.classList?.remove?.('is-reacting');
      }, 2800);
    }
    const cfg = this.getConfig();
    if (!cfg.pet?.showSpeechOnClick) return;
    const lang = cfg.lang === 'en' ? 'en' : 'vi';
    const bank = FX_PET_QUIPS[cfg.pet.id]?.[lang] || (lang === 'en' ? ['Hello! ✨'] : ['Xin chào! ✨']);
    const line = bank[Math.floor(Math.random() * bank.length)];

    if (this.speechEl) {
      this.speechEl.textContent = line;
      this.speechEl.classList.add('is-visible');
      clearTimeout(this.speechTimer);
      this.speechTimer = setTimeout(() => {
        this.speechEl?.classList.remove('is-visible');
      }, 2800);
    }

    if (!this.stageEl) return;
    const rect = this.stageEl.getBoundingClientRect();
    const icons = ['✨', '⚡', '⭐', '💫'];
    for (let i = 0; i < 4; i += 1) {
      const sp = document.createElement('span');
      sp.className = 'agy-ct-pet-burst';
      sp.setAttribute('data-agy-ct-injected', 'true');
      sp.textContent = icons[Math.floor(Math.random() * icons.length)];
      sp.style.left = `${rect.left + rect.width * (0.25 + Math.random() * 0.5)}px`;
      sp.style.top = `${rect.top + rect.height * 0.3}px`;
      sp.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 54)}px`);
      sp.style.setProperty('--dy', `${Math.round(-26 - Math.random() * 34)}px`);
      document.body.appendChild(sp);
      setTimeout(() => sp.remove(), 950);
    }
  }

  update() {
    const cfg = this.getConfig();
    const pet = cfg.pet || {};

    if (!cfg.enabled || !pet.enabled || pet.id === 'none') {
      this.stopMotion();
      if (this.stageEl) {
        this.stageEl.remove();
        this.stageEl = null;
        this.bodyEl = null;
        this.speechEl = null;
        this.lastPetKey = '';
        this.lastTransform = '';
      }
      this.activeMode = null;
      return;
    }

    this.ensureMounted();
    const size = Math.max(44, Math.min(160, Number(pet.size) || 88));
    const opacity = Math.max(0.2, Math.min(1, (pet.opacity ?? 96) / 100));
    this.stageEl.style.width = `${size}px`;
    this.stageEl.style.height = `${size}px`;
    this.stageEl.style.opacity = String(opacity);

    const customUrl = this.getCustomMedia?.().pet || '';
    const renderKey = pet.id === 'custom' ? `custom:${customUrl}` : `tpl:${pet.id}`;
    if (this.lastPetKey !== renderKey) {
      this.lastPetKey = renderKey;
      if (pet.id === 'custom' && customUrl) {
        this.bodyEl.textContent = '';
        const img = document.createElement('img');
        img.src = customUrl;
        img.alt = 'Custom Pet';
        img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;';
        this.bodyEl.appendChild(img);
      } else {
        const tplId = MASCOT_TEMPLATES[pet.id] ? pet.id : 'rong-ngoc';
        this.bodyEl.innerHTML = renderMascotSvg(tplId, 'pet');
      }
    }

    if (!this.dragging) {
      const xPct = pet.pos?.xPct ?? 22;
      const yPct = pet.pos?.yPct ?? 14;
      const clamped = clampOutsideHole(
        (xPct / 100) * window.innerWidth,
        (yPct / 100) * window.innerHeight,
        size,
        this.getBrowserHoleRect?.(),
        { width: window.innerWidth, height: window.innerHeight }
      );
      if (pet.mode === 'float' || (this.pos.x === 180 && this.pos.y === 120)) {
        this.pos = { ...clamped };
        this.target = { ...clamped };
      } else {
        this.pos = clampOutsideHole(
          this.pos.x,
          this.pos.y,
          size,
          this.getBrowserHoleRect?.(),
          { width: window.innerWidth, height: window.innerHeight }
        );
      }
      this.applyCoords();
    }

    this.configureMotion(pet.mode);
  }

  startStepLoop(mode) {
    if (this.destroyed || mode === 'float') return;
    if (typeof document !== 'undefined' && document.hidden) return;
    const rafFn =
      (typeof window !== 'undefined' && window.requestAnimationFrame?.bind(window)) ||
      (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : null);
    if (!rafFn) return;

    const step = (ts) => {
      if (this.destroyed) {
        this.rafId = null;
        this.lastStepTs = 0;
        return;
      }
      if (typeof ts === 'number') {
        if (this.lastStepTs && ts - this.lastStepTs < 15) {
          this.rafId = rafFn(step);
          return;
        }
        this.lastStepTs = ts;
      }
      let moved = false;
      if (!this.dragging) {
        const dx = this.target.x - this.pos.x;
        const dy = this.target.y - this.pos.y;
        const ease = mode === 'follow' ? 0.045 : 0.015;
        if (Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4) {
          moved = true;
          const size = this.getConfig().pet?.size || 88;
          this.pos = clampOutsideHole(
            this.pos.x + dx * ease,
            this.pos.y + dy * ease,
            size,
            this.getBrowserHoleRect?.(),
            { width: window.innerWidth, height: window.innerHeight }
          );
          this.applyCoords();
        }
      }
      if (!moved && !this.dragging) {
        this.rafId = null;
        this.lastStepTs = 0;
        return;
      }
      this.rafId = rafFn(step);
    };
    this.rafId = rafFn(step);
  }

  configureMotion(mode, force = false) {
    const nextMode = mode || 'float';
    if (!force && this.activeMode === nextMode && (nextMode === 'float' || this.rafId !== null || this.motionTimer !== null)) {
      return;
    }
    this.stopMotion();
    this.activeMode = nextMode;
    if (nextMode === 'float') return;

    if (nextMode === 'roam') {
      const pickNext = () => {
        const size = this.getConfig().pet?.size || 88;
        const hole = this.getBrowserHoleRect?.();
        const maxW = hole ? Math.max(80, hole.left - size - 16) : Math.max(80, window.innerWidth - size - 48);
        const clamped = clampOutsideHole(
          24 + Math.random() * maxW,
          40 + Math.random() * Math.max(40, window.innerHeight - size - 80),
          size,
          hole,
          { width: window.innerWidth, height: window.innerHeight }
        );
        this.target = clamped;
        if (!this.rafId && !this.destroyed && !(typeof document !== 'undefined' && document.hidden)) {
          this.startStepLoop('roam');
        }
      };
      pickNext();
      this.motionTimer = setInterval(pickNext, 4500);
    }

    this.startStepLoop(nextMode);
  }

  applyCoords() {
    if (!this.stageEl) return;
    const next = `translate3d(${Math.round(this.pos.x)}px, ${Math.round(this.pos.y)}px, 0)`;
    if (next !== this.lastTransform) {
      this.lastTransform = next;
      this.stageEl.style.transform = next;
    }
  }

  stopMotion() {
    if (this.motionTimer) {
      clearInterval(this.motionTimer);
      this.motionTimer = null;
    }
    if (this.rafId) {
      const cancelFn =
        (typeof window !== 'undefined' && window.cancelAnimationFrame?.bind(window)) ||
        (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : null);
      cancelFn?.(this.rafId);
      this.rafId = null;
    }
    this.lastStepTs = 0;
    this.activeMode = null;
  }

  destroy() {
    this.destroyed = true;
    this.stopMotion();
    clearTimeout(this.speechTimer);
    clearTimeout(this.reactTimer);
    this.lastTransform = '';
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('blur', this.onWindowBlur);
      window.removeEventListener('focus', this.onWindowFocus);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
    this.stageEl?.remove();
    this.stageEl = null;
  }
}
