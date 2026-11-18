/**
 * Curated Accent Swatches, Weather Atmospheres & 8 Full Theme Bundles.
 */

export const ACCENT_COLORS = [
  { id: 'gold', name: 'Kim Lôi', hex: '#f5c451' },
  { id: 'sky', name: 'Tinh Tú', hex: '#60a5fa' },
  { id: 'sakura', name: 'Anh Đào', hex: '#f472b6' },
  { id: 'jade', name: 'Ngọc Bích', hex: '#34d399' },
  { id: 'violet', name: 'Ánh Trăng', hex: '#c084fc' },
  { id: 'amber', name: 'Hồ Ly', hex: '#fb923c' },
  { id: 'aqua', name: 'Kanagawa', hex: '#7fb4ca' },
  { id: 'lotus', name: 'Lotus Đỏ', hex: '#d7474b' }
];

export const ATMOSPHERE_PRESETS = [
  { id: 'none', name: 'Tắt hiệu ứng', nameEn: 'Off' },
  { id: 'thunder-rain', name: 'Mưa & Tia Sét', nameEn: 'Thunder & Rain' },
  { id: 'rain', name: 'Mưa Đêm', nameEn: 'Night Rain' },
  { id: 'stardust', name: 'Bụi Sao Vũ Trụ', nameEn: 'Cosmic Stardust' },
  { id: 'sakura', name: 'Cánh Hoa Anh Đào', nameEn: 'Sakura Petals' },
  { id: 'fireflies', name: 'Đom Đóm Ngọc', nameEn: 'Jade Fireflies' },
  { id: 'snow', name: 'Tuyết Rơi Nhẹ', nameEn: 'Soft Snow' }
];

