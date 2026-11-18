# Design Doc: One Piece — Grand Line Dual Pack (`Dark & Light`)

> [!NOTE]
> Tài liệu thiết kế bổ sung bộ chủ đề **One Piece (Grand Line Dual Pack)** theo **Phương án 1 (Thuần Vector SVG)** đã được người dùng lựa chọn, tuân thủ tuyệt đối các bất biến kiến trúc `Zero-Patch`, `Zero Live Blur`, `120Hz` Multi-Split và tương thích Split-Browser của dự án.

---

## 1. Mục đích & Lý do (Intent & Why)

Mở rộng thư viện preset sẵn có của **Antigravity 2.x Custom Theme Suite** bằng một bộ chủ đề lấy cảm hứng từ **One Piece**, mang lại lựa chọn đầy đủ cho cả **Dark Mode** (*Hoàng Hôn Thousand Sunny*) và **Light Mode** (*Lệnh Truy Nã & Hải Đồ Cổ — Grand Line Bounty*, giúp người dùng thích nền sáng có thêm lựa chọn ngoài *Kanagawa Lotus*). Toàn bộ tài nguyên đi theo dạng vector SVG nội tuyến gọn nhẹ để giữ kích thước bundle nhỏ, hiển thị sắc nét mọi DPI và bảo toàn hiệu năng `120Hz`.

---

## 2. Mục tiêu, Ngoài phạm vi & Điều cấm kỵ

### Mục tiêu (Goals)
- **2 Theme Bundles 1-click (`src/presets/themes.js`)**:
  - `one-piece-sunny-sunset` (Dark): Tông đại dương hoàng hôn (`#d7474b` đỏ hải tặc + `#f5c451` vàng mũ rơm, `overlayRgb: 14, 21, 36`).
  - `one-piece-grand-line-bounty` (Light): Tông giấy da hải đồ cổ (`isLight: true`, `#d7474b` đỏ ấn triện + `#4d699b` xanh hải quân, `overlayRgb: 244, 234, 206`).
- **2 Hình nền SVG procedural (`src/assets/wallpapers-manifest.js`)**: `one-piece-sunny-sunset` và `one-piece-grand-line-map` hỗ trợ `wpSvgUri`, `prebaked-glass.js`, và `stripDeletedWallpapers`.
- **2 Thú cưng SVG tương tác + lời thoại song ngữ (`src/assets/mascots.js`, `src/fx/pet-stage.js`)**: `thousand-sunny` (Tàu Thousand Sunny) và `chopper-chibi` (Chopper Chibi) kèm lời thoại `VI`/`EN` trong `FX_PET_QUIPS`.
- **2 Kiểu bong bóng chat (`src/presets/bubbles.js`) & 2 Khung nhập Composer (`src/presets/inputs.js`)**: `mu-rom-hai-tac` + `dai-duong-sunny` (Dark), `lenh-truy-na` + `hai-do-co` (Light).
- **3 Sticker SVG kéo thả (`src/assets/stickers.js`)**: `mu-rom` (Mũ Rơm), `jolly-roger` (Cờ đầu lâu Mũ Rơm), `log-pose` (La bàn Log Pose).
- **Kiểm thử đầy đủ**: Bổ sung unit & integration test trong `test/presets.test.mjs`, `test/surface-engine.test.mjs`, `test/fx-companions.test.mjs` và xác minh build + live CDP.

### Ngoài phạm vi (Non-Goals)
- Không thêm chế độ thời tiết `<canvas>` mới (`ATMOSPHERE_PRESETS` giữ nguyên 7 mục để tái sử dụng `stardust` cho đêm đại dương và `sakura` cho hoa anh đào đảo Drum).
- Không nhúng ảnh raster `.webp`/`.png` trong `assets/wallpapers/` ở đợt này.
- Không thay đổi cấu trúc 5 tab hay giao diện điều khiển của `ThemeStudio` (Theme Studio tự động render các phần tử mới từ catalog).

