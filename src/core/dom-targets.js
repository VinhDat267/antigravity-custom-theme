/**
 * Antigravity 2.x DOM discovery, Split-Browser hole geometry, and Visual DOM Picker.
 */

const DT_SETTINGS_LABELS = new Set([
  'general',
  'application',
  'appearance',
  'account',
  'agent',
  'permissions',
  'browser',
  'customizations',
  'editor',
  'terminal',
  'shortcuts',
  'notifications',
  'models',
  'chung',
  'ứng dụng',
  'giao diện',
  'phím tắt',
  'thông báo',
  'mô hình'
]);

export function computeBrowserHoleClip(shellRect, holeRect, hasHoleAttr = true) {
  if (!hasHoleAttr || !shellRect || !holeRect) {
    return { active: false, clipPath: 'none', holeRect: null };
  }
  if (holeRect.width <= 1 || holeRect.height <= 1) {
    return { active: false, clipPath: 'none', holeRect: null };
  }
  const l = Math.max(0, Math.round(holeRect.left - shellRect.left));
  const t = Math.max(0, Math.round(holeRect.top - shellRect.top));
  const r = Math.max(l, Math.round((holeRect.right ?? holeRect.left + holeRect.width) - shellRect.left));
  const b = Math.max(t, Math.round((holeRect.bottom ?? holeRect.top + holeRect.height) - shellRect.top));

  return {
    active: true,
    clipPath: `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${l}px ${t}px, ${r}px ${t}px, ${r}px ${b}px, ${l}px ${b}px, ${l}px ${t}px)`,
    holeRect: { left: l, top: t, right: r, bottom: b }
  };
}

export function dtSafeQueryAll(selector, root = document) {
  if (!selector || typeof selector !== 'string' || !root?.querySelectorAll) return [];
  try {
    return Array.from(root.querySelectorAll(selector));
  } catch {
    return [];
  }
}

export function dtIsInsideInjectorUi(el) {
  if (!el || typeof el.closest !== 'function') return false;
  return Boolean(
    el.closest('#agy-ct-settings-panel') ||
      el.closest('#agy-ct-fallback-modal') ||
      el.closest('#agy-ct-launcher') ||
      el.closest('#agy-ct-bg-root') ||
      el.closest('#agy-ct-ambient-canvas') ||
      el.closest('#agy-ct-pet-stage') ||
      el.closest('#agy-ct-picker-banner') ||
      el.closest('.agy-ct-sticker-node')
  );
}

export function dtFindShellElement(config) {
  const custom = config?.customSelectors?.appShell;
  if (custom) {
    const hit = dtSafeQueryAll(custom)[0];
    if (hit) return hit;
  }
  return document.querySelector('.agy-shell, [data-agy-mock-shell]');
}

const DT_TIGHT_BUBBLE_SELECTOR =
  '[data-testid="user-message-bubble"], .agy-user-bubble-frame, [data-agy-chat-bubble], .user-message-bubble';
const DT_FALLBACK_BUBBLE_SELECTOR =
  '[data-testid="user-message"], [data-message-author="user"], [data-message-role="user"]';

export function dtFindChatBubbles(config) {
  const custom = config?.customSelectors?.chatBubble;
  if (custom) {
    return dtSafeQueryAll(custom).filter((el) => !dtIsInsideInjectorUi(el));
  }
  const found = new Set();
  for (const el of dtSafeQueryAll(DT_TIGHT_BUBBLE_SELECTOR)) {
    if (dtIsInsideInjectorUi(el)) continue;
    const frame =
      el.getAttribute('data-testid') === 'user-message-bubble'
        ? el.closest('.agy-user-bubble-frame, [class*="bg-card-border"]') || el
        : el;
    found.add(frame);
  }

  const tightMatches = Array.from(found);
  const tightAncestors = new Set();
  for (const inner of tightMatches) {
    let p = inner.parentElement;
    while (p) {
      tightAncestors.add(p);
      p = p.parentElement;
    }
  }

  for (const el of dtSafeQueryAll(DT_FALLBACK_BUBBLE_SELECTOR)) {
    if (dtIsInsideInjectorUi(el)) continue;
    if (tightAncestors.size > 0) {
      if (tightAncestors.has(el) || found.has(el)) continue;
    } else if (tightMatches.some((inner) => el.contains(inner))) {
      continue;
    }
    found.add(el);
  }

  const raw = Array.from(found);
  if (raw.length <= 1) return raw;
  for (let i = tightMatches.length; i < raw.length; i += 1) {
    let p = raw[i].parentElement;
    while (p) {
      tightAncestors.add(p);
      p = p.parentElement;
    }
  }
  if (tightAncestors.size > 0) {
    return raw.filter((el) => !tightAncestors.has(el));
  }
  return raw.filter((el) => !raw.some((other) => other !== el && el.contains(other)));
}

