/**
 * Animated SVG Mascots / Interactive Pets & Agent 4-Point Star generator.
 */

export const MASCOT_TEMPLATES = {
  'loi-kiem': {
    id: 'loi-kiem',
    name: 'Lôi Kiếm Chibi',
    nameEn: 'Thunder Blade',
    accent: '#f5c451',
    render(variant = 'pet') {
      const cls = variant === 'bubble' ? 'agy-ct-svg-art agy-ct-anim-bob' : 'agy-ct-svg-art agy-ct-anim-float';
      return `<svg class="${cls}" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="lkGold" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#fef08a"/><stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <linearGradient id="lkRobe" x1="28" y1="42" x2="68" y2="86" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <g class="agy-ct-anim-spark">
    <path d="M18 32L28 24L23 36L31 31" stroke="#fde047" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M77 28L67 36L74 40L65 49" stroke="#facc15" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <path d="M29 76C29 59 37 52 48 52C59 52 67 59 67 76L61 84H35L29 76Z" fill="url(#lkRobe)" stroke="#f5c451" stroke-width="1.6"/>
  <path d="M36 56L48 69L60 56" stroke="url(#lkGold)" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M22 72L74 34" stroke="#e2e8f0" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M20 74L30 66" stroke="url(#lkGold)" stroke-width="4.5" stroke-linecap="round"/>
  <circle cx="48" cy="36" r="17" fill="#fde68a" stroke="#f59e0b" stroke-width="1.5"/>
  <path d="M30 35C30 22 39 16 49 16C60 16 67 23 66 36C62 29 57 26 52 29L48 22L42 29C37 26 33 29 30 35Z" fill="#f59e0b"/>
  <g class="agy-ct-anim-blink" style="transform-origin:48px 38px">
    <ellipse cx="42" cy="38" rx="2.4" ry="3" fill="#0f172a"/>
    <ellipse cx="54" cy="38" rx="2.4" ry="3" fill="#0f172a"/>
    <circle cx="42.8" cy="37" r="0.9" fill="#fff"/>
    <circle cx="54.8" cy="37" r="0.9" fill="#fff"/>
  </g>
  <path d="M45 43Q48 45.5 51 43" stroke="#92400e" stroke-width="1.6" stroke-linecap="round"/>
</svg>`;
    }
  },
  'rong-ngoc': {
    id: 'rong-ngoc',
    name: 'Rồng Ngọc',
    nameEn: 'Jade Dragon',
    accent: '#34d399',
    render(variant = 'pet') {
      const cls = variant === 'bubble' ? 'agy-ct-svg-art agy-ct-anim-bob' : 'agy-ct-svg-art agy-ct-anim-float';
      return `<svg class="${cls}" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="rnBody" x1="20" y1="20" x2="78" y2="82" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#6ee7b7"/><stop offset="100%" stop-color="#059669"/>
    </linearGradient>
  </defs>
  <g class="agy-ct-anim-wag" style="transform-origin:34px 66px">
    <path d="M32 68C18 68 13 55 20 45C23 51 28 53 34 54" stroke="#10b981" stroke-width="6" stroke-linecap="round"/>
    <path d="M16 44L23 41L20 49Z" fill="#fde047"/>
  </g>
  <ellipse cx="49" cy="60" rx="18" ry="19" fill="url(#rnBody)" stroke="#a7f3d0" stroke-width="1.5"/>
  <ellipse cx="49" cy="63" rx="10" ry="12" fill="#d1fae5" opacity="0.85"/>
  <circle cx="49" cy="36" r="16" fill="url(#rnBody)" stroke="#a7f3d0" stroke-width="1.5"/>
  <path d="M36 22L31 12L41 19Z" fill="#fbbf24"/>
  <path d="M62 22L67 12L57 19Z" fill="#fbbf24"/>
  <g class="agy-ct-anim-blink" style="transform-origin:49px 36px">
    <circle cx="43" cy="36" r="2.8" fill="#064e3b"/>
    <circle cx="55" cy="36" r="2.8" fill="#064e3b"/>
    <circle cx="44" cy="35" r="1" fill="#ecfdf5"/>
    <circle cx="56" cy="35" r="1" fill="#ecfdf5"/>
  </g>
  <circle cx="66" cy="24" r="3" fill="#fef08a" class="agy-ct-anim-twinkle"/>
</svg>`;
    }
  },
  'ho-ly-chibi': {
    id: 'ho-ly-chibi',
    name: 'Hồ Ly Chibi',
    nameEn: 'Chibi Fox',
    accent: '#fb923c',
    render(variant = 'pet') {
      const cls = variant === 'bubble' ? 'agy-ct-svg-art agy-ct-anim-bob' : 'agy-ct-svg-art agy-ct-anim-float';
      return `<svg class="${cls}" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g class="agy-ct-anim-wag" style="transform-origin:34px 66px">
    <path d="M34 68C16 74 11 54 22 44C28 49 32 58 35 64Z" fill="#fb923c" stroke="#fed7aa" stroke-width="1.4"/>
    <path d="M22 44C17 48 16 53 19 56C22 53 24 49 22 44Z" fill="#fff7ed"/>
  </g>
  <ellipse cx="50" cy="63" rx="16" ry="17" fill="#fb923c" stroke="#ffedd5" stroke-width="1.4"/>
  <ellipse cx="50" cy="65" rx="9" ry="11" fill="#fff7ed"/>
  <path d="M35 28L30 12L44 22Z" fill="#ea580c" stroke="#fed7aa" stroke-width="1.2"/>
  <path d="M65 28L70 12L56 22Z" fill="#ea580c" stroke="#fed7aa" stroke-width="1.2"/>
  <circle cx="50" cy="38" r="16" fill="#fb923c" stroke="#ffedd5" stroke-width="1.4"/>
  <path d="M35 41C39 49 61 49 65 41C60 44 55 43 50 40C45 43 40 44 35 41Z" fill="#fff7ed"/>
  <g class="agy-ct-anim-blink" style="transform-origin:50px 37px">
    <circle cx="44" cy="36" r="2.6" fill="#1c1917"/>
    <circle cx="56" cy="36" r="2.6" fill="#1c1917"/>
    <circle cx="44.8" cy="35" r="0.9" fill="#fff"/>
    <circle cx="56.8" cy="35" r="0.9" fill="#fff"/>
  </g>
  <circle cx="50" cy="41" r="1.8" fill="#431407"/>
</svg>`;
    }
  },
  'meo-than': {
    id: 'meo-than',
    name: 'Mèo Than',
    nameEn: 'Soot Kitty',
    accent: '#94a3b8',
    render(variant = 'pet') {
      const cls = variant === 'bubble' ? 'agy-ct-svg-art agy-ct-anim-bob' : 'agy-ct-svg-art agy-ct-anim-float';
      return `<svg class="${cls}" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g class="agy-ct-anim-wag" style="transform-origin:62px 68px">
    <path d="M64 68C76 68 81 55 74 47" stroke="#334155" stroke-width="5.5" stroke-linecap="round"/>
  </g>
  <ellipse cx="48" cy="63" rx="17" ry="16" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
  <path d="M35 30L31 14L44 24Z" fill="#1e293b" stroke="#64748b" stroke-width="1.3"/>
  <path d="M61 30L65 14L52 24Z" fill="#1e293b" stroke="#64748b" stroke-width="1.3"/>
  <circle cx="48" cy="39" r="16" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
  <g class="agy-ct-anim-blink" style="transform-origin:48px 39px">
    <ellipse cx="42" cy="39" rx="3" ry="3.4" fill="#fde047"/>
    <ellipse cx="54" cy="39" rx="3" ry="3.4" fill="#fde047"/>
    <ellipse cx="42" cy="39" rx="1.1" ry="2.4" fill="#0f172a"/>
    <ellipse cx="54" cy="39" rx="1.1" ry="2.4" fill="#0f172a"/>
  </g>
  <path d="M46 44L48 46L50 44" stroke="#f472b6" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="48" cy="52" r="2.6" fill="#fbbf24"/>
</svg>`;
    }
  },
  'meo-huyen-thuat': {
    id: 'meo-huyen-thuat',
    name: 'Mèo Huyền Thuật',
    nameEn: 'Arcane Cat',
    accent: '#c084fc',
    render(variant = 'pet') {
      const cls = variant === 'bubble' ? 'agy-ct-svg-art agy-ct-anim-bob' : 'agy-ct-svg-art agy-ct-anim-float';
      return `<svg class="${cls}" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="48" cy="48" r="34" stroke="#a855f7" stroke-width="1.2" stroke-dasharray="4 4" class="agy-ct-anim-spin" style="transform-origin:48px 48px" opacity="0.65"/>
  <ellipse cx="48" cy="64" rx="15" ry="15" fill="#312e81" stroke="#c084fc" stroke-width="1.5"/>
  <path d="M35 30L30 14L44 24Z" fill="#312e81" stroke="#c084fc" stroke-width="1.3"/>
  <path d="M61 30L66 14L52 24Z" fill="#312e81" stroke="#c084fc" stroke-width="1.3"/>
  <circle cx="48" cy="40" r="15" fill="#312e81" stroke="#c084fc" stroke-width="1.5"/>
  <path d="M48 28L50 32L54 32L51 35L48 33L45 35L42 32L46 32Z" fill="#e9d5ff"/>
  <g class="agy-ct-anim-blink" style="transform-origin:48px 41px">
    <circle cx="42" cy="41" r="2.8" fill="#e879f9"/>
    <circle cx="54" cy="41" r="2.8" fill="#e879f9"/>
    <circle cx="42" cy="41" r="1" fill="#fdf4ff"/>
    <circle cx="54" cy="41" r="1" fill="#fdf4ff"/>
  </g>
</svg>`;
    }
  },
  'phu-thuy-anh-trang': {
    id: 'phu-thuy-anh-trang',
    name: 'Phù Thủy Ánh Trăng',
    nameEn: 'Moonlight Witch',
    accent: '#a78bfa',
    render(variant = 'pet') {
      const cls = variant === 'bubble' ? 'agy-ct-svg-art agy-ct-anim-bob' : 'agy-ct-svg-art agy-ct-anim-float';
      return `<svg class="${cls}" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M22 76L76 62" stroke="#92400e" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M16 78L27 71L25 81Z" fill="#fbbf24"/>
  <path d="M37 72L48 48L59 72Z" fill="#4c1d95" stroke="#c4b5fd" stroke-width="1.4"/>
  <circle cx="48" cy="40" r="12" fill="#fde68a"/>
  <path d="M26 32H70L54 22L48 8L42 22Z" fill="#3b0764" stroke="#c084fc" stroke-width="1.5" stroke-linejoin="round"/>
  <rect x="40" y="25" width="16" height="4" rx="2" fill="#f59e0b"/>
  <g class="agy-ct-anim-blink" style="transform-origin:48px 40px">
    <circle cx="44" cy="40" r="2" fill="#1e1b4b"/>
    <circle cx="52" cy="40" r="2" fill="#1e1b4b"/>
  </g>
  <circle cx="72" cy="24" r="3" fill="#fef08a" class="agy-ct-anim-twinkle"/>
</svg>`;
    }
  },
  'hoa-anh-dao': {
    id: 'hoa-anh-dao',
    name: 'Tinh Linh Anh Đào',
    nameEn: 'Sakura Spirit',
    accent: '#f472b6',
    render(variant = 'pet') {
      const cls = variant === 'bubble' ? 'agy-ct-svg-art agy-ct-anim-bob' : 'agy-ct-svg-art agy-ct-anim-float';
      return `<svg class="${cls}" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(48 48)">
    <g class="agy-ct-anim-spin" style="transform-origin:0 0">
      <ellipse cx="0" cy="-22" rx="11" ry="16" fill="#fbcfe8" stroke="#f472b6" stroke-width="1.4"/>
      <ellipse cx="21" cy="-7" rx="11" ry="16" transform="rotate(72 21 -7)" fill="#fbcfe8" stroke="#f472b6" stroke-width="1.4"/>
      <ellipse cx="13" cy="18" rx="11" ry="16" transform="rotate(144 13 18)" fill="#fbcfe8" stroke="#f472b6" stroke-width="1.4"/>
      <ellipse cx="-13" cy="18" rx="11" ry="16" transform="rotate(216 -13 18)" fill="#fbcfe8" stroke="#f472b6" stroke-width="1.4"/>
      <ellipse cx="-21" cy="-7" rx="11" ry="16" transform="rotate(288 -21 -7)" fill="#fbcfe8" stroke="#f472b6" stroke-width="1.4"/>
    </g>
    <circle cx="0" cy="0" r="12" fill="#fdf2f8" stroke="#ec4899" stroke-width="1.6"/>
    <g class="agy-ct-anim-blink">
      <circle cx="-4" cy="-1" r="1.8" fill="#831843"/>
      <circle cx="4" cy="-1" r="1.8" fill="#831843"/>
    </g>
    <path d="M-2.5 3Q0 5.5 2.5 3" stroke="#be185d" stroke-width="1.5" stroke-linecap="round"/>
  </g>
</svg>`;
    }
  },
  'den-long': {
    id: 'den-long',
    name: 'Đèn Lồng Tiên',
    nameEn: 'Spirit Lantern',
    accent: '#fb7185',
    render(variant = 'pet') {
      const cls = variant === 'bubble' ? 'agy-ct-svg-art agy-ct-anim-bob' : 'agy-ct-svg-art agy-ct-anim-float';
      return `<svg class="${cls}" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="dlGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef08a"/><stop offset="65%" stop-color="#f43f5e"/><stop offset="100%" stop-color="#9f1239"/>
    </radialGradient>
  </defs>
  <line x1="48" y1="8" x2="48" y2="20" stroke="#fbbf24" stroke-width="2.2"/>
  <rect x="35" y="18" width="26" height="6" rx="3" fill="#fbbf24"/>
  <ellipse cx="48" cy="46" rx="22" ry="24" fill="url(#dlGlow)" stroke="#fda4af" stroke-width="1.6"/>
  <ellipse cx="48" cy="46" rx="11" ry="24" stroke="#fecdd3" stroke-width="1.2" opacity="0.65"/>
  <rect x="35" y="68" width="26" height="6" rx="3" fill="#fbbf24"/>
  <path d="M44 74L42 88M48 74V90M52 74L54 88" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round"/>
  <g class="agy-ct-anim-blink" style="transform-origin:48px 44px">
    <circle cx="42" cy="44" r="2.2" fill="#4c0519"/>
    <circle cx="54" cy="44" r="2.2" fill="#4c0519"/>
  </g>
</svg>`;
    }
  },
  'ca-koi': {
    id: 'ca-koi',
    name: 'Cá Koi Tinh Tú',
    nameEn: 'Cosmic Koi',
    accent: '#60a5fa',
    render(variant = 'pet') {
      const cls = variant === 'bubble' ? 'agy-ct-svg-art agy-ct-anim-bob' : 'agy-ct-svg-art agy-ct-anim-float';
      return `<svg class="${cls}" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g class="agy-ct-anim-wag" style="transform-origin:34px 52px">
    <path d="M26 56L10 42C12 52 12 60 10 68L26 56Z" fill="#93c5fd" stroke="#e0f2fe" stroke-width="1.3"/>
  </g>
  <path d="M24 54C32 32 62 28 76 46C65 65 36 68 24 54Z" fill="#3b82f6" stroke="#bae6fd" stroke-width="1.6"/>
  <path d="M40 36C48 34 55 40 53 46C46 47 41 43 40 36Z" fill="#fb923c"/>
  <path d="M52 54C58 50 64 51 66 56C60 60 54 59 52 54Z" fill="#f8fafc"/>
  <circle cx="66" cy="45" r="2.4" fill="#0f172a"/>
  <circle cx="66.8" cy="44.2" r="0.8" fill="#fff"/>
  <circle cx="78" cy="30" r="2.5" fill="#fef08a" class="agy-ct-anim-twinkle"/>
</svg>`;
    }
  },
  'chopper-chibi': {
    id: 'chopper-chibi',
    name: 'Chopper Chibi',
    nameEn: 'Chibi Chopper',
    accent: '#f472b6',
    render(variant = 'pet') {
      const cls = variant === 'bubble' ? 'agy-ct-svg-art agy-ct-anim-bob' : 'agy-ct-svg-art agy-ct-anim-float';
      return `<svg class="${cls}" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M29 30L18 16M24 23L14 25M26 20L24 11" stroke="#78350f" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M67 30L78 16M72 23L82 25M70 20L72 11" stroke="#78350f" stroke-width="3.4" stroke-linecap="round"/>
  <ellipse cx="48" cy="68" rx="15" ry="15" fill="#d49560" stroke="#78350f" stroke-width="1.4"/>
  <path d="M36 66C36 58 60 58 60 66L58 80H38Z" fill="#ef4444" opacity="0.92"/>
  <circle cx="48" cy="46" r="16" fill="#e5a973" stroke="#78350f" stroke-width="1.4"/>
  <path d="M25 38C25 22 35 14 48 14C61 14 71 22 71 38Z" fill="#f472b6" stroke="#be185d" stroke-width="1.4"/>
  <path d="M31 28C33 20 40 16 48 16C54 16 59 18 63 23C55 21 40 22 31 28Z" fill="#fbcfe8" opacity="0.55"/>
  <ellipse cx="48" cy="38" rx="26" ry="5.5" fill="#ec4899" stroke="#be185d" stroke-width="1.4"/>
  <path d="M45 21H51V31H45ZM43 24H53V28H43Z" fill="#ffffff"/>
  <g class="agy-ct-anim-blink" style="transform-origin:48px 47px">
    <circle cx="41" cy="47" r="2.7" fill="#0f172a"/>
    <circle cx="55" cy="47" r="2.7" fill="#0f172a"/>
    <circle cx="41.9" cy="46" r="0.9" fill="#ffffff"/>
    <circle cx="55.9" cy="46" r="0.9" fill="#ffffff"/>
  </g>
  <ellipse cx="48" cy="51" rx="3.4" ry="2.4" fill="#2563eb"/>
  <path d="M44 56Q48 59 52 56" stroke="#78350f" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="77" cy="24" r="3" fill="#fbcfe8" class="agy-ct-anim-twinkle"/>
</svg>`;
    }
  },
  'thousand-sunny': {
    id: 'thousand-sunny',
    name: 'Tàu Thousand Sunny',
    nameEn: 'Thousand Sunny',
    accent: '#f5c451',
    render(variant = 'pet') {
      const cls = variant === 'bubble' ? 'agy-ct-svg-art agy-ct-anim-bob' : 'agy-ct-svg-art agy-ct-anim-float';
      return `<svg class="${cls}" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g class="agy-ct-anim-wag" style="transform-origin:48px 56px">
    <line x1="48" y1="14" x2="48" y2="58" stroke="#78350f" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M48 15L66 19L48 24Z" fill="#dc2626"/>
    <path d="M27 25Q48 18 69 25L65 51Q48 45 31 51Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.3"/>
    <path d="M31 46Q48 41 65 46L65 51Q48 45 31 51Z" fill="#fef3c7"/>
    <circle cx="48" cy="37" r="7" fill="#fef08a" stroke="#dc2626" stroke-width="1.6"/>
  </g>
  <path d="M20 58H76L68 74C65 78 60 80 54 80H40C32 80 25 74 20 58Z" fill="#b45309" stroke="#fbbf24" stroke-width="1.5"/>
  <path d="M23 59H73L70 65H25Z" fill="#d97706" opacity="0.8"/>
  <rect x="26" y="54" width="44" height="5" rx="2.5" fill="#22c55e"/>
  <g transform="translate(24 62)">
    <circle cx="0" cy="0" r="11" fill="#f59e0b" stroke="#fde047" stroke-width="1.4"/>
    <circle cx="0" cy="0" r="7" fill="#fef3c7"/>
    <circle cx="-2.4" cy="-1" r="1.3" fill="#0f172a"/><circle cx="2.4" cy="-1" r="1.3" fill="#0f172a"/>
    <path d="M-2 2.5Q0 4.5 2 2.5" stroke="#92400e" stroke-width="1.3" stroke-linecap="round"/>
  </g>
  <path d="M14 82Q31 76 48 82T82 82" stroke="#38bdf8" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="76" cy="30" r="2.8" fill="#fef08a" class="agy-ct-anim-twinkle"/>
</svg>`;
    }
  },
  'luffy-chibi': {
    id: 'luffy-chibi',
    name: 'Luffy Mũ Rơm',
    nameEn: 'Straw Hat Luffy',
    accent: '#d7474b',
    render(variant = 'pet') {
      const cls = variant === 'bubble' ? 'agy-ct-svg-art agy-ct-anim-bob' : 'agy-ct-svg-art agy-ct-anim-float';
      return `<svg class="${cls}" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M35 59L29 67M61 59L67 67" stroke="#d97706" stroke-width="6" stroke-linecap="round"/>
  <path d="M35 59L29 67M61 59L67 67" stroke="#fde68a" stroke-width="3.6" stroke-linecap="round"/>
  <path d="M31 78C31 61 38 54 48 54C58 54 65 61 65 78L60 84H36Z" fill="#dc2626" stroke="#991b1b" stroke-width="1.5"/>
  <path d="M32 61Q35.5 55 39 59L37 64Q34 62 32 61Z" fill="#ef4444" stroke="#991b1b" stroke-width="1.1"/>
  <path d="M64 61Q60.5 55 57 59L59 64Q62 62 64 61Z" fill="#ef4444" stroke="#991b1b" stroke-width="1.1"/>
  <path d="M43 55H53L51 77H45Z" fill="#fde68a"/>
  <path d="M45 61L51 67M51 61L45 67" stroke="#b45309" stroke-width="1.6" stroke-linecap="round"/>
  <rect x="36" y="75" width="24" height="4.5" rx="2" fill="#f59e0b"/>
  <circle cx="29" cy="68" r="5" fill="#fde68a" stroke="#d97706" stroke-width="1.2"/>
  <circle cx="67" cy="68" r="5" fill="#fde68a" stroke="#d97706" stroke-width="1.2"/>
  <circle cx="48" cy="40" r="16" fill="#fde68a" stroke="#d97706" stroke-width="1.4"/>
  <path d="M32 37C32 28 39 24 48 24C57 24 64 28 64 37C60 32 56 32 52 36L48 29L43 36C39 32 35 33 32 37Z" fill="#0f172a"/>
  <g class="agy-ct-anim-blink" style="transform-origin:48px 40px">
    <circle cx="41.5" cy="40" r="2.6" fill="#0f172a"/>
    <circle cx="54.5" cy="40" r="2.6" fill="#0f172a"/>
    <circle cx="42.3" cy="39" r="0.9" fill="#ffffff"/>
    <circle cx="55.3" cy="39" r="0.9" fill="#ffffff"/>
  </g>
  <path d="M52 44Q56 46 60 45M55 43.5L54.5 47M58 44L57.5 47.5" stroke="#991b1b" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M40 46Q48 53 56 46Z" fill="#ffffff" stroke="#7c2d12" stroke-width="1.3" stroke-linejoin="round"/>
  <path d="M31 27C31 15 39 10 48 10C57 10 65 15 65 27Z" fill="#fde047" stroke="#a16207" stroke-width="1.5"/>
  <path d="M39 15Q48 12.5 57 15" stroke="#fef9c3" stroke-width="1.3" stroke-linecap="round" opacity="0.8"/>
  <path d="M31 23H65V27H31Z" fill="#dc2626" stroke="#991b1b" stroke-width="0.9"/>
  <ellipse cx="48" cy="27.5" rx="25" ry="5.5" fill="#facc15" stroke="#a16207" stroke-width="1.6"/>
  <circle cx="77" cy="24" r="2.6" fill="#fde047" class="agy-ct-anim-twinkle"/>
</svg>`;
    }
  },
  'luffy-gear5': {
    id: 'luffy-gear5',
    name: 'Luffy Gear 5 (Nika)',
    nameEn: 'Luffy Gear 5 (Nika)',
    accent: '#e9d5ff',
    render(variant = 'pet') {
      const cls = variant === 'bubble' ? 'agy-ct-svg-art agy-ct-anim-bob' : 'agy-ct-svg-art agy-ct-anim-float';
      return `<svg class="${cls}" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g class="agy-ct-anim-spark">
    <path d="M16 32L24 22L21 34L28 29" stroke="#e9d5ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M80 28L71 36L76 41L68 50" stroke="#fde047" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <path d="M22 63C14 57 15 44 25 42C29 36 37 37 40 42H56C59 37 67 36 71 42C81 44 82 57 74 63C69 67 63 63 60 58H36C33 63 27 67 22 63Z" fill="#ffffff" stroke="#9333ea" stroke-width="1.6"/>
  <path d="M24 58C19 54 20 47 26 46M72 58C77 54 76 47 70 46M30 43Q34 39 38 43M58 43Q62 39 66 43" stroke="#d8b4fe" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M35 60L30 68M61 60L66 68" stroke="#d97706" stroke-width="5.6" stroke-linecap="round"/>
  <path d="M35 60L30 68M61 60L66 68" stroke="#fde68a" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M32 78C32 61 38 54 48 54C58 54 64 61 64 78L59 84H37Z" fill="#f8fafc" stroke="#64748b" stroke-width="1.5"/>
  <path d="M43 55H53L51 76H45Z" fill="#fde68a"/>
  <path d="M45 61L51 67M51 61L45 67" stroke="#b45309" stroke-width="1.6" stroke-linecap="round"/>
  <rect x="37" y="75" width="22" height="4.5" rx="2" fill="#c084fc" stroke="#7e22ce" stroke-width="0.8"/>
  <circle cx="30" cy="68" r="4.6" fill="#fde68a" stroke="#d97706" stroke-width="1.2"/>
  <circle cx="66" cy="68" r="4.6" fill="#fde68a" stroke="#d97706" stroke-width="1.2"/>
  <circle cx="48" cy="40" r="15.5" fill="#fde68a" stroke="#94a3b8" stroke-width="1.4"/>
  <path d="M29 37C25 27 31 19 38 20C40 12 52 11 56 18C63 16 70 23 66 33C69 36 66 40 62 39C59 31 54 31 50 35L47 28L42 35C37 31 33 33 29 37Z" fill="#f8fafc" stroke="#64748b" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M34 25C38 19 46 18 52 21M55 24Q60 22 62 27" stroke="#ddd6fe" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M38 35.5Q41.5 34 44.5 35.5M51.5 35.5Q54.5 34 58 35.5" stroke="#94a3b8" stroke-width="1.2" stroke-linecap="round"/>
  <g class="agy-ct-anim-blink" style="transform-origin:48px 40px">
    <circle cx="41.5" cy="40" r="2.7" fill="#e11d48"/>
    <circle cx="54.5" cy="40" r="2.7" fill="#e11d48"/>
    <circle cx="41.5" cy="40" r="1.1" fill="#ffffff"/>
    <circle cx="54.5" cy="40" r="1.1" fill="#ffffff"/>
  </g>
  <path d="M52 44Q56 46 60 45" stroke="#991b1b" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M39 45Q48 54 57 45Z" fill="#ffffff" stroke="#64748b" stroke-width="1.3" stroke-linejoin="round"/>
  <circle cx="77" cy="20" r="2.8" fill="#fef08a" class="agy-ct-anim-twinkle"/>
</svg>`;
    }
  },
  'luffy-anime': {
    id: 'luffy-anime',
    name: 'Luffy Anime (Toàn thân)',
    nameEn: 'Anime Luffy (Full Body)',
    accent: '#d7474b',
    aspect: 0.62,
    embeddedDataUri: '',
    render(variant = 'pet') {
      const cls = variant === 'bubble' ? 'agy-ct-svg-art agy-ct-anim-bob' : 'agy-ct-svg-art agy-ct-anim-float';
      return `<svg class="${cls}" viewBox="0 0 110 176" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M24 58C14 70 8 102 12 140L32 132L36 62Z" fill="#111827" stroke="#020617" stroke-width="1.6"/>
  <path d="M84 58C96 70 102 102 98 140L78 132L74 62Z" fill="#111827" stroke="#020617" stroke-width="1.6"/>
  <path d="M36 96H74L79 124L61 126L55 112L49 126L31 124Z" fill="#1d4ed8" stroke="#0f172a" stroke-width="1.5"/>
  <path d="M40 120H50V158H38Z" fill="#f7c59f" stroke="#7c2d12" stroke-width="1.2"/>
  <path d="M60 120H70L74 158H62Z" fill="#f7c59f" stroke="#7c2d12" stroke-width="1.2"/>
  <path d="M42 54H68L70 95H40Z" fill="#f7c59f"/>
  <path d="M48 64L62 79M62 64L48 79" stroke="#a65b46" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M37 54H48L46 94H34Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.3"/>
  <path d="M62 54H73L76 94H64Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.3"/>
  <path d="M38 90H72L73 99H37Z" fill="#facc15" stroke="#854d0e" stroke-width="1.2"/>
  <circle cx="55" cy="38" r="15" fill="#f7c59f" stroke="#451a03" stroke-width="1.3"/>
  <path d="M40 35C40 24 47 20 55 20C63 20 70 24 70 35C66 30 62 30 58 34L55 26L50 34C46 30 43 31 40 35Z" fill="#0f172a"/>
  <ellipse cx="55" cy="24" rx="28" ry="6.5" fill="#facc15" stroke="#713f12" stroke-width="1.5"/>
  <path d="M38 22C38 11 45 6 55 6C65 6 72 11 72 22Z" fill="#fde047" stroke="#713f12" stroke-width="1.4"/>
  <path d="M38 18H72V22H38Z" fill="#dc2626"/>
</svg>`;
    }
  },
  'luffy-gear5-anime': {
    id: 'luffy-gear5-anime',
    name: 'Luffy Gear 5 (Anime)',
    nameEn: 'Gear 5 Luffy (Anime)',
    accent: '#e9d5ff',
    aspect: 0.64,
    embeddedDataUri: '',
    render(variant = 'pet') {
      const cls = variant === 'bubble' ? 'agy-ct-svg-art agy-ct-anim-bob' : 'agy-ct-svg-art agy-ct-anim-float';
      return `<svg class="${cls}" viewBox="0 0 112 176" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M22 68C10 58 12 42 24 39C30 28 42 28 48 36H64C70 28 82 28 88 39C100 42 102 58 90 68C83 74 75 68 70 62H42C37 68 29 74 22 68Z" fill="#ffffff" stroke="#9333ea" stroke-width="1.6"/>
  <path d="M38 96H74L80 120L61 122L55 108L49 122L32 119Z" fill="#f8fafc" stroke="#64748b" stroke-width="1.4"/>
  <path d="M40 118H50L44 156H34Z" fill="#fde6d2" stroke="#64748b" stroke-width="1.2"/>
  <path d="M62 118L76 138L84 148L76 154L64 140L56 120Z" fill="#fde6d2" stroke="#64748b" stroke-width="1.2"/>
  <path d="M43 56H69L67 96H45Z" fill="#fde6d2"/>
  <path d="M49 65L63 80M63 65L49 80" stroke="#c27a66" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M38 56H48L46 95H36Z" fill="#ffffff" stroke="#64748b" stroke-width="1.3"/>
  <path d="M64 56H74L76 95H66Z" fill="#ffffff" stroke="#64748b" stroke-width="1.3"/>
  <path d="M39 91H73L74 100H38Z" fill="#a855f7" stroke="#581c87" stroke-width="1.2"/>
  <circle cx="56" cy="39" r="14.5" fill="#fde6d2" stroke="#475569" stroke-width="1.3"/>
  <path d="M36 37C31 27 36 16 45 17C48 8 60 7 65 15C73 12 80 20 76 30C80 34 76 41 70 38Z" fill="#ffffff" stroke="#7c3aed" stroke-width="1.5"/>
  <circle cx="50" cy="38" r="2.2" fill="#e11d48"/><circle cx="62" cy="38" r="2.2" fill="#e11d48"/>
  <circle cx="88" cy="24" r="2.8" fill="#fef08a" class="agy-ct-anim-twinkle"/>
</svg>`;
    }
  }
};

export function renderMascotSvg(id, variant = 'pet') {
  const tpl = MASCOT_TEMPLATES[id] || MASCOT_TEMPLATES['rong-ngoc'];
  return tpl.render(variant);
}

export function renderAgentStarSvg(primaryHex = '#60a5fa', secondaryHex = '#f5c451') {
  const safePrimary = /^#[0-9a-fA-F]{3,8}$/.test(String(primaryHex)) ? primaryHex : '#60a5fa';
  const safeSecondary = /^#[0-9a-fA-F]{3,8}$/.test(String(secondaryHex)) ? secondaryHex : '#f5c451';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="star" x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${safePrimary}"/>
      <stop offset="100%" stop-color="${safeSecondary}"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="32" fill="url(#bg)"/>
  <path d="M32 10L37.5 26.5L54 32L37.5 37.5L32 54L26.5 37.5L10 32L26.5 26.5Z" fill="url(#star)"/>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