### Điều cấm kỵ (Anti-Goals)
- Không đặt `@keyframes` liên tục trực tiếp lên thẻ SVG con nếu chưa khóa sau `:hover` / `.is-reacting` (bảo toàn `LayoutCount: 0` ở `120Hz`).
- Không dùng trùng `id` trong `<defs>` (`<linearGradient>` / `<radialGradient>`) giữa bất kỳ SVG nào vì Theme Studio, bong bóng chat, pet và sticker cùng tồn tại đồng thời trong DOM.
- Không bật đồng thời `scrollCaps: true` và `cornerOrnament` khác rỗng trên cùng một `BUBBLE_PRESETS` vì cả hai đều chiếm pseudo-element `.agy-ct-bubble-styled::after` trong `src/core/surface-engine.js`.
- Không chèn `backdrop-filter: blur(...)`, `filter: drop-shadow(...)` hoặc đường dẫn máy cá nhân vào preset/test.

---

## 3. Các phương án đã cân nhắc (Approaches)

| Phương án | Mô tả ngắn | Đánh đổi | Trạng thái |
| :--- | :--- | :--- | :--- |
| **1. Bộ đôi Sáng & Tối Thuần Vector SVG (`Grand Line Dual Pack`)** | Toàn bộ 2 hình nền, 2 pet, 3 sticker, 2 bong bóng, 2 composer và 2 bundle dùng SVG nội tuyến gọn nhẹ. | Nét vẽ phẳng cách điệu thay vì tranh tả thực, nhưng bundle chỉ tăng nhẹ (~8–15 KB), sắc nét vô hạn, bake kính L-glass tức thì và dễ nâng cấp sang `.webp` sau. | **Đã chọn** |
| **2. Tranh nền AI Raster (`assets/wallpapers/*.webp`) + Pet/Sticker SVG** | Sinh ảnh 16:9 bằng model tạo ảnh rồi nhúng base64 vào bundle. | Hình nền giàu chi tiết hội họa, nhưng kích thước `dist/antigravity-theme.js` tăng thêm vài trăm KB và đòi hỏi cân chỉnh độ tương phản chữ sidebar thủ công. | Đã loại |
| **3. Gói đơn gọn nhẹ Dark-only (`Straw Hat Pack`)** | Chỉ thêm 1 bundle tối, 1 nền, 1 pet, 1 bong bóng, 2 sticker. | Nhanh và gọn nhất, nhưng thiếu biến thể Light Mode và phải bỏ bớt 1 trong 2 pet biểu tượng. | Đã loại |

---

## 4. Đặc tả Thành phần & Hợp đồng Dữ liệu

### 4.1. Hình nền (`src/assets/wallpapers-manifest.js`)
Mỗi mục đặt thuộc tính `id` đứng trước `embeddedDataUri: wpSvgUri(\`...\`)` (không chứa dấu backtick bên trong SVG) để tương thích regex của `stripDeletedWallpapers` và `collectDiskWallpapers` trong `scripts/build.mjs`:

1. **`one-piece-sunny-sunset`** — *"Hoàng Hôn Thousand Sunny"* / *"Thousand Sunny Sunset"*
   - Bầu trời chạng vạng xanh thẫm (`#081224` → `#18294a` → `#5b2333`), mặt trời hoàng hôn vàng cam lớn ở góc phải-giữa (`cx="1160" cy="360"` để tránh bị che dưới sidebar trái), bóng dáng buồm & thân tàu đại dương trên mặt biển gợn sóng, gradient IDs tiền tố `opSs*`.
2. **`one-piece-grand-line-map`** — *"Hải Đồ Grand Line (Sáng)"* / *"Grand Line Chart (Light)"*
   - Nền giấy da ấm (`#f4eacd` → `#e8d8b0`), đường kinh tuyến/vĩ tuyến hải đồ mờ, hoa gió la bàn lớn ở phía phải (`cx="1160" cy="400"`), đường nét hành trình chấm đứt và dấu `X` kho báu đỏ thẫm nhẹ nhàng để bảo toàn độ tương phản chữ tối (`#0f172a`) trong Light Mode, gradient IDs tiền tố `opGl*`.