export function dtFindChatInputContainers(config) {
  const custom = config?.customSelectors?.chatInput;
  if (custom) {
    return dtSafeQueryAll(custom).filter((el) => !dtIsInsideInjectorUi(el));
  }
  const found = new Set();
  for (const el of dtSafeQueryAll('.surface-composer, [data-agy-chat-input]')) {
    if (!dtIsInsideInjectorUi(el)) found.add(el);
  }
  if (found.size === 0) {
    for (const input of dtSafeQueryAll('textarea, [contenteditable="true"]')) {
      if (dtIsInsideInjectorUi(input)) continue;
      const ph = (input.getAttribute('placeholder') || input.getAttribute('data-placeholder') || '').toLowerCase();
      const aria = (input.getAttribute('aria-label') || '').toLowerCase();
      const box =
        input.closest('div[class*="rounded-2xl"], div[class*="rounded-xl"], div[class*="rounded-lg"], form, [role="region"]') ||
        input.parentElement?.parentElement ||
        input.parentElement;
      const text = (box?.textContent || '').toLowerCase();
      if (
        box &&
        !dtIsInsideInjectorUi(box) &&
        (ph.includes('ask') || ph.includes('message') || aria.includes('chat') || aria.includes('prompt') || text.includes('ask anything') || text.includes('@ to mention'))
      ) {
        const rect = box.getBoundingClientRect();
        if (rect.width >= 240 && rect.height > 28 && rect.height <= window.innerHeight * 0.5) {
          found.add(box);
        }
      }
    }
  }
  return Array.from(found);
}

export function dtFindSettingsContext(config) {
  const customNavSel = config?.customSelectors?.settingsNavList;
  const customContentSel = config?.customSelectors?.settingsContent;

  const guessPane = (navList) => {
    if (customContentSel) {
      const hit = dtSafeQueryAll(customContentSel)[0];
      if (hit) return hit;
    }
    const explicit = document.querySelector('[data-agy-settings-content]');
    if (explicit) return explicit;
    let parent = navList?.parentElement;
    for (let depth = 0; depth < 3 && parent; depth += 1) {
      const sibling = Array.from(parent.children).find(
        (ch) => ch !== navList && !ch.contains(navList) && ch.tagName !== 'STYLE' && ch.getBoundingClientRect().width > 240
      );
      if (sibling) return sibling;
      parent = parent.parentElement;
    }
    return null;
  };

  if (customNavSel) {
    const customNav = dtSafeQueryAll(customNavSel)[0];
    if (customNav) return { navList: customNav, contentPane: guessPane(customNav) };
  }

  const modalRoot = document.querySelector(
    '.settings-modal-container, [data-agy-settings-content], [role="dialog"]:not([data-testid^="overview-panel-"]):not(.agy-overlay):not([data-agy-ct-injected])'
  );
  if (!modalRoot) return null;

  let containers = [];
  try {
    containers = Array.from(modalRoot.querySelectorAll('nav, aside, ul, div'));
  } catch {
    containers = [];
  }

  let bestNav = null;
  let bestScore = 0;
  for (const container of containers) {
    if (dtIsInsideInjectorUi(container)) continue;
    const clickables = Array.from(
      container.querySelectorAll(
        ':scope > button, :scope > a, :scope > li, :scope > div[role="button"], :scope > div[role="tab"], :scope > div[tabindex]'
      )
    );
    if (clickables.length < 3 || clickables.length > 24) continue;
    let matches = 0;
    for (const item of clickables) {
      const label = (item.textContent || '').trim().toLowerCase();
      if (DT_SETTINGS_LABELS.has(label)) matches += 1;
    }
    if (matches >= 3 && matches > bestScore) {
      bestScore = matches;
      bestNav = container;
    }
  }

  return bestNav ? { navList: bestNav, contentPane: guessPane(bestNav) } : null;
}

export function dtBuildSelectorPath(el) {
  if (!el || el === document.body) return 'body';
  if (el.id && !el.id.startsWith('agy-ct-')) {
    return `#${CSS.escape(el.id)}`;
  }
  const parts = [];
  let cur = el;
  for (let depth = 0; cur && cur !== document.body && depth < 4; depth += 1) {
    let part = cur.tagName.toLowerCase();
    const classes = Array.from(cur.classList).filter((c) => !c.startsWith('agy-ct-') && !c.includes(':') && c.length < 40);
    if (classes.length > 0) {
      part += `.${classes.slice(0, 2).map((c) => CSS.escape(c)).join('.')}`;
    }
    parts.unshift(part);
    cur = cur.parentElement;
  }
  return parts.join(' > ');
}

export function dtIsSettingsLabel(text) {
  return DT_SETTINGS_LABELS.has(String(text || '').trim().toLowerCase());
}
