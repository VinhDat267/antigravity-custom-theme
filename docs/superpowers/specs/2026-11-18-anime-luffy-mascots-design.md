# Thiết kế ngắn: Cặp Mô hình Nhân vật Anime Luffy Toàn Thân

## Mục tiêu & Lý do
- **Vấn đề:** Hai mascot `luffy-chibi` và `luffy-gear5` hiện tại là icon chibi đầu tròn tối giản (`96×96`), chưa mang lại cảm giác mô hình nhân vật anime Luffy đứng trên màn hình Antigravity.
- **Mục tiêu:** Thêm cặp nhân vật toàn thân phong cách anime cel-shading cho cả **Luffy Thuyền Trưởng (Wano / Red Coat)** và **Luffy Gear 5 (Sun God Nika)**, đồng thời nâng giới hạn kích thước Pet để nhân vật hiển thị sắc nét như mô hình trưng bày trên nền desktop.
- **Không làm (Non-goals / Anti-goals):**
  - Không thay đổi hay xóa `luffy-chibi` và `luffy-gear5` cũ (giữ tương thích ngược cho config/preset hiện có và icon nhỏ).
  - Không dùng ảnh raster nền đục dễ dính viền trắng hoặc làm phình dung lượng `dist/antigravity-theme.js`.
  - Không dùng `<defs>`/`url(#...)` tĩnh trong SVG nội tuyến, không chạy `@keyframes` liên tục trên node con SVG ngoài `:hover`/`.is-reacting`, không dùng `filter: drop-shadow(...)`.

## Các hướng tiếp cận & Lựa chọn
1. **Hướng 1 — Nhân vật Vector Anime Cel-Shading Toàn Thân (Đã chọn):**
   - Tạo 2 template mới trong `src/assets/mascots.js`: `luffy-anime` (Luffy dáng đứng toàn thân áo khoác đỏ phanh ngực lộ sẹo X + áo choàng đen thuyền trưởng vắt vai, mũ rơm, đai vàng, quần lửng viền lông, dép rơm) và `luffy-gear5-anime` (form Nika toàn thân tóc lửa trắng, khăn mây hagoromo tím nhạt bồng bềnh quanh vai, tia sét Haki vàng/tím, áo trắng mở ngực sẹo X).
   - *Lý do chọn:* Nền trong suốt 100% trên cả Light/Dark theme, nét sắc ở mọi kích thước (44–240px), nhẹ (~3–5 KB/mẫu), hỗ trợ chớp mắt (`agy-ct-anim-blink`) và lơ lửng (`agy-ct-anim-float`) mượt ở 120Hz.
2. **Hướng 2 — Ảnh Anime / Figure 2.5D tách nền nhúng `.webp` (Không chọn):**
   - *Đổi lại:* Dễ dính viền cắt quanh tóc, tăng mạnh dung lượng bundle, không có hoạt ảnh khuôn mặt nội tại. Vẫn giữ sẵn nút `Tải ảnh Pet` cho ảnh ngoài.

## Thiết kế kỹ thuật tóm tắt
- **`src/assets/mascots.js`:** Thêm `luffy-anime` và `luffy-gear5-anime` với `viewBox="0 0 120 160"` (tỉ lệ toàn thân đứng), bóng đổ cel-shading 2–3 lớp tách biệt mảng da/tóc/áo/mũ rơm, mắt anime có con ngươi + highlight, chỉ dùng fill màu phẳng (không `id=`/`url(#...)`, không `<animate>`/`<style>`). Hỗ trợ cả biến thể `'pet'` và `'bubble'`.
- **Kích thước trưng bày Pet (`44–240px`):** Nâng trần `pet.size` từ `160px` lên `240px` trong `src/core/config-store.js`, `src/fx/pet-stage.js` và slider `src/ui/theme-studio.js` (mặc định bundle dùng `140–156px` để đứng nổi bật mà không che khung chat).
- **Thoại tương tác & Gói One Piece:** Thêm `FX_PET_QUIPS` song ngữ `vi`/`en` trong `src/fx/pet-stage.js` cho `luffy-anime` & `luffy-gear5-anime`, và cập nhật `one-piece-sunny-sunset` (`luffy-anime`) cùng `one-piece-gear5-nika` (`luffy-gear5-anime`) kèm preset bong bóng tương ứng (hoặc giữ lựa chọn trong tab FX cho tất cả mẫu).
- **Kiểm thử & Xác minh:** TDD (`RED -> GREEN`) bổ sung kiểm thử trong `test/presets.test.mjs`, `test/config-store.test.mjs`, `test/fx-companions.test.mjs`, `test/surface-engine.test.mjs`, kiểm tra trực quan trong Chromium `preview.html` trên nền Dark & Light, và verify qua CDP `node cli.mjs verify`.

## Điểm để lại cho bước triển khai
- Chi tiết đường nét giải phẫu anime (`path` tóc, mắt, nếp áo choàng, thế đứng) và bảng màu cel-shading cụ thể sao cho giữ độ tương phản tốt cả ở 46px (thumbnail Studio) lẫn 240px (trên màn hình).