### 4.2. Thú cưng & Lời thoại (`src/assets/mascots.js`, `src/fx/pet-stage.js`)
Mọi template sử dụng `viewBox="0 0 96 96"`, class ngoài `.agy-ct-svg-art` + (`agy-ct-anim-bob` cho `bubble`, `agy-ct-anim-float` cho `pet`), chỉ kích hoạt animation con bằng class có sẵn `.agy-ct-anim-blink` / `.agy-ct-anim-wag` / `.agy-ct-anim-twinkle` (đã gate sau `#agy-ct-pet-stage:is(:hover, .is-reacting)`):

1. **`chopper-chibi`** — *"Chopper Chibi"* / *"Chibi Chopper"* (`accent: '#f472b6'`)
   - Chú tuần lộc chibi đội mũ hồng chữ thập trắng (hoặc mũ tròn viền xanh), mũi xanh dương đặc trưng, gạc nâu nhỏ, mắt chớp `.agy-ct-anim-blink` và ngôi sao hoa anh đào lấp lánh `.agy-ct-anim-twinkle`. Gradient IDs tiền tố `opCh*`.
   - **Lời thoại (`FX_PET_QUIPS['chopper-chibi']`)**: Song ngữ `vi` / `en` (3 câu vui nhộn đặc trưng bác sĩ tuần lộc cổ vũ dev).
2. **`thousand-sunny`** — *"Tàu Thousand Sunny"* / *"Thousand Sunny"* (`accent: '#f5c451'`)
   - Tàu chiến thu nhỏ với mũi đầu sư tử bờm vàng cam, cánh buồm trắng/đỏ cột cờ hải tặc và sóng biển nhẹ `.agy-ct-anim-wag`, ánh sao lấp lánh `.agy-ct-anim-twinkle`. Gradient IDs tiền tố `opSn*`.
   - **Lời thoại (`FX_PET_QUIPS['thousand-sunny']`)**: Song ngữ `vi` / `en` (3 câu cổ vũ ra khơi, code mượt qua Tân Thế Giới).

### 4.3. Sticker (`src/assets/stickers.js`)
Định dạng `viewBox="0 0 64 64"`, class `.agy-ct-svg-art`, không dùng gradient ID trùng lặp (tiền tố `opSt*` nếu có `<defs>`):
1. **`mu-rom`** — *"Mũ Rơm Hải Tặc"* / *"Straw Hat"*: Nón rơm vàng óng kèm dải ruy-băng đỏ rực.
2. **`jolly-roger`** — *"Cờ Đầu Lâu Mũ Rơm"* / *"Straw Hat Jolly Roger"*: Lá cờ đen đầu lâu mũ rơm cách điệu cùng hai xương chéo.
3. **`log-pose`** — *"La Bàn Log Pose"* / *"Log Pose Compass"*: Quả cầu thủy tinh xanh ngọc đặt trong vòng đồng chỉ hướng từ trường.

### 4.4. Bong bóng chat & Khung nhập Composer (`src/presets/bubbles.js`, `src/presets/inputs.js`)
- **Bong bóng `mu-rom-hai-tac`** (*"Mũ Rơm Hải Tặc"* / *"Straw Hat Pirate"*):
  - Nền gradient biển đêm kết hợp ánh hoàng hôn (`rgba(15, 28, 48, 0.92)` → `rgba(38, 19, 28, 0.94)`), viền đỏ hải tặc (`rgba(215, 71, 75, 0.58)`), chữ `#fef3c7`, `mascotId: 'thousand-sunny'`, `mascotAlign: 'right-top'`, `scrollCaps: false`, `cyberCorners: false`, `cornerOrnament: 'gold'`.
- **Bong bóng `lenh-truy-na`** (*"Lệnh Truy Nã"* / *"Wanted Bounty"*):
  - Nền giấy truy nã sáng ấm (`rgba(252, 243, 217, 0.96)` → `rgba(235, 215, 172, 0.95)`), viền nâu mực (`rgba(146, 64, 14, 0.52)`), chữ tối `#2b1d0e`, `mascotId: 'chopper-chibi'`, `mascotAlign: 'right-top'`, `scrollCaps: true`, `cyberCorners: false`, `cornerOrnament: ''` *(để trống nhằm không đụng `::after` của `scrollCaps`)*.
