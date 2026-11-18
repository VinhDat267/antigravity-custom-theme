# Thiết kế: Cặp Mô hình Nhân vật Anime Luffy Toàn Thân (Đã rà soát)

## Mục tiêu & Lý do
- **Vấn đề:** `luffy-chibi` và `luffy-gear5` hiện tại là chibi đầu tròn (`96×96`). Qua Spike thử nghiệm dáng thẳng đối xứng, bản vẽ tĩnh đối xứng vẫn còn cứng và ở ô chọn `46×46` khuôn mặt bị thu quá nhỏ.
- **Mục tiêu:** Bổ sung cặp nhân vật **Vector Anime Cel-Shading toàn thân tư thế động 3/4** (`luffy-anime` & `luffy-gear5-anime`), tối ưu thumbnail trong Theme Studio bằng khung cắt cận chân dung, nâng trần kích thước trưng bày Pet lên `240px`, và vá các lỗi hitbox/thoại/vị trí để không che hay chặn click vùng chat.
- **Không làm (Non-goals / Anti-goals):**
  - Không thay thế `luffy-chibi` hay `luffy-gear5` trên danh sách mascot cũ và **giữ nguyên chúng trên bong bóng chat** (`mu-rom-hai-tac`, `gear5-nika` hộp `54×44` ngang).
  - Không nhúng ảnh raster đục hoặc ảnh AI cắt alpha quanh tóc gây nặng bundle.
  - Không dùng `<defs>`/`url(#...)` tĩnh trong SVG nội tuyến, không chạy `@keyframes` liên tục trên node con SVG ngoài `:hover`/`.is-reacting`, không dùng `filter: drop-shadow(...)`.

## Các hướng tiếp cận & Lựa chọn
1. **Hướng 1 — Vector Anime Cel-Shading Toàn Thân 3/4 Động (Đã chọn sau Spike):**
   - `luffy-anime`: `viewBox="0 0 132 176"` (`aspect: 0.75`), dáng bước nghiêng 3/4, mũ rơm hơi nghiêng đổ bóng qua trán, sẹo dưới mắt trái, mắt anime có đồng tử + vệt sáng, áo gile đỏ mở phanh lộ sẹo chữ X, áo choàng đen viền vàng bay lệch theo gió, đai lưng vàng, quần lửng gấu lông trắng, dép rơm.
   - `luffy-gear5-anime`: `viewBox="0 0 132 176"` (`aspect: 0.75`), dáng nhún/bật Nika năng động, tóc lửa trắng xoắn nhiều tầng, **dải mây hagoromo uốn chữ S liền mạch qua vai & cổ** (thay cho 2 quầng tròn đối xứng), mắt đỏ Nika + lông mày xoắn, miệng cười rộng Shishishi, áo trắng + đai tím + tia sét vàng/tím.
   - *Biến thể render (`variant`):* `'pet'` trả về toàn thân `viewBox="0 0 132 176"`; `'thumb'` và `'bubble'` cắt cận nửa thân trên (`viewBox="16 2 100 84"`) để thumbnail `46×46` trong Theme Studio (và nếu dùng làm bubble mascot) hiển thị rõ mặt, mũ/tóc và áo.

## Vá kỹ thuật bắt buộc
1. **Hitbox theo đúng tỷ lệ `3:4` & Xuyên click vùng trống (`PetStage` + `SurfaceEngine`):**
   - `MASCOT_TEMPLATES[id]` hỗ trợ thuộc tính tùy chọn `aspect` (mặc định `1`, với 2 mẫu anime là `0.75`). `PetStage.update()` đặt `width = Math.round(size * aspect)`, `height = size`.
   - `clampOutsideHole(x, y, sizeOrBox, holeRect, viewport)` nhận cả số `size` (tương thích ngược) lẫn `{ width, height }`; chế độ `roam` tính `maxW`/`maxH` theo đúng kích thước thực.
   - Trên `#agy-ct-pet-stage .agy-ct-svg-art`, đặt `pointer-events: none` ở gốc và `pointer-events: visiblePainted` trên các shape con (giữ `pointer-events: auto` cho custom `<img>`) để vùng trong suốt xung quanh nhân vật không chặn click vào tin nhắn/nút bên dưới.
2. **Lật bong bóng thoại thông minh (`.agy-ct-pet-speech.is-below`):**
   - Khi `this.pos.y < 64` (pet ở sát mép trên / gần titlebar), `PetStage.applyCoords()` bật class `.is-below` trên `speechEl` để CSS chuyển thoại xuống dưới (`bottom: auto; top: calc(100% + 8px)`), tránh bị cắt khỏi mép trên.
3. **Trần kích thước `44–240px` & vị trí mặc định thoáng chat:**
   - Nâng trần `pet.size` từ `160` lên `240` trong `src/core/config-store.js`, `src/fx/pet-stage.js` và thanh trượt `src/ui/theme-studio.js`.
   - Cập nhật 2 gói `one-piece-sunny-sunset` (`pet.id: 'luffy-anime'`) và `one-piece-gear5-nika` (`pet.id: 'luffy-gear5-anime'`) với `size: 168`, đặt tại vị trí mở bên phải phía trên composer (`pos: { xPct: 80, yPct: 48 }`) để làm mô hình nổi bật mà không đè lên cột hội thoại.
4. **Thoại tương tác & Kiểm thử:**
   - Thêm `FX_PET_QUIPS` (`vi`/`en`) cho `luffy-anime` và `luffy-gear5-anime` trong `src/fx/pet-stage.js`.
   - Cập nhật kiểm thử trong `test/presets.test.mjs`, `test/config-store.test.mjs`, `test/fx-companions.test.mjs`, `test/surface-engine.test.mjs`, xác minh bằng `node --test`, `node cli.mjs build`, Playwright `preview.html`, và live CDP `node cli.mjs verify`.
