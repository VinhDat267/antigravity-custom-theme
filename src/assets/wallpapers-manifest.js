/**
 * Built-in high-DPI procedural SVG wallpapers + custom upload/URL resolver.
 */

function wpSvgUri(svgMarkup) {
  const compact = String(svgMarkup || '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(compact)}`;
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
  },
  {
    id: 'one-piece-sunny-sunset',
    name: 'Hoàng Hôn Thousand Sunny',
    nameEn: 'Thousand Sunny Sunset',
    embeddedDataUri: wpSvgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="opSsSky" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0%" stop-color="#081224"/><stop offset="52%" stop-color="#1b2c4e"/><stop offset="100%" stop-color="#6b2737"/></linearGradient>
        <radialGradient id="opSsSun" cx="72.5%" cy="40%" r="46%"><stop offset="0%" stop-color="#fef08a" stop-opacity="0.62"/><stop offset="42%" stop-color="#f97316" stop-opacity="0.34"/><stop offset="100%" stop-color="#081224" stop-opacity="0"/></radialGradient>
        <linearGradient id="opSsSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#132542"/><stop offset="100%" stop-color="#070d1a"/></linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#opSsSky)"/><rect width="1600" height="900" fill="url(#opSsSun)"/>
      <circle cx="1160" cy="360" r="126" fill="#fef08a" opacity="0.32"/><circle cx="1160" cy="360" r="84" fill="#fbbf24" opacity="0.46"/><circle cx="1160" cy="360" r="84" fill="none" stroke="#fef9c3" stroke-width="2.5" opacity="0.48"/>
      <path d="M0 600Q380 575 760 605T1600 590V900H0Z" fill="url(#opSsSea)"/>
      <path d="M970 612H1350M1020 638H1300M1060 664H1260M1105 688H1215" stroke="#fbbf24" stroke-width="4.5" stroke-linecap="round" opacity="0.42"/>
      <path d="M0 695Q410 645 830 700T1600 665V900H0Z" fill="#091121" opacity="0.92"/>
      <path d="M1066 546L1246 546L1220 594H1092Z" fill="#070b14" stroke="#f59e0b" stroke-width="1.8" stroke-opacity="0.55"/>
      <circle cx="1246" cy="560" r="11" fill="#f59e0b" opacity="0.58"/>
      <path d="M1152 372V546M1116 420V546M1188 430V546" stroke="#334155" stroke-width="5.5" stroke-linecap="round"/>
      <path d="M1152 372H1172L1168 386H1152Z" fill="#0f172a" stroke="#f8fafc" stroke-width="1.2" stroke-opacity="0.55"/>
      <path d="M1112 430Q1152 406 1192 430L1186 512Q1152 496 1118 512Z" fill="#fffbeb" opacity="0.44" stroke="#fde68a" stroke-width="1.4" stroke-opacity="0.4"/>
      <path d="M1082 466Q1103 448 1122 466L1118 526Q1103 514 1086 526Z" fill="#fda4af" opacity="0.38"/>
      <path d="M1184 470Q1204 452 1224 470L1218 526Q1204 514 1188 526Z" fill="#fde047" opacity="0.36"/>
      <circle cx="280" cy="170" r="2.5" fill="#fef3c7" opacity="0.72"/><circle cx="520" cy="110" r="2" fill="#bae6fd" opacity="0.68"/><circle cx="840" cy="150" r="2.6" fill="#fef08a" opacity="0.78"/>
    </svg>`),
    previewCss: 'linear-gradient(135deg, #0b162c 0%, #5b2333 65%, #d97706 100%)'
  },
  {
    id: 'one-piece-grand-line-map',
    name: 'Hải Đồ Grand Line (Sáng)',
    nameEn: 'Grand Line Chart (Light)',
    embeddedDataUri: wpSvgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="opGlBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f4eacd"/><stop offset="55%" stop-color="#ede0bc"/><stop offset="100%" stop-color="#e3d0a2"/></linearGradient>
        <radialGradient id="opGlGlow" cx="72%" cy="44%" r="48%"><stop offset="0%" stop-color="#fffbeb" stop-opacity="0.55"/><stop offset="100%" stop-color="#e3d0a2" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#opGlBg)"/><rect width="1600" height="900" fill="url(#opGlGlow)"/>
      <g stroke="#8c6d46" stroke-width="1.4" opacity="0.18" fill="none">
        <path d="M0 240H1600M0 450H1600M0 660H1600M420 0V900M820 0V900M1160 0V900"/>
        <circle cx="1160" cy="400" r="210"/><circle cx="1160" cy="400" r="145"/>
      </g>
      <g transform="translate(1160 400)" opacity="0.22">
        <path d="M0 -130L22 -22L130 0L22 22L0 130L-22 22L-130 0L-22 -22Z" fill="#1e3a8a"/>
        <path d="M0 -72L14 -14L72 0L14 14L0 72L-14 14L-72 0L-14 -14Z" fill="#b45309"/>
      </g>
      <path d="M360 720C540 580 710 610 880 480C1020 370 1190 360 1370 230" stroke="#7c2d12" stroke-width="4" stroke-dasharray="12 12" fill="none" opacity="0.25" stroke-linecap="round"/>
      <path d="M1346 206L1394 254M1394 206L1346 254" stroke="#b91c1c" stroke-width="7" stroke-linecap="round" opacity="0.32"/>
      <path d="M0 780Q460 710 920 790T1600 740V900H0Z" fill="#c7b283" opacity="0.35"/>
    </svg>`),
    previewCss: 'linear-gradient(135deg, #f4eacd 0%, #e3d0a2 70%, #d7474b 100%)'
  },
  {
    id: 'one-piece-nika-moon',
    name: 'Trăng Giải Phóng Nika (Gear 5)',
    nameEn: 'Nika Full Moon Liberation',
    embeddedDataUri: wpSvgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="opNkSky" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0%" stop-color="#070916"/><stop offset="52%" stop-color="#181236"/><stop offset="100%" stop-color="#2c194d"/></linearGradient>
        <radialGradient id="opNkMoonGlow" cx="73%" cy="35%" r="44%"><stop offset="0%" stop-color="#f8fafc" stop-opacity="0.52"/><stop offset="38%" stop-color="#c084fc" stop-opacity="0.26"/><stop offset="100%" stop-color="#070916" stop-opacity="0"/></radialGradient>
        <linearGradient id="opNkMoonCore" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/><stop offset="100%" stop-color="#e9d5ff" stop-opacity="0.72"/></linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#opNkSky)"/><rect width="1600" height="900" fill="url(#opNkMoonGlow)"/>
      <circle cx="1165" cy="315" r="142" fill="url(#opNkMoonCore)" opacity="0.45"/><circle cx="1165" cy="315" r="112" fill="#f8fafc" opacity="0.68"/>
      <path d="M910 385C845 340 855 255 930 245C965 185 1045 190 1075 235" stroke="#e9d5ff" stroke-width="18" stroke-linecap="round" fill="none" opacity="0.34"/>
      <path d="M1260 220C1335 195 1410 245 1385 320C1435 355 1415 430 1345 435" stroke="#f8fafc" stroke-width="16" stroke-linecap="round" fill="none" opacity="0.32"/>
      <path d="M220 210L268 156L248 228L298 188" stroke="#f5c451" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.48"/>
      <path d="M1370 140L1326 196L1354 214L1308 268" stroke="#e9d5ff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.52"/>
      <path d="M0 675Q320 620 690 680T1600 645V900H0Z" fill="#0d0b1e" opacity="0.92"/>
      <path d="M0 735C220 680 410 730 620 695C860 660 1090 735 1360 685C1460 665 1540 690 1600 710V900H0Z" fill="#f8fafc" opacity="0.1"/>
      <circle cx="340" cy="140" r="2.6" fill="#fef08a" opacity="0.72"/><circle cx="620" cy="105" r="2.2" fill="#e9d5ff" opacity="0.7"/><circle cx="880" cy="165" r="2.8" fill="#ffffff" opacity="0.75"/>
    </svg>`),
    previewCss: 'linear-gradient(135deg, #0b0e24 0%, #3b2266 58%, #e9d5ff 100%)'
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
