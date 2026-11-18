/**
 * Built-in SVG Stickers (14+) & Corner Filigree Ornaments.
 */

function stickerSvgUri(svgMarkup) {
  return `data:image/svg+xml,${encodeURIComponent(svgMarkup)}`;
}

export const CORNER_ORNAMENTS = {
  gold: stickerSvgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="M3 24V7Q3 3 7 3H24" stroke="#fbbf24" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="7" cy="7" r="2.2" fill="#fef08a"/></svg>`
  ),
  sakura: stickerSvgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="M3 22V8Q3 3 8 3H22" stroke="#f472b6" stroke-width="1.8" fill="none"/><circle cx="8" cy="8" r="3" fill="#fbcfe8"/></svg>`
  ),
  jade: stickerSvgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="M3 24V6H24M3 12H12V3" stroke="#34d399" stroke-width="1.8" fill="none"/></svg>`
  ),
  cyber: stickerSvgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="M2 22V2H22" stroke="#38bdf8" stroke-width="2.2" fill="none"/><rect x="5" y="5" width="4" height="4" fill="#38bdf8"/></svg>`
  )
};

export const STICKER_TEMPLATES = {
  'trang-sao': {
    id: 'trang-sao',
    name: 'Trăng Sao',
    nameEn: 'Crescent Star',
    svg: `<svg class="agy-ct-svg-art" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M38 12C24 14 16 27 19 40C22 52 35 58 47 52C36 53 28 44 27 33C26 23 31 16 38 12Z" fill="#fde047" stroke="#f59e0b" stroke-width="1.6"/><path d="M46 16L48 22L54 24L48 26L46 32L44 26L38 24L44 22Z" fill="#fef08a"/></svg>`
  },
  'bua-loi-an': {
    id: 'bua-loi-an',
    name: 'Bùa Lôi Ấn',
    nameEn: 'Thunder Talisman',
    svg: `<svg class="agy-ct-svg-art" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="18" y="8" width="28" height="48" rx="4" fill="#fef3c7" stroke="#d97706" stroke-width="2"/><path d="M35 16L25 33H33L28 48L40 29H32L35 16Z" fill="#f59e0b"/></svg>`
  },
  'non-la-lu-khach': {
    id: 'non-la-lu-khach',
    name: 'Nón Lá Lữ Khách',
    nameEn: 'Traveler Hat',
    svg: `<svg class="agy-ct-svg-art" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 42L32 18L56 42C44 46 20 46 8 42Z" fill="#d97706" stroke="#fef08a" stroke-width="1.6"/><path d="M18 35H46" stroke="#78350f" stroke-width="2"/></svg>`
  },
  'hoa-anh-dao': {
    id: 'hoa-anh-dao',
    name: 'Hoa Anh Đào',
    nameEn: 'Sakura Blossom',
    svg: `<svg class="agy-ct-svg-art" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><g transform="translate(32 32)"><ellipse cx="0" cy="-14" rx="7" ry="11" fill="#fbcfe8" stroke="#ec4899" stroke-width="1.2"/><ellipse cx="13" cy="-4" rx="7" ry="11" transform="rotate(72 13 -4)" fill="#fbcfe8" stroke="#ec4899" stroke-width="1.2"/><ellipse cx="8" cy="11" rx="7" ry="11" transform="rotate(144 8 11)" fill="#fbcfe8" stroke="#ec4899" stroke-width="1.2"/><ellipse cx="-8" cy="11" rx="7" ry="11" transform="rotate(216 -8 11)" fill="#fbcfe8" stroke="#ec4899" stroke-width="1.2"/><ellipse cx="-13" cy="-4" rx="7" ry="11" transform="rotate(288 -13 -4)" fill="#fbcfe8" stroke="#ec4899" stroke-width="1.2"/><circle cx="0" cy="0" r="5" fill="#fde047"/></g></svg>`
  },
  'den-long': {
    id: 'den-long',
    name: 'Đèn Lồng Đỏ',
    nameEn: 'Red Lantern',
    svg: `<svg class="agy-ct-svg-art" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="24" y="10" width="16" height="4" rx="2" fill="#fbbf24"/><ellipse cx="32" cy="32" rx="16" ry="18" fill="#e11d48" stroke="#fda4af" stroke-width="1.5"/><rect x="24" y="48" width="16" height="4" rx="2" fill="#fbbf24"/><line x1="32" y1="52" x2="32" y2="60" stroke="#f59e0b" stroke-width="2.2"/></svg>`
  },
  'rong-ngoc-mini': {
    id: 'rong-ngoc-mini',
    name: 'Ngọc Bội Rồng',
    nameEn: 'Jade Emblem',
    svg: `<svg class="agy-ct-svg-art" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="20" fill="#065f46" stroke="#34d399" stroke-width="2.4"/><circle cx="32" cy="32" r="8" fill="#022c22" stroke="#6ee7b7" stroke-width="1.8"/><path d="M32 10V18M32 46V54M10 32H18M46 32H54" stroke="#a7f3d0" stroke-width="2"/></svg>`
  },
  'lo-ma-thuat': {
    id: 'lo-ma-thuat',
    name: 'Lọ Mana Tím',
    nameEn: 'Arcane Potion',
    svg: `<svg class="agy-ct-svg-art" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="27" y="10" width="10" height="7" rx="2" fill="#d97706"/><path d="M27 17H37V24L49 42C51 48 46 54 39 54H25C18 54 13 48 15 42L27 24V17Z" fill="#581c87" stroke="#c084fc" stroke-width="1.8"/><path d="M18 42H46L44 49H20Z" fill="#a855f7" opacity="0.85"/></svg>`
  },
  'meo-huyen-sigil': {
    id: 'meo-huyen-sigil',
    name: 'Ấn Mèo Đêm',
    nameEn: 'Cat Sigil',
    svg: `<svg class="agy-ct-svg-art" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="34" r="19" stroke="#a855f7" stroke-width="1.6" stroke-dasharray="3 3"/><path d="M20 26L18 14L28 21H36L46 14L44 26C47 30 48 36 45 42C41 48 23 48 19 42C16 36 17 30 20 26Z" fill="#1e1b4b" stroke="#c084fc" stroke-width="1.6"/><circle cx="27" cy="34" r="2.2" fill="#e879f9"/><circle cx="37" cy="34" r="2.2" fill="#e879f9"/></svg>`
  },
  'kiem-anh': {
    id: 'kiem-anh',
    name: 'Katana Ánh Sáng',
    nameEn: 'Katana Crest',
    svg: `<svg class="agy-ct-svg-art" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 52L50 14" stroke="#e2e8f0" stroke-width="3.6" stroke-linecap="round"/><path d="M10 54L22 42" stroke="#f59e0b" stroke-width="5" stroke-linecap="round"/><path d="M20 38L26 44" stroke="#fde047" stroke-width="3" stroke-linecap="round"/></svg>`
  },
  'ho-lo-ngoc': {
    id: 'ho-lo-ngoc',
    name: 'Hồ Lô Tiên',
    nameEn: 'Jade Gourd',
    svg: `<svg class="agy-ct-svg-art" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="24" r="9" fill="#10b981" stroke="#a7f3d0" stroke-width="1.6"/><circle cx="32" cy="43" r="14" fill="#059669" stroke="#a7f3d0" stroke-width="1.6"/><path d="M25 32H39" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/></svg>`
  },
  'may-tuong-van': {
    id: 'may-tuong-van',
    name: 'Mây Tường Vân',
    nameEn: 'Auspicious Cloud',
    svg: `<svg class="agy-ct-svg-art" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 42H49C54 42 56 35 51 32C51 24 41 20 35 25C31 19 20 21 19 29C12 30 10 42 14 42Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.8"/></svg>`
  },
  'ngoi-sao-bang': {
    id: 'ngoi-sao-bang',
    name: 'Sao Băng',
    nameEn: 'Shooting Star',
    svg: `<svg class="agy-ct-svg-art" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 46L38 22M18 50L36 33" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round"/><path d="M44 12L47 20L55 22L47 25L44 33L41 25L33 22L41 20Z" fill="#fde047"/></svg>`
  },
  'ca-chep-vang': {
    id: 'ca-chep-vang',
    name: 'Sóng Kanagawa',
    nameEn: 'Kanagawa Crest',
    svg: `<svg class="agy-ct-svg-art" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="22" fill="#1e3a8a" stroke="#93c5fd" stroke-width="2"/><path d="M14 38C22 24 38 22 44 31C36 30 33 36 40 42C45 45 50 42 52 38" stroke="#f8fafc" stroke-width="3" stroke-linecap="round"/></svg>`
  },
  'quat-co-phong': {
    id: 'quat-co-phong',
    name: 'Quạt Cổ Phong',
    nameEn: 'Folding Fan',
    svg: `<svg class="agy-ct-svg-art" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M32 48L10 26C21 14 43 14 54 26L32 48Z" fill="#be123c" stroke="#fde68a" stroke-width="1.8"/><path d="M32 48L22 20M32 48V18M32 48L42 20" stroke="#fde68a" stroke-width="1.2" opacity="0.75"/></svg>`
  }
};

export function renderStickerSvg(id) {
  const tpl = STICKER_TEMPLATES[id] || STICKER_TEMPLATES['trang-sao'];
  return tpl.svg;
}
