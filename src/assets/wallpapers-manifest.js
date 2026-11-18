/**
 * Built-in high-DPI procedural SVG wallpapers + custom upload/URL resolver.
 */

function wpSvgUri(svgMarkup) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
}

export const WALLPAPERS = [
  {
    id: 'none',
    name: 'Không ảnh nền (Màu thuần)',
    nameEn: 'None (Solid / Gradient)',
    embeddedDataUri: '',
    previewCss: 'linear-gradient(135deg, #11131a 0%, #1c1f2b 100%)'
  },
  {
    id: 'thunder-samurai',
    name: 'Lôi Kiếm Vũ Đêm',
    nameEn: 'Thunder Samurai',
    embeddedDataUri: wpSvgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="tsSky" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#080c17"/><stop offset="55%" stop-color="#111827"/><stop offset="100%" stop-color="#1f160d"/></linearGradient>
        <radialGradient id="tsGlow" cx="72%" cy="38%" r="48%"><stop offset="0%" stop-color="#f59e0b" stop-opacity="0.35"/><stop offset="100%" stop-color="#080c17" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#tsSky)"/><rect width="1600" height="900" fill="url(#tsGlow)"/>
      <circle cx="1160" cy="240" r="110" fill="#fef08a" opacity="0.16"/>
      <path d="M0 720L280 560L580 680L940 490L1310 640L1600 510V900H0Z" fill="#0b101b"/>
      <path d="M0 780L410 640L820 750L1220 590L1600 710V900H0Z" fill="#06080f"/>
      <path d="M1050 80L980 260L1045 275L950 480" stroke="#fde047" stroke-width="5" fill="none" opacity="0.55" stroke-linecap="round"/>
      <path d="M420 120L460 240L425 255L475 390" stroke="#60a5fa" stroke-width="3" fill="none" opacity="0.35" stroke-linecap="round"/>
    </svg>`),
    previewCss: 'linear-gradient(135deg, #0b101b 0%, #3b2a10 100%)'
  },
  {
    id: 'sakura-shrine-night',
    name: 'Đền Thờ Anh Đào Đêm',
    nameEn: 'Midnight Sakura Shrine',
    embeddedDataUri: wpSvgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="skSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#130b1c"/><stop offset="60%" stop-color="#25132e"/><stop offset="100%" stop-color="#120814"/></linearGradient>
        <radialGradient id="skMoon" cx="76%" cy="28%" r="36%"><stop offset="0%" stop-color="#f9a8d4" stop-opacity="0.38"/><stop offset="100%" stop-color="#130b1c" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#skSky)"/><rect width="1600" height="900" fill="url(#skMoon)"/>
      <circle cx="1220" cy="240" r="95" fill="#fbcfe8" opacity="0.22"/>
      <path d="M1030 580H1360V600H1030Z M1080 540H1310V560H1080Z M1120 560V760H1146V560Z M1244 560V760H1270V560Z" fill="#4c1d3d" opacity="0.72"/>
      <path d="M0 740Q380 650 780 730T1600 680V900H0Z" fill="#0d0611"/>
      <circle cx="240" cy="180" r="140" fill="#f472b6" opacity="0.09"/>
      <circle cx="1410" cy="190" r="180" fill="#ec4899" opacity="0.1"/>
    </svg>`),
    previewCss: 'linear-gradient(135deg, #1b0c24 0%, #581c4c 100%)'
  },
  {
    id: 'cosmic-violin',
    name: 'Thiên Hà Tinh Tú 4K',
    nameEn: 'Cosmic Starlight',
    embeddedDataUri: wpSvgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="cvSky" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#040814"/><stop offset="55%" stop-color="#0b1530"/><stop offset="100%" stop-color="#141838"/></linearGradient>
        <radialGradient id="cvNeb" cx="68%" cy="42%" r="50%"><stop offset="0%" stop-color="#38bdf8" stop-opacity="0.32"/><stop offset="60%" stop-color="#6366f1" stop-opacity="0.14"/><stop offset="100%" stop-color="#040814" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#cvSky)"/><rect width="1600" height="900" fill="url(#cvNeb)"/>
      <ellipse cx="1090" cy="390" rx="440" ry="120" transform="rotate(-18 1090 390)" stroke="#7dd3fc" stroke-width="2.5" fill="none" opacity="0.28"/>
      <ellipse cx="1090" cy="390" rx="340" ry="85" transform="rotate(-18 1090 390)" stroke="#fde047" stroke-width="1.5" fill="none" opacity="0.24"/>
      <circle cx="1090" cy="390" r="68" fill="#60a5fa" opacity="0.18"/>
      <circle cx="320" cy="210" r="3" fill="#fff" opacity="0.8"/><circle cx="710" cy="140" r="2.5" fill="#bae6fd" opacity="0.85"/><circle cx="1390" cy="190" r="3.2" fill="#fef08a" opacity="0.8"/><circle cx="880" cy="640" r="2.5" fill="#fff" opacity="0.6"/>
    </svg>`),
    previewCss: 'linear-gradient(135deg, #060b1c 0%, #1d356b 100%)'
  },
  {
    id: 'jade-sanctuary',
    name: 'Thung Lũng Ngọc Bích',
    nameEn: 'Jade Sanctuary',
    embeddedDataUri: wpSvgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="jdSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#031614"/><stop offset="55%" stop-color="#06332c"/><stop offset="100%" stop-color="#031411"/></linearGradient>
        <radialGradient id="jdMist" cx="70%" cy="35%" r="50%"><stop offset="0%" stop-color="#34d399" stop-opacity="0.3"/><stop offset="100%" stop-color="#031614" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#jdSky)"/><rect width="1600" height="900" fill="url(#jdMist)"/>
      <path d="M0 640L320 430L640 610L990 360L1350 580L1600 460V900H0Z" fill="#062922"/>
      <path d="M0 760L450 580L880 720L1280 540L1600 680V900H0Z" fill="#021814"/>
      <circle cx="1140" cy="240" r="76" fill="#a7f3d0" opacity="0.18"/>
    </svg>`),
    previewCss: 'linear-gradient(135deg, #04211c 0%, #0d5c46 100%)'
  },
  {
    id: 'arcane-moonlight',
    name: 'Ánh Trăng Huyền Thuật',
    nameEn: 'Moonlight Arcane',
    embeddedDataUri: wpSvgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="amBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0c071b"/><stop offset="55%" stop-color="#1e113a"/><stop offset="100%" stop-color="#0f0921"/></linearGradient>
        <radialGradient id="amAura" cx="72%" cy="36%" r="44%"><stop offset="0%" stop-color="#c084fc" stop-opacity="0.34"/><stop offset="100%" stop-color="#0c071b" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#amBg)"/><rect width="1600" height="900" fill="url(#amAura)"/>
      <circle cx="1140" cy="310" r="145" stroke="#c084fc" stroke-width="2" stroke-dasharray="10 8" fill="none" opacity="0.35"/>
      <circle cx="1140" cy="310" r="95" stroke="#e9d5ff" stroke-width="1.5" fill="none" opacity="0.28"/>
      <path d="M0 730Q440 620 920 710T1600 640V900H0Z" fill="#090514"/>
    </svg>`),
    previewCss: 'linear-gradient(135deg, #13092b 0%, #4c1d95 100%)'
  },
  {
    id: 'kanagawa-wave',
    name: 'Sóng Lừng Kanagawa',
    nameEn: 'Kanagawa Wave',
    embeddedDataUri: wpSvgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="kwBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1f1f28"/><stop offset="50%" stop-color="#223249"/><stop offset="100%" stop-color="#16161d"/></linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#kwBg)"/>
      <circle cx="1180" cy="240" r="88" fill="#e6c384" opacity="0.22"/>
      <path d="M0 660C280 500 540 520 760 640C940 740 1240 520 1600 620V900H0Z" fill="#2d4f67" opacity="0.72"/>
      <path d="M0 740C340 600 660 660 960 760C1180 820 1420 670 1600 720V900H0Z" fill="#182232"/>
      <path d="M360 540C470 430 650 430 720 510C620 490 560 530 610 580" stroke="#dcd7ba" stroke-width="6" fill="none" opacity="0.45" stroke-linecap="round"/>
    </svg>`),
    previewCss: 'linear-gradient(135deg, #1f1f28 0%, #2d4f67 100%)'
  },
  {
    id: 'kanagawa-lotus',
    name: 'Kanagawa Lotus (Sáng)',
    nameEn: 'Kanagawa Lotus (Light)',
    embeddedDataUri: wpSvgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="klBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f2ecbc"/><stop offset="55%" stop-color="#e5ddb0"/><stop offset="100%" stop-color="#d5cea3"/></linearGradient>
        <radialGradient id="klSun" cx="76%" cy="28%" r="40%"><stop offset="0%" stop-color="#f472b6" stop-opacity="0.28"/><stop offset="100%" stop-color="#f2ecbc" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#klBg)"/><rect width="1600" height="900" fill="url(#klSun)"/>
      <circle cx="1210" cy="230" r="95" fill="#e82424" opacity="0.14"/>
      <path d="M0 700C320 580 650 610 960 700C1220 770 1420 620 1600 670V900H0Z" fill="#c7d7e0" opacity="0.65"/>
      <path d="M0 780C420 670 840 740 1600 710V900H0Z" fill="#9fb5c9" opacity="0.55"/>
    </svg>`),
    previewCss: 'linear-gradient(135deg, #f2ecbc 0%, #c7d7e0 100%)'
  },
  {
    id: 'obsidian-nebula',
    name: 'Obsidian Tinh Vân',
    nameEn: 'Obsidian Nebula',
    embeddedDataUri: wpSvgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="obBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#07080d"/><stop offset="100%" stop-color="#111622"/></linearGradient>
        <radialGradient id="obGlow" cx="65%" cy="40%" r="55%"><stop offset="0%" stop-color="#38bdf8" stop-opacity="0.22"/><stop offset="100%" stop-color="#07080d" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#obBg)"/><rect width="1600" height="900" fill="url(#obGlow)"/>
    </svg>`),
    previewCss: 'linear-gradient(135deg, #07080d 0%, #172554 100%)'
  }
];

export function resolveWallpaperUrl(config, customMedia = {}) {
  if (!config || !config.enabled) return '';
  if (config.wallpaperId === 'custom') {
    if (config.isLight && customMedia.wallpaperLight) {
      return customMedia.wallpaperLight;
    }
    return customMedia.wallpaper || '';
  }
  if (!config.wallpaperId || config.wallpaperId === 'none') {
    return '';
  }
  const wp = WALLPAPERS.find((w) => w.id === config.wallpaperId);
  return wp ? wp.embeddedDataUri || '' : '';
}
