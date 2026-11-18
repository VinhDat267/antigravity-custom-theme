/**
 * 8+ Styled Chat Input Composer Presets (+ 'none' off option).
 */

export const INPUT_PRESETS = [
  {
    id: 'none',
    name: 'Mặc định (Tắt)',
    nameEn: 'Default (Off)',
    bg: 'transparent',
    border: 'none',
    focusBorder: 'transparent',
    shadow: 'none',
    radius: '12px'
  },
  {
    id: 'loi-anh-kim',
    name: 'Lôi Ánh Kim',
    nameEn: 'Thunder Gold',
    bg: 'linear-gradient(145deg, rgba(19, 23, 34, 0.92), rgba(28, 22, 14, 0.92))',
    border: '1.5px solid rgba(245, 196, 81, 0.48)',
    focusBorder: '#fde047',
    shadow: '0 6px 24px rgba(0, 0, 0, 0.48), 0 0 16px rgba(245, 196, 81, 0.2)',
    radius: '16px'
  },
  {
    id: 'thien-ha-kinh',
    name: 'Thiên Hà Trong Suốt',
    nameEn: 'Cosmic Crystal',
    bg: 'linear-gradient(145deg, rgba(10, 18, 36, 0.78), rgba(15, 23, 42, 0.84))',
    border: '1.5px solid rgba(96, 165, 250, 0.45)',
    focusBorder: '#38bdf8',
    shadow: '0 6px 24px rgba(0, 0, 0, 0.44), 0 0 16px rgba(56, 189, 248, 0.2)',
    radius: '16px'
  },
  {
    id: 'anh-dao-dem',
    name: 'Anh Đào Đêm',
    nameEn: 'Midnight Sakura',
    bg: 'linear-gradient(145deg, rgba(38, 12, 32, 0.88), rgba(22, 10, 24, 0.92))',
    border: '1.5px solid rgba(244, 114, 182, 0.48)',
    focusBorder: '#f472b6',
    shadow: '0 6px 24px rgba(0, 0, 0, 0.45), 0 0 16px rgba(244, 114, 182, 0.2)',
    radius: '16px'
  },
  {
    id: 'ngoc-bich',
    name: 'Ngọc Bích Tiên Cảnh',
    nameEn: 'Jade Sanctuary',
    bg: 'linear-gradient(145deg, rgba(5, 38, 31, 0.88), rgba(4, 24, 21, 0.92))',
    border: '1.5px solid rgba(52, 211, 153, 0.46)',
    focusBorder: '#34d399',
    shadow: '0 6px 24px rgba(0, 0, 0, 0.44), 0 0 16px rgba(52, 211, 153, 0.2)',
    radius: '16px'
  },
  {
    id: 'huyen-thuat-tim',
    name: 'Huyền Thuật Tím',
    nameEn: 'Arcane Violet',
    bg: 'linear-gradient(145deg, rgba(28, 18, 56, 0.9), rgba(16, 12, 34, 0.94))',
    border: '1.5px solid rgba(192, 132, 252, 0.48)',
    focusBorder: '#c084fc',
    shadow: '0 6px 24px rgba(0, 0, 0, 0.46), 0 0 16px rgba(192, 132, 252, 0.22)',
    radius: '16px'
  },
  {
    id: 'ho-ly-amber',
    name: 'Hổ Phách Viền Kép',
    nameEn: 'Double Amber',
    bg: 'linear-gradient(145deg, rgba(44, 24, 14, 0.9), rgba(22, 14, 11, 0.94))',
    border: '1.5px solid rgba(251, 146, 60, 0.5)',
    focusBorder: '#fb923c',
    shadow: '0 6px 24px rgba(0, 0, 0, 0.46), 0 0 16px rgba(251, 146, 60, 0.22)',
    radius: '16px'
  },
  {
    id: 'kanagawa-aqua-gold',
    name: 'Kanagawa Xanh Vàng',
    nameEn: 'Kanagawa Aqua Gold',
    bg: 'linear-gradient(145deg, rgba(22, 24, 34, 0.9), rgba(29, 43, 58, 0.9))',
    border: '1.5px solid rgba(127, 180, 202, 0.52)',
    focusBorder: '#e6c384',
    shadow: '0 6px 24px rgba(0, 0, 0, 0.46), 0 0 14px rgba(127, 180, 202, 0.2)',
    radius: '14px'
  },
  {
    id: 'frosted-lotus-light',
    name: 'Kính Sáng Lotus',
    nameEn: 'Frosted Lotus Light',
    isLight: true,
    bg: 'linear-gradient(145deg, rgba(255, 252, 240, 0.9), rgba(242, 236, 188, 0.88))',
    border: '1.5px solid rgba(77, 105, 155, 0.35)',
    focusBorder: '#4d699b',
    shadow: '0 6px 20px rgba(15, 23, 42, 0.12)',
    radius: '14px'
  },
  {
    id: 'dai-duong-sunny',
    name: 'Boong Tàu Hoàng Hôn',
    nameEn: 'Sunny Sunset Deck',
    bg: 'linear-gradient(145deg, rgba(14, 21, 36, 0.9), rgba(24, 30, 44, 0.93))',
    border: '1.5px solid rgba(245, 196, 81, 0.5)',
    focusBorder: '#d7474b',
    shadow: '0 6px 24px rgba(0, 0, 0, 0.46), 0 0 16px rgba(245, 196, 81, 0.2)',
    radius: '16px'
  },
  {
    id: 'hai-do-co',
    name: 'Hải Đồ Giấy Cổ (Sáng)',
    nameEn: 'Grand Line Chart (Light)',
    isLight: true,
    bg: 'linear-gradient(145deg, rgba(252, 246, 228, 0.94), rgba(240, 227, 194, 0.92))',
    border: '1.5px solid rgba(146, 64, 14, 0.36)',
    focusBorder: '#d7474b',
    shadow: '0 6px 20px rgba(69, 39, 19, 0.14)',
    radius: '14px'
  },
  {
    id: 'nika-liberation',
    name: 'Trống Giải Phóng Nika',
    nameEn: 'Nika Liberation Drums',
    bg: 'linear-gradient(145deg, rgba(20, 18, 38, 0.92), rgba(38, 28, 62, 0.9))',
    border: '1.5px solid rgba(233, 213, 255, 0.56)',
    focusBorder: '#f5c451',
    shadow: '0 6px 24px rgba(0, 0, 0, 0.48), 0 0 18px rgba(192, 132, 252, 0.24)',
    radius: '16px'
  }
];
