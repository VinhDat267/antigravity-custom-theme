# Thiết kế: Cặp Mô hình Nhân vật Anime Luffy & Gear 5 Tách Nền WebP

## Mục tiêu & Lý do
- **Vấn đề:** Qua đối chiếu thực tế bằng 2 bản Spike (SVG vẽ tay vs Ảnh anime WebP tách nền), mẫu vector path viết tay vẫn có nét cứng và chưa truyền tải được thần thái anime Luffy; trong khi bản Spike ảnh anime tách nền WebP (`luffy-anime.webp` & `luffy-gear5-anime.webp`) đạt độ sắc nét khuôn mặt, nếp áo và chi tiết nhân vật giống phim anime thật trên cả nền Dark lẫn Light.
- **Mục tiêu:** Nhúng cặp mô hình **Anime Luffy toàn thân tách nền WebP** vào hệ thống mascot (`assets/pets/` + `scripts/build.mjs`), nâng trần kích thước trưng bày lên `240px`, thu gọn hitbox khớp đúng tỷ lệ ảnh (`aspect`), xuyên click vùng trống, tự lật bong bóng thoại gần mép trên, và gắn vào 2 gói One Piece tối/Nika.
- **Không làm (Non-goals / Anti-goals):**
  - Không thay đổi hay xóa `luffy-chibi` và `luffy-gear5` SVG cũ — giữ chúng cho icon chibi và làm mascot bong bóng chat (`mu-rom-hai-tac`, `gear5-nika`, khung `54×44`).
  - Không đưa chuỗi base64 WebP vào `:root { --var }` (giữ đúng giới hạn 2 MB CSS variable của Chromium, bind trực tiếp qua `<img src>`).
  - Không dùng `filter: drop-shadow(...)`, không thêm `backdrop-filter: blur(...)`, giữ `120Hz` GPU-composited trên `.agy-ct-pet-body`.

## Kiến trúc kỹ thuật
1. **Nhúng asset `assets/pets/*.webp` trong `scripts/build.mjs` & `src/assets/mascots.js`:**
   - Trích helper dùng chung `collectDiskAssets(dirPath)` trong `scripts/build.mjs` cho cả `assets/wallpapers/` và `assets/pets/`.
   - Đặt `assets/pets/luffy-anime.webp` (`296×480`, `~38 KB`) và `assets/pets/luffy-gear5-anime.webp` (`305×480`, `~48 KB`) trong repo; khi build `dist/antigravity-theme.js`, `scripts/build.mjs` nhúng `data:image/webp;base64,...` vào `embeddedDataUri` của 2 entry tương ứng trong `MASCOT_TEMPLATES`.
   - Trong `src/assets/mascots.js`, mỗi entry có `id`, `name`, `nameEn`, `accent`, `aspect` (`0.62` cho `luffy-anime`, `0.64` cho `luffy-gear5-anime`), `embeddedDataUri: ''`, và `render(variant)` SVG dự phòng gọn sạch (không `<defs>`/`url(#...)` tĩnh) phục vụ kiểm thử ESM thuần và fallback.
2. **Hiển thị `<img>` & Hitbox tỷ lệ thực trong `PetStage` + `ThemeStudio`:**
   - `PetStage.update()`: khi `tpl.embeddedDataUri` tồn tại (hoặc `customMedia.pet`), render `<img draggable="false">` với `-webkit-user-drag: none` thay cho SVG fallback; tính kích thước khung theo `width = Math.round(size * aspect)`, `height = size`.
   - `clampOutsideHole(x, y, sizeOrBox, holeRect, viewport)` nhận cả số `size` (tương thích ngược) lẫn `{ width, height }`; chế độ `roam` tính biên màn hình theo `width`/`height` thực.
   - CSS ở `src/core/surface-engine.js`: `#agy-ct-pet-stage` và `.agy-ct-pet-body` đặt `pointer-events: none`; chỉ phần tử đồ họa (`.agy-ct-pet-body > img { pointer-events: auto; cursor: grab; }` và `.agy-ct-svg-art :is(path, rect, circle, ellipse, polygon, polyline) { pointer-events: visiblePainted; cursor: grab; }`) nhận click/drag để vùng rìa trống không chặn click vùng chat.
   - `ThemeStudio.renderFxTab`: ưu tiên render `<img src="${m.embeddedDataUri}">` (`object-fit: contain`) trong ô chọn `46×46px` khi mascot có `embeddedDataUri`.
3. **Lật bong bóng thoại thông minh & Trần kích thước `44–240px`:**
   - Trong `PetStage.applyCoords()`, khi `this.pos.y < 64`, bật class `.is-below` trên `speechEl` để `.agy-ct-pet-speech.is-below` lật xuống `top: calc(100% + 8px)` thay vì tràn khỏi mép trên màn hình.
   - Nâng trần `pet.size` từ `160` lên `240` trong `src/core/config-store.js`, `src/fx/pet-stage.js` và thanh kéo `src/ui/theme-studio.js`.
4. **Thoại tương tác & Gắn vào gói One Piece:**
   - Thêm `FX_PET_QUIPS` song ngữ `vi`/`en` cho `luffy-anime` và `luffy-gear5-anime` trong `src/fx/pet-stage.js`.
   - Cập nhật `one-piece-sunny-sunset` (`pet.id: 'luffy-anime'`, `size: 176`, `pos: { xPct: 82, yPct: 48 }`) và `one-piece-gear5-nika` (`pet.id: 'luffy-gear5-anime'`, `size: 176`, `pos: { xPct: 82, yPct: 48 }`) đặt tại góc mở bên phải phía trên composer.
