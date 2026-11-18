# Antigravity 2.x Custom Theme Suite

Bộ công cụ tùy biến giao diện **Zero-Patch** (không chỉnh sửa `app.asar` hay file cài đặt gốc) cho **Google Antigravity 2.x Desktop** trên Windows 10/11 — viết hoàn toàn bằng Node.js `>= 22.4` ESM với **0 thư viện phụ thuộc ngoài**.

*Zero-patch 60–120Hz CDP theme suite for **Google Antigravity 2.x Desktop** on Windows 10/11 — pure Node.js `>= 22.4` ESM with **zero external npm dependencies**.*

---

## Điểm nổi bật / Key Capabilities

- **Zero-Patch CDP Sync:** Kết nối qua `%APPDATA%\Antigravity\DevToolsActivePort` (hỗ trợ biến môi trường `AGY_PORT_FILE`), tự lọc chỉ giữ các cửa sổ loopback chứa `.agy-shell` (bỏ qua `plugin://`, `data:`, `devtools://`). Tự động tiêm sớm bằng `Page.addScriptToEvaluateOnNewDocument`, theo dõi kết nối lại và hot-reload ngay khi `dist/antigravity-theme.js` thay đổi.
- **Lưu trữ bền vững trên Host (`user-data/`):** Antigravity đổi cổng loopback ngẫu nhiên mỗi lần khởi động lại nên `localStorage`/`IndexedDB` bị cô lập theo từng phiên. Toàn bộ cấu hình và media tải lên được đồng bộ về `user-data/config.json` và `user-data/media/*.dat` qua CDP binding `__agyThemeSave` kèm guard chống ghi đè theo timestamp (`__savedAt`).
- **Zero Live Blur & Tối ưu 120Hz / Multi-Split:**
  - Hiệu ứng kính mờ chữ L (Header + Sidebar) được dựng sẵn một lần qua offscreen canvas (`src/core/prebaked-glass.js`, cache theo key nhẹ trong `localStorage`) — **không dùng `backdrop-filter: blur(...)`** trên `.agy-shell` hoặc container cuộn `.overflow-y-auto`.
  - Cô lập `MutationObserver` khỏi các luồng streaming nặng (`agent-response`, `tool-group-collapsible`, `worked-for`, `overview-panel`, `xterm`).
  - Tự động co giãn DPR, FPS và mật độ hạt `<canvas>` khi mở nhiều split pane (`[data-split-panes]` / `[data-tiling-pane]`), đồng thời tạm dừng loop khi cửa sổ ẩn/mất focus.
- **Tương thích sâu DOM Antigravity 2.x (`Dark` & `Light`):**
  - Khoét rỗng chuẩn vùng Split-Browser (`[data-browser-hole]`) bằng đa giác `evenodd` `--agy-hole-clip` trên nền, kính mờ, `<canvas>`, thú cưng và sticker.
  - Phủ đồng bộ các bề mặt portaled/nổi như Model Selector (`.agy-overlay`), autocomplete slash/mention (`[data-mention-menu]`), thẻ Overview (`.animate-overview-panel`), viền split pane và hộp thoại Settings native.
- **Hỗ trợ ảnh Anime WebP tách nền & SVG sắc nét:** Tự động nhúng `assets/wallpapers/<id>.*` và `assets/pets/<id>.*` vào IIFE bundle lúc build, gán thẳng `data:` URI lên phần tử DOM/background thay vì `:root` CSS variables (tránh trần 2 MB của Chromium).

---

## Theme Studio 5 Tab Song Ngữ (`🌐 VI / EN`)

Mở trong Antigravity bằng **`Ctrl + Shift + Y`** (hoặc **`Ctrl + Alt + K`**), mục **`Custom theme`** trong Settings, nút sidebar **`🎨 Custom theme`** hoặc nút nổi **`🎨 Theme`**:

1. **Bộ chủ đề (`Presets`):** **11** combo 1-click hỗ trợ cả Dark & Light, kèm lưu preset riêng và Import/Export JSON:
   - *8 bộ nguyên bản:* Lôi Kiếm Vũ Đêm (`thunder-samurai-pack`), Thiên Hà Tinh Tú (`cosmic-violin-pack`), Đền Thờ Anh Đào (`sakura-shrine-pack`), Rồng Ngọc Tiên Cảnh (`jade-sanctuary-pack`), Phù Thủy Ánh Trăng (`arcane-moonlight-pack`), Kanagawa Wave (`kanagawa-wave-pack`), Kanagawa Lotus Sáng (`kanagawa-lotus-light`), Minimal Obsidian (`minimal-obsidian`).
   - *3 bộ One Piece:* **Hoàng Hôn Thousand Sunny** (`one-piece-sunny-sunset`), **Hải Đồ & Truy Nã Sáng** (`one-piece-grand-line-bounty`), **Luffy Gear 5 — Thần Mặt Trời Nika** (`one-piece-gear5-nika`).
2. **Hình nền & Kính mờ (`Wallpaper & Glass`):** **11** hình nền tích hợp (+ `none` & upload ảnh `.webp/.png/.jpg/.avif/.gif/.svg`), độ tối, độ mờ nền, độ mờ kính chữ L, chỉnh riêng opacity cho Sidebar, Header, AI Card và Code Block.
3. **Chat & Avatar:** **15** kiểu bong bóng chat (+ `none`, gồm `mu-rom-hai-tac`, `lenh-truy-na`, `gear5-nika` gắn mascot trực tiếp lên `.agy-user-bubble-frame`), **11** kiểu viền composer (+ `none`, gồm 3 mẫu One Piece), **8** bảng màu nhấn, tùy biến Avatar User (upload nén WebP 192×192) và Avatar AI Agent (chọn SVG/upload, chỉnh kích thước, bo góc, góc xoay).
4. **Thời tiết, Thú cưng & Sticker (`FX`):**
   - **6 chế độ thời tiết `<canvas>`** (`thunder-rain`, `rain`, `stardust`, `sakura`, `fireflies`, `snow`, + `none`).
   - **15 mascot tương tác** (kích thước `44–240px`, chế độ `float` / `roam` / `follow`, click bung hạt & thoại song ngữ `VI`/`EN`, tự lật xuống `.is-below` khi gần mép trên và căn lề `.is-align-left`/`.is-align-right` khi gần mép ngang): gồm 13 SVG mascot và **2 mô hình Anime WebP tách nền toàn thân** (`luffy-anime`, `luffy-gear5-anime`).
   - **17 sticker kéo thả** (kèm **4 họa tiết góc**), tự neo theo khung composer của pane đang focus và né vùng Split-Browser.
5. **Nâng cao & DOM Picker:** Soạn `customCss` bền vững (đã lọc chống chèn `</style>`), đổi ngôn ngữ `VI`/`EN`, bật/tắt launcher nổi, **Visual DOM Picker**, dọn media không dùng và Reset cấu hình.

---

## Yêu cầu hệ thống / Requirements

- **Node.js `>= 22.4`** (tận dụng built-in `WebSocket` toàn cục & `node:test`, không cần `npm install`).
- **Google Antigravity 2.x Desktop** (Windows 10/11).

---

## Cài đặt nhanh trên Windows / Quick Setup

1. Mở **Antigravity 2.x**.
2. Nhấp đúp **`install.bat`** (gọi `scripts/install-win.ps1`):
   - Kiểm tra Node.js `>= 22` và build `dist/antigravity-theme.js`.
   - Tạo `user-data/silent-start.vbs` + shortcut `Antigravity Custom Theme.lnk` trong Windows Startup để chạy nền không hiện cửa sổ console.
   - Khởi chạy `CdpSyncDaemon`.
3. Nhấn **`Ctrl + Shift + Y`** trong Antigravity để mở Theme Studio và chọn combo yêu thích.
4. Để gỡ cài đặt tự khởi động và tách hook khỏi cửa sổ đang mở: nhấp đúp **`uninstall.bat`** (giữ nguyên `user-data/` để không mất preset đã lưu; dùng `node cli.mjs reset --wipe` nếu muốn xóa sạch cả cấu hình & media).

---

## Lệnh CLI & npm scripts

Có thể chạy trực tiếp bằng `node cli.mjs <command>` hoặc `npm run <script>`:

| Lệnh / Command | Mô tả / Description |
| :--- | :--- |
| `node cli.mjs build` | Đóng gói `src/` + `assets/{wallpapers,pets}/` thành `dist/antigravity-theme.js` |
| `node cli.mjs start [--foreground]` | Khởi chạy nền `CdpSyncDaemon` (thêm `--foreground` để xem log trực tiếp) |
| `node cli.mjs stop` | Dừng an toàn daemon CDP qua `user-data/daemon-cmd.json` |
| `node cli.mjs status` | Xem trạng thái PID daemon, cổng `DevToolsActivePort`, bundle & config |
| `node cli.mjs inject [--one-shot] [--build]` | Gửi lệnh reinject tới daemon đang chạy, hoặc tiêm trực tiếp một lần với `--one-shot` |
| `node cli.mjs open-settings [--tab <id>]` | Mở nhanh Theme Studio (tùy chọn tab: `presets`, `wallpaper`, `chat`, `fx`, `advanced`) |
| `node cli.mjs reset [--wipe]` | Gỡ toàn bộ style & DOM đã tiêm trên Antigravity (thêm `--wipe` để xóa `user-data/config.json` & `media/`) |
| `node cli.mjs verify [--unmounted]` | Kiểm chứng qua CDP: `themeActive`, `hasLiveBlurOnScrollers: false`, `shellTransparentBg`, `--agy-hole-clip` |
| `node --test` | Chạy toàn bộ **56** unit & integration test |
| `node scripts/build.mjs --check` | Build bundle và kiểm tra cú pháp bằng `vm.Script` (được chạy trong CI GitHub Actions) |

---

## Cấu trúc dự án / Project Layout

```text
antigravity-custom-theme/
├── cli.mjs & package.json              # Entrypoint CLI thống nhất & npm scripts
├── install.bat / uninstall.bat         # Trình cài đặt / gỡ Startup 1-click trên Windows
├── preview.html                        # Sandbox kiểm thử Theme Studio & FX độc lập ([data-agy-mock-shell])
├── SKILL.md & AGENTS.md                # Hướng dẫn thêm preset/asset & ràng buộc kiến trúc 120Hz/CDP
├── assets/
│   └── pets/                           # Sprite WebP tách nền alpha (luffy-anime.webp, luffy-gear5-anime.webp)
├── daemon/
│   └── cdp-daemon.mjs                  # Watcher DevToolsActivePort, hot-reload & CDP bridge __agyThemeSave
├── scripts/
│   ├── build.mjs                       # Single-IIFE bundler (MODULE_ORDER + nhúng assets/wallpapers & pets)
│   ├── verify-cdp.mjs                  # Kiểm chứng live DOM/CDP invariant
│   ├── install-win.ps1 / uninstall-win.ps1
├── src/
│   ├── assets/                         # mascots.js, stickers.js, wallpapers-manifest.js
│   ├── core/                           # config-store.js, dom-targets.js, prebaked-glass.js, surface-engine.js
│   ├── fx/                             # ambient-canvas.js, pet-stage.js, sticker-layer.js
│   ├── presets/                        # bubbles.js, inputs.js, themes.js
│   ├── ui/                             # i18n.js, theme-studio.js
│   └── index.js                        # CustomThemeController (mounting guard & lifecycle)
└── test/                               # Bộ kiểm thử Node.js (build, daemon, config, DOM targets, FX, presets, surface, UI)
```

---

## Tự mở rộng Preset & Asset / Adding Presets & Assets

Xem hướng dẫn chi tiết trong [`SKILL.md`](SKILL.md) và [`AGENTS.md`](AGENTS.md):

- **Thú cưng WebP toàn thân:** Đặt file `.webp`/`.png` tách nền vào `assets/pets/<id>.<ext>`, khai báo metadata (`aspect`, `embeddedDataUri: ''` + SVG `render()` fallback gọn) trong `MASCOT_TEMPLATES` (`src/assets/mascots.js`).
- **Hình nền riêng:** Đặt file vào `assets/wallpapers/<id>.<ext>` và đăng ký tương ứng trong `src/assets/wallpapers-manifest.js`.
- **Kiểm chứng bắt buộc sau chỉnh sửa:**

```bash
node --test
node cli.mjs build
node cli.mjs verify
```

Khi phát triển offline không mở Antigravity, có thể serve tĩnh thư mục gốc qua HTTP và mở `preview.html` trên trình duyệt.