export const THEME_BUNDLES = [
  {
    id: 'thunder-samurai-pack',
    name: 'Lôi Kiếm Vũ Đêm',
    nameEn: 'Thunder Samurai',
    subtitle: 'Nền Lôi Kiếm + Mưa Sét + Pet Lôi Kiếm',
    subtitleEn: 'Thunder backdrop + Lightning rain + Katana pet',
    badge: 'Mặc định',
    patch: {
      isLight: false,
      wallpaperId: 'thunder-samurai',
      dimming: 26,
      wpBlur: 0,
      glassBlur: 4,
      surfaces: { sidebarOpacity: 52, headerOpacity: 44, aiCardOpacity: 64, codeOpacity: 62 },
      accentColor: '#f5c451',
      secondaryColor: '#60a5fa',
      overlayRgb: '11, 16, 27',
      atmosphereId: 'thunder-rain',
      atmosphereIntensity: 65,
      bubbleId: 'loi-kiem',
      inputId: 'loi-anh-kim',
      pet: { enabled: true, id: 'loi-kiem', size: 88, mode: 'float', opacity: 96, pos: { xPct: 22, yPct: 14 }, showSpeechOnClick: true },
      stickers: {
        enabled: true,
        items: [
          { id: 'bua-loi-an', slot: 'input-top-right', size: 52, glow: true, opacity: 96 },
          { id: 'non-la-lu-khach', slot: 'sidebar-bottom-right', size: 46, glow: true, opacity: 94 }
        ]
      }
    }
  },
  {
    id: 'cosmic-violin-pack',
    name: 'Thiên Hà Tinh Tú',
    nameEn: 'Cosmic Starlight',
    subtitle: 'Nền Vũ Trụ + Bụi Sao + Cá Koi Tinh Tú',
    subtitleEn: 'Cosmic starlight + Stardust + Cosmic Koi pet',
    badge: '60fps Kính',
    patch: {
      isLight: false,
      wallpaperId: 'cosmic-violin',
      dimming: 22,
      wpBlur: 0,
      glassBlur: 3,
      surfaces: { sidebarOpacity: 46, headerOpacity: 38, aiCardOpacity: 58, codeOpacity: 56 },
      accentColor: '#60a5fa',
      secondaryColor: '#38bdf8',
      overlayRgb: '7, 13, 28',
      atmosphereId: 'stardust',
      atmosphereIntensity: 70,
      bubbleId: 'thien-ha',
      inputId: 'thien-ha-kinh',
      pet: { enabled: true, id: 'ca-koi', size: 84, mode: 'float', opacity: 96, pos: { xPct: 24, yPct: 16 }, showSpeechOnClick: true },
      stickers: {
        enabled: true,
        items: [{ id: 'trang-sao', slot: 'input-top-right', size: 54, glow: true, opacity: 95 }]
      }
    }
  },
  {
    id: 'sakura-shrine-pack',
    name: 'Đền Thờ Anh Đào',
    nameEn: 'Sakura Shrine',
    subtitle: 'Đêm Anh Đào + Cánh Hoa Rơi + Hồ Ly Chibi',
    subtitleEn: 'Sakura shrine + Falling petals + Chibi Fox',
    badge: 'Cổ phong',
    patch: {
      isLight: false,
      wallpaperId: 'sakura-shrine-night',
      dimming: 34,
      wpBlur: 0,
      glassBlur: 4,
      surfaces: { sidebarOpacity: 54, headerOpacity: 46, aiCardOpacity: 66, codeOpacity: 62 },
      accentColor: '#f472b6',
      secondaryColor: '#fb923c',
      overlayRgb: '20, 10, 26',
      atmosphereId: 'sakura',
      atmosphereIntensity: 68,
      bubbleId: 'hoa-anh-dao',
      inputId: 'anh-dao-dem',
      pet: { enabled: true, id: 'ho-ly-chibi', size: 86, mode: 'roam', opacity: 96, pos: { xPct: 20, yPct: 20 }, showSpeechOnClick: true },
      stickers: {
        enabled: true,
        items: [
          { id: 'hoa-anh-dao', slot: 'input-top-right', size: 50, glow: true, opacity: 95 },
          { id: 'den-long', slot: 'input-top-left', size: 46, glow: true, opacity: 95 }
        ]
      }
    }
  },
  {
    id: 'jade-sanctuary-pack',
    name: 'Rồng Ngọc Tiên Cảnh',
    nameEn: 'Jade Sanctuary',
    subtitle: 'Thung Lũng Ngọc + Đom Đóm + Rồng Ngọc',
    subtitleEn: 'Emerald valley + Fireflies + Jade Dragon',
    badge: 'Tiên hiệp',
    patch: {
      isLight: false,
      wallpaperId: 'jade-sanctuary',
      dimming: 32,
      wpBlur: 0,
      glassBlur: 4,
      surfaces: { sidebarOpacity: 50, headerOpacity: 42, aiCardOpacity: 64, codeOpacity: 60 },
      accentColor: '#34d399',
      secondaryColor: '#6ee7b7',
      overlayRgb: '4, 24, 20',
      atmosphereId: 'fireflies',
      atmosphereIntensity: 72,
      bubbleId: 'rong-ngoc',
      inputId: 'ngoc-bich',
      pet: { enabled: true, id: 'rong-ngoc', size: 88, mode: 'float', opacity: 98, pos: { xPct: 22, yPct: 15 }, showSpeechOnClick: true },
      stickers: {
        enabled: true,
        items: [{ id: 'rong-ngoc-mini', slot: 'input-top-right', size: 50, glow: true, opacity: 96 }]
      }
    }
  },
  {
    id: 'arcane-moonlight-pack',
    name: 'Phù Thủy Ánh Trăng',
    nameEn: 'Moonlight Arcane',
    subtitle: 'Ánh Trăng Tím + Bụi Sao + Phù Thủy',
    subtitleEn: 'Twilight arcane + Stardust + Witch pet',
    badge: 'Huyền bí',
    patch: {
      isLight: false,
      wallpaperId: 'arcane-moonlight',
      dimming: 38,
      wpBlur: 0,
      glassBlur: 5,
      surfaces: { sidebarOpacity: 56, headerOpacity: 48, aiCardOpacity: 68, codeOpacity: 64 },
      accentColor: '#c084fc',
      secondaryColor: '#e879f9',
      overlayRgb: '16, 10, 32',
      atmosphereId: 'stardust',
      atmosphereIntensity: 62,
      bubbleId: 'phu-thuy-anh-trang',
      inputId: 'huyen-thuat-tim',
      pet: { enabled: true, id: 'phu-thuy-anh-trang', size: 90, mode: 'float', opacity: 96, pos: { xPct: 24, yPct: 16 }, showSpeechOnClick: true },
      stickers: {
        enabled: true,
        items: [
          { id: 'lo-ma-thuat', slot: 'input-top-right', size: 50, glow: true, opacity: 95 },
          { id: 'meo-huyen-sigil', slot: 'sidebar-bottom-right', size: 46, glow: true, opacity: 94 }
        ]
      }
    }
  },
  {
    id: 'kanagawa-wave-pack',
    name: 'Kanagawa Wave',
    nameEn: 'Kanagawa Wave',
    subtitle: 'Sóng Lừng Kanagawa + Mưa Đêm + Ấn Sóng',
    subtitleEn: 'Kanagawa wave + Night rain + Wave crest',
    badge: 'Cổ điển',
    patch: {
      isLight: false,
      wallpaperId: 'kanagawa-wave',
      dimming: 28,
      wpBlur: 0,
      glassBlur: 3,
      surfaces: { sidebarOpacity: 58, headerOpacity: 48, aiCardOpacity: 68, codeOpacity: 64 },
      accentColor: '#7fb4ca',
      secondaryColor: '#e6c384',
      overlayRgb: '22, 22, 29',
      atmosphereId: 'rain',
      atmosphereIntensity: 48,
      bubbleId: 'kanagawa-wave',
      inputId: 'kanagawa-aqua-gold',
      pet: { enabled: true, id: 'meo-than', size: 82, mode: 'float', opacity: 95, pos: { xPct: 22, yPct: 16 }, showSpeechOnClick: true },
      stickers: {
        enabled: true,
        items: [{ id: 'ca-chep-vang', slot: 'input-top-right', size: 48, glow: true, opacity: 95 }]
      }
    }
  },
  {
    id: 'kanagawa-lotus-light',
    name: 'Kanagawa Lotus (Sáng)',
    nameEn: 'Kanagawa Lotus (Light)',
    subtitle: 'Chế độ Sáng Kính Mờ + Hoa Anh Đào + Đèn Lồng',
    subtitleEn: 'Light glass mode + Sakura breeze + Lantern',
    badge: 'Chế độ Sáng',
    patch: {
      isLight: true,
      wallpaperId: 'kanagawa-lotus',
      dimming: 12,
      wpBlur: 0,
      glassBlur: 4,
      surfaces: { sidebarOpacity: 72, headerOpacity: 68, aiCardOpacity: 78, codeOpacity: 74 },
      accentColor: '#d7474b',
      secondaryColor: '#4d699b',
      overlayRgb: '242, 236, 188',
      atmosphereId: 'sakura',
      atmosphereIntensity: 42,
      bubbleId: 'kanagawa-lotus',
      inputId: 'frosted-lotus-light',
      pet: { enabled: true, id: 'hoa-anh-dao', size: 78, mode: 'float', opacity: 94, pos: { xPct: 22, yPct: 14 }, showSpeechOnClick: true },
      stickers: {
        enabled: true,
        items: [{ id: 'quat-co-phong', slot: 'input-top-right', size: 46, glow: false, opacity: 94 }]
      }
    }
  },
  {
    id: 'minimal-obsidian',
    name: 'Minimal Obsidian',
    nameEn: 'Minimal Obsidian',
    subtitle: 'Không ảnh nền + Tuyết nhẹ + Tối giản 120fps',
    subtitleEn: 'Pure gradient + Soft snow + Ultra clean',
    badge: 'Tối giản',
    patch: {
      isLight: false,
      wallpaperId: 'none',
      dimming: 0,
      wpBlur: 0,
      glassBlur: 0,
      surfaces: { sidebarOpacity: 78, headerOpacity: 72, aiCardOpacity: 76, codeOpacity: 72 },
      accentColor: '#60a5fa',
      secondaryColor: '#34d399',
      overlayRgb: '9, 12, 20',
      atmosphereId: 'snow',
      atmosphereIntensity: 35,
      bubbleId: 'cyber-neon',
      inputId: 'thien-ha-kinh',
      pet: { enabled: false, id: 'none', size: 80, mode: 'float', opacity: 95, pos: { xPct: 22, yPct: 14 }, showSpeechOnClick: true },
      stickers: { enabled: false, items: [] }
    }
  },
  {
    id: 'one-piece-sunny-sunset',
    name: 'Hoàng Hôn Thousand Sunny',
    nameEn: 'Thousand Sunny Sunset',
    subtitle: 'Đại Dương Hoàng Hôn + Bụi Sao + Tàu Sunny',
    subtitleEn: 'Grand Line sunset + Stardust + Thousand Sunny',
    badge: 'One Piece',
    patch: {
      isLight: false,
      wallpaperId: 'one-piece-sunny-sunset',
      dimming: 24,
      wpBlur: 0,
      glassBlur: 4,
      surfaces: { sidebarOpacity: 50, headerOpacity: 42, aiCardOpacity: 62, codeOpacity: 60 },
      accentColor: '#d7474b',
      secondaryColor: '#f5c451',
      overlayRgb: '14, 21, 36',
      atmosphereId: 'stardust',
      atmosphereIntensity: 68,
      bubbleId: 'mu-rom-hai-tac',
      inputId: 'dai-duong-sunny',
      pet: { enabled: true, id: 'thousand-sunny', size: 88, mode: 'float', opacity: 96, pos: { xPct: 22, yPct: 14 }, showSpeechOnClick: true },
      stickers: {
        enabled: true,
        items: [
          { id: 'mu-rom', slot: 'input-top-right', size: 52, glow: true, opacity: 96 },
          { id: 'jolly-roger', slot: 'sidebar-bottom-right', size: 46, glow: true, opacity: 94 }
        ]
      }
    }
  },
  {
    id: 'one-piece-grand-line-bounty',
    name: 'Hải Đồ & Truy Nã (Sáng)',
    nameEn: 'Grand Line Bounty (Light)',
    subtitle: 'Hải Đồ Giấy Cổ + Hoa Anh Đào + Chopper',
    subtitleEn: 'Grand Line chart + Drum sakura + Chopper',
    badge: 'One Piece · Sáng',
    patch: {
      isLight: true,
      wallpaperId: 'one-piece-grand-line-map',
      dimming: 10,
      wpBlur: 0,
      glassBlur: 4,
      surfaces: { sidebarOpacity: 74, headerOpacity: 70, aiCardOpacity: 80, codeOpacity: 76 },
      accentColor: '#d7474b',
      secondaryColor: '#4d699b',
      overlayRgb: '244, 234, 206',
      atmosphereId: 'sakura',
      atmosphereIntensity: 45,
      bubbleId: 'lenh-truy-na',
      inputId: 'hai-do-co',
      pet: { enabled: true, id: 'chopper-chibi', size: 86, mode: 'float', opacity: 96, pos: { xPct: 22, yPct: 15 }, showSpeechOnClick: true },
      stickers: {
        enabled: true,
        items: [
          { id: 'log-pose', slot: 'input-top-right', size: 50, glow: false, opacity: 95 },
          { id: 'mu-rom', slot: 'input-top-left', size: 46, glow: false, opacity: 94 }
        ]
      }
    }
  }
];