- **Composer `dai-duong-sunny`** (*"Boong Tàu Hoàng Hôn"* / *"Sunny Sunset Deck"*):
  - Nền tối sâu (`rgba(14, 21, 36, 0.9)` → `rgba(24, 30, 44, 0.93)`), viền vàng rơm `1.5px solid rgba(245, 196, 81, 0.5)`, `focusBorder: '#d7474b'`, `radius: '16px'`.
- **Composer `hai-do-co`** (*"Hải Đồ Giấy Cổ (Sáng)"* / *"Grand Line Chart (Light)"*):
  - Nền giấy da nhẹ (`rgba(252, 246, 228, 0.94)` → `rgba(240, 227, 194, 0.92)`), viền nâu cổ `1.5px solid rgba(146, 64, 14, 0.36)`, `focusBorder: '#d7474b'`, `radius: '14px'`.

### 4.5. Bộ chủ đề phối sẵn (`src/presets/themes.js`)
1. **`one-piece-sunny-sunset`** (`badge: 'One Piece'`):
   - `isLight: false`, `wallpaperId: 'one-piece-sunny-sunset'`, `dimming: 24`, `wpBlur: 0`, `glassBlur: 4`, `surfaces: { sidebarOpacity: 50, headerOpacity: 42, aiCardOpacity: 62, codeOpacity: 60 }`
   - `accentColor: '#d7474b'`, `secondaryColor: '#f5c451'`, `overlayRgb: '14, 21, 36'`
   - `atmosphereId: 'stardust'`, `atmosphereIntensity: 68`
   - `bubbleId: 'mu-rom-hai-tac'`, `inputId: 'dai-duong-sunny'`
   - `pet`: `{ enabled: true, id: 'thousand-sunny', size: 88, mode: 'float', opacity: 96, pos: { xPct: 22, yPct: 14 }, showSpeechOnClick: true }`
   - `stickers`: `[{ id: 'mu-rom', slot: 'input-top-right', size: 52, glow: true, opacity: 96 }, { id: 'jolly-roger', slot: 'sidebar-bottom-right', size: 46, glow: true, opacity: 94 }]`
2. **`one-piece-grand-line-bounty`** (`badge: 'One Piece · Sáng'`):
   - `isLight: true`, `wallpaperId: 'one-piece-grand-line-map'`, `dimming: 10`, `wpBlur: 0`, `glassBlur: 4`, `surfaces: { sidebarOpacity: 74, headerOpacity: 70, aiCardOpacity: 80, codeOpacity: 76 }`
   - `accentColor: '#d7474b'`, `secondaryColor: '#4d699b'`, `overlayRgb: '244, 234, 206'`
   - `atmosphereId: 'sakura'`, `atmosphereIntensity: 45`
   - `bubbleId: 'lenh-truy-na'`, `inputId: 'hai-do-co'`
   - `pet`: `{ enabled: true, id: 'chopper-chibi', size: 86, mode: 'float', opacity: 96, pos: { xPct: 22, yPct: 15 }, showSpeechOnClick: true }`
   - `stickers`: `[{ id: 'log-pose', slot: 'input-top-right', size: 50, glow: false, opacity: 95 }, { id: 'mu-rom', slot: 'input-top-left', size: 46, glow: false, opacity: 94 }]`

---

## 5. Phần để lại cho người lập kế hoạch / thực thi (Left to Builder)
- Tọa độ đường cong (`<path>`, `<ellipse>`, `<circle>`) chi tiết cho 2 hình nền, 2 mascot và 3 sticker bảo đảm bố cục cân đối, sắc nét ở cả khung preview nhỏ (`46x46` / `68px`) lẫn màn hình rộng (`1600x900`), không trùng ID gradient và vượt qua bộ lọc `compactModuleCode`.
- Câu thoại song ngữ `VI`/`EN` cụ thể cho `FX_PET_QUIPS` và thông điệp test assertions trong `test/presets.test.mjs`, `test/surface-engine.test.mjs`, `test/fx-companions.test.mjs`.
- Cập nhật mô tả tổng số lượng trong JSDoc đầu file (nếu cần) và xác nhận `node --test`, `node cli.mjs build`, `node cli.mjs verify` đều đạt `PASS`.
