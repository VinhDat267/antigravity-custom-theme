# Antigravity 2.x Custom Theme Suite

Bộ tùy biến giao diện **Zero-Patch** (không sửa file `app.asar` gốc) dành riêng cho **Google Antigravity 2.x Desktop** trên Windows 10/11 — thuần Node.js `>= 22`, không phụ thuộc thư viện ngoài (`0 npm dependencies`).

*Zero-patch CDP theme suite for **Google Antigravity 2.x Desktop** on Windows 10/11 — built on Node.js >= 22 with zero external dependencies.*

---

## Tính năng chính / Key Features

- **Zero-Patch CDP Sync (`%APPDATA%\Antigravity\DevToolsActivePort`):** Tự động dò cổng CDP, chỉ tiêm vào cửa sổ `.agy-shell` (bỏ qua `plugin://`, `data:`, `devtools://`), giữ cấu hình bền vững tại `user-data/` qua mọi lần đổi cổng loopback.
- **Zero Live Blur + Split-Browser Cutout:** Kính mờ chữ L (`prebaked-glass.js`) dựng sẵn qua offscreen canvas giúp cuộn 60–120fps; tự động khoét rỗng vùng trình duyệt nhúng (`[data-browser-hole]`) bằng `evenodd` `clip-path`.
- **5-Tab Theme Studio song ngữ (`🌐 VI / EN`):**
  1. **Bộ chủ đề (Presets):** 8+ combo 1-click (*Lôi Kiếm Vũ Đêm*, *Thiên Hà Tinh Tú*, *Đền Thờ Anh Đào*, *Rồng Ngọc*, *Phù Thủy Ánh Trăng*, *Kanagawa Wave*, *Kanagawa Lotus (Light)*, *Minimal Obsidian*) + Import/Export JSON.
  2. **Hình nền & Kính mờ (Wallpaper & Glass):** Hình nền sẵn + tải ảnh riêng (`.webp/.png/.jpg/.avif/.gif/.svg`), độ tối, độ mờ nền, L-glass blur, opacity từng vùng (Sidebar, Header, AI Card, Code Block).
  3. **Chat & Avatar:** 12+ kiểu bong bóng chat có/không mascot, 8+ kiểu viền composer, màu nhấn + Avatar User & AI Agent (ảnh upload 192x192 WebP hoặc SVG ngôi sao tùy chỉnh kích thước, bo góc, góc xoay).
  4. **Thời tiết, Thú cưng & Sticker:** 6 hiệu ứng `<canvas>` (`thunder-rain`, `rain`, `stardust`, `sakura`, `fireflies`, `snow` — tự tạm dừng khi ẩn tab), 9+ thú cưng tương tác (`float` / `roam` / `follow` + click bung hạt & lời thoại), 14+ sticker kéo thả & né Split-Browser.
  5. **Nâng cao & DOM Picker:** `custom.css` bền vững, chuyển ngôn ngữ `VI`/`EN`, nút nổi, **Visual DOM Picker**, dọn RAM media và Reset.

---

## Yêu cầu / Requirements

- **Node.js `>= 22.4`** (có sẵn global `WebSocket` & `node:test`)
- **Google Antigravity 2.x Desktop** (Windows 10/11) đang bật hoặc khởi động bình thường

---

## Cài đặt nhanh 1-click trên Windows / 1-Click Windows Setup

1. Mở **Antigravity 2.x** trên Windows.
2. Nhấp đúp **`install.bat`** (tự build `dist/antigravity-theme.js`, tạo tác vụ chạy ngầm `user-data/silent-start.vbs` trong Windows Startup và khởi chạy daemon CDP).
3. Trong cửa sổ Antigravity 2.x, nhấn **`Ctrl + Shift + Y`** (hoặc **`Ctrl + Alt + K`**), bấm tab **`Custom theme`** trong Settings, nút sidebar **`🎨 Custom theme`** hoặc nút nổi **`🎨 Theme`**.
4. Muốn gỡ bỏ sạch khỏi máy? Nhấp đúp **`uninstall.bat`** (xóa shortcut Startup, gỡ hook theme trên cửa sổ đang mở và dừng daemon; giữ lại `user-data/` phòng khi muốn dùng lại).

---

## Lệnh CLI / Unified CLI Commands

| Lệnh / Command | Mô tả / Description |
| :--- | :--- |
| `node cli.mjs build` | Đóng gói `src/` + `assets/wallpapers/` thành `dist/antigravity-theme.js` |
| `node cli.mjs inject --one-shot` | Tiêm trực tiếp theme vào cửa sổ Antigravity 2.x đang mở (không giữ daemon) |
| `node cli.mjs start` | Khởi chạy nền `CdpSyncDaemon` (tự reconnect, hot-reload & giữ `AddScriptToEvaluateOnNewDocument`) |
| `node cli.mjs stop` | Dừng an toàn daemon CDP qua `user-data/daemon-cmd.json` |
| `node cli.mjs status` | Kiểm tra PID daemon, cổng CDP hiện tại, trạng thái bundle & config |
| `node cli.mjs open-settings [--tab <id>]` | Mở nhanh Theme Studio trên cửa sổ đang chạy |
| `node cli.mjs reset [--wipe]` | Gỡ sạch theme khỏi DOM đang chạy (thêm `--wipe` để xóa cả `user-data/config.json` & media) |
| `node cli.mjs verify` | Kiểm chứng live CDP (`themeActive`, Zero Live Blur, `.agy-shell` transparency, Studio opener) |
| `node --test` | Chạy toàn bộ unit & integration test |

---

## Xem thử nhanh UI / Standalone Preview

Mở `preview.html` sau khi chạy `node cli.mjs build` để kiểm thử nhanh Theme Studio, thời tiết `<canvas>`, thú cưng và sticker trên trình duyệt độc lập với khung `[data-agy-mock-shell]`.
