# Phát hành Production qua npm — Design Spec

**Ngày:** 2026-11-21
**Trạng thái:** Bản nháp, chờ chủ repo duyệt

## 1. Mục đích

Chủ repo muốn phát hành bộ theme cho **người khác dùng, cài đặt dễ dàng**. Hiện tại repo chỉ chạy tốt trên máy của chính chủ repo:

- Cài đặt bằng cách clone repo rồi chạy `install.bat`. Installer ghi cứng đường dẫn `node.exe` trong PATH vào `user-data/silent-start.vbs`, nên đổi phiên bản Node là chạy nền hỏng.
- `user-data/` nằm ngay trong thư mục code. Cập nhật bằng cách chép đè sẽ làm mất preset của người dùng.
- Phần khởi động trong `src/index.js` không có `try/catch`. Theme bám vào DOM nội bộ của Antigravity (`.agy-shell`, `data-testid`, `.agy-*`), nên khi Antigravity đổi DOM, lỗi sẽ hiện thẳng trong cửa sổ người dùng đang làm việc.
- Không có số phiên bản cho cấu trúc config. Version `'1.0.0'` viết cứng trong `src/index.js`, không lấy từ `package.json`.
- Chưa có LICENSE, CHANGELOG hay bản release. Repo GitHub `VinhDat267/antigravity-custom-theme` đã công khai nhưng chưa có release nào.
- Repo đang chứa nội dung One Piece (nhân vật có bản quyền). Nếu bị gỡ theo DMCA thì mất cả repo, mà repo cũng sẽ là nơi cung cấp bản cập nhật cho người dùng.

Antigravity đổi DOM thường xuyên, nên **việc đưa bản vá tới người dùng nhanh và an toàn** là trọng tâm của thiết kế này.

## 2. Mục tiêu, không làm, thất bại

**Mục tiêu**
1. Máy Windows 10/11 đã có Node ≥ 22.4 cài xong bằng hai lệnh: `npm i -g antigravity-custom-theme`, rồi `agy-theme setup`. Mở Antigravity là thấy theme.
2. Cập nhật bằng một nút trong Theme Studio. Bản cập nhật được ký bằng khóa Ed25519 mà chủ repo giữ offline. Cài lỗi thì tự quay về bản cũ, giữ nguyên cấu hình.
3. Antigravity đổi DOM hoặc theme gặp lỗi thì **Antigravity vẫn dùng được bình thường**: theme tự gỡ và trả lại giao diện gốc.
4. Config có số phiên bản và có các bước chuyển đổi. Nâng cấp hay quay về bản cũ đều không làm mất preset.
5. Gói npm và repo công khai **không chứa nội dung One Piece**. Chủ repo vẫn dùng được One Piece trên máy mình qua cơ chế gói nội dung (content pack).
6. Có đủ tài liệu phát hành: LICENSE, CHANGELOG, README cho người dùng cuối (VI/EN), RELEASING.md, SECURITY.md.

**Không làm**
- Hỗ trợ macOS hoặc Linux. `package.json` đặt `"os": ["win32"]`.
- Bản zip portable hoặc `.exe` (đã cân nhắc, xem mục 4).
- Kho gói nội dung công khai hay cơ chế tải pack. Pack chỉ là thư mục cục bộ.
- Viết lại lịch sử git để xóa One Piece khỏi các commit cũ (xem mục 8).
- Thay đổi giao diện hay hành vi của các preset hiện có.

**Coi là thất bại dù vẫn chạy được**
- Gửi bất kỳ dữ liệu nào của người dùng ra ngoài (không telemetry, không báo lỗi tự động).
- Tự cài cập nhật khi người dùng chưa bấm nút.
- Đòi quyền admin, hoặc đụng vào file cài đặt của Antigravity (`app.asar`).
- Theme lỗi làm cửa sổ Antigravity trắng trang hoặc không thao tác được.
- Cập nhật hoặc rollback làm mất cấu hình hay media của người dùng.
- Một bản cập nhật không có chữ ký hợp lệ vẫn được cài.

## 3. Ràng buộc

- Giữ nguyên toàn bộ ràng buộc trong `AGENTS.md`:
  - không vá file cài đặt;
  - bundle là một IIFE duy nhất, ghép theo `MODULE_ORDER`, với tên định danh cấp cao nhất không trùng nhau;
  - không dùng blur trực tiếp (zero live blur);
  - giữ ngân sách hiệu năng 120Hz;
  - không chứa đường dẫn đặc thù của máy cụ thể.
- **Không dùng thư viện npm ngoài.** Dùng `node:crypto` cho Ed25519 và SHA-512, `fetch` có sẵn trong Node cho HTTP.
- Node ≥ 22.4. `engines` trong `package.json` chỉ có tác dụng cảnh báo, nên CLI phải tự kiểm tra lúc chạy và in thông báo dễ hiểu.
- Trên Windows, chạy `npm.cmd` qua `child_process` cần `shell: true` (bản vá CVE-2024-27980). Đối số truyền vào phải là chuỗi do code tự tạo và đã được đặt trong dấu nháy.

## 4. Các phương án đã cân nhắc

| Quyết định | Các lựa chọn | Đã chọn | Lý do |
|---|---|---|---|
| Kênh cài đặt | zip portable kèm `node.exe` / **npm** / `.exe` đóng gói một file | **npm** (chủ repo chọn) | Gói nhẹ, cập nhật đơn giản. Đổi lại người dùng phải có sẵn Node ≥ 22.4. File `.exe` chưa ký số sẽ bị SmartScreen và antivirus nghi ngờ. |
| Cập nhật | thông báo rồi tải tay / **cập nhật một nút** / không kiểm tra | **Một nút** (chủ repo chọn) | Antigravity đổi DOM thường xuyên, người dùng cần nhận bản vá nhanh nhất có thể. |
| Bảo vệ bản cập nhật | chỉ dựa vào 2FA của npm / **thêm chữ ký Ed25519 riêng** | **Chữ ký riêng** (chủ repo chọn) | Kẻ chiếm được tài khoản npm vẫn không đẩy được code độc tới người dùng. |
| Nơi đặt chữ ký | **tách rời, đăng trên GitHub Releases** / nằm trong gói | **Tách rời** | Không phải tự viết bộ giải nén tar. Không bị lệch chữ ký khi npm chỉnh `package.json` lúc publish. GitHub chỉ là nơi chứa file, không cần tin cậy. |
| Repo chứa chữ ký | **repo chỉ chứa release** (nguồn chính) + repo hiện tại (dự phòng) / chỉ repo hiện tại | **Repo release riêng** (chủ repo chọn) | Mọi bản đã cài đều chứa sẵn URL tải chữ ký. Repo hiện tại có thể bị gỡ hoặc đổi tên (lịch sử git còn One Piece), khi đó mọi bản đã cài sẽ kẹt cập nhật. Repo release không có code và không có One Piece nên URL ổn định lâu dài. |
| One Piece | **chỉ dùng riêng** / repo pack riêng / giữ nguyên | **Dùng riêng** (chủ repo chọn) | Bị DMCA gỡ repo thì mất luôn kênh cập nhật của mọi người. |
| Nạp gói nội dung | **nạp lúc chạy từ thư mục dữ liệu** / ghép lúc build | **Lúc chạy** | Chạy được với bản cài từ npm và không mất khi cập nhật. Nếu ghép lúc build, chủ repo phải chạy từ thư mục repo, và bấm cập nhật là mất pack. |

## 5. Thiết kế

### 5.1 Gói npm và CLI

- **Tên gói:** `antigravity-custom-theme`. Ngày 2026-11-21 tên này còn trống trên npm.
- `bin: { "agy-theme": "cli.mjs" }`, `engines.node: ">=22.4"`, `os: ["win32"]`.
- **Danh sách `files` chỉ gồm file được phép phát hành:**
  - `cli.mjs`, `daemon/`, `scripts/verify-cdp.mjs`;
  - các script runtime cần cho `setup` và `update`;
  - `dist/antigravity-theme.js` đã build sẵn;
  - các module mà daemon import trực tiếp: `scripts/build.mjs` và `src/core/config-store.js`;
  - README, LICENSE, CHANGELOG.
  - Ngoài hai file trên, không có `src/`, `test/`, `docs/`, `packs/`, `assets/`.
  - Thứ chạy trên máy người dùng chính là thứ đã được ký: bundle build sẵn trong tarball.
- **Chế độ chạy.** Code tự nhận biết mình đang ở chế độ nào:
  - **installed**: thư mục gói nằm dưới `$(npm prefix -g)/node_modules/antigravity-custom-theme`, so sánh bằng `realpath`;
  - **source**: chạy từ thư mục repo git.
  - Ở chế độ installed mà thiếu `dist/` thì báo lỗi rõ ràng, không tự build.
  - Ở chế độ source, bundle được build như hiện tại.
- **Lệnh cho người dùng:**

  | Lệnh | Việc |
  |---|---|
  | `setup` | Tạo dữ liệu, chuyển dữ liệu cũ sang, tạo mục khởi động cùng Windows, tạo lối tắt Start Menu, chạy daemon |
  | `uninstall [--purge]` | Dừng daemon, gỡ hook khỏi cửa sổ đang mở, xóa mục khởi động và lối tắt. `--purge` xóa luôn dữ liệu. |
  | `start` / `stop` / `status` | Như hiện tại |
  | `enable` / `disable` | Bật/tắt theme khẩn cấp (mục 5.5) |
  | `update [--check]` | Kiểm tra hoặc cài bản mới qua đúng luồng của nút cập nhật (mục 5.6) |
  | `doctor` | In thông tin chẩn đoán: phiên bản Node, chế độ chạy, phiên bản gói, port file của Antigravity, trạng thái daemon, health, pack đã nạp, trạng thái cập nhật |

- **Lệnh cho dev, chỉ dùng ở chế độ source:** `build`, `inject`, `verify`, `open-settings`, `reset`, `pack build`, `release ...`.
- `npm i -g` **không** tự chạy `setup`. Không dùng `postinstall`, vì nhiều người cài với `--ignore-scripts`, và một gói tự tạo mục khởi động ngay khi cài sẽ bị coi là đáng ngờ. Sau khi cài, README và thông báo của CLI hướng dẫn chạy `agy-theme setup`.

### 5.2 Thư mục dữ liệu

- **Thư mục gốc dữ liệu:** `%LOCALAPPDATA%\AntigravityCustomTheme\`. Có thể ghi đè bằng biến môi trường `AGY_THEME_HOME`, dùng cho test và dev. Thư mục này thay cho mọi chỗ code đang dùng `<root>/user-data`, gồm `cli.mjs` (`USER_DATA_DIR`), `runDaemon`, `prepareBundleSource` và `getDaemonStatus`.
- **Nội dung:**
  - `config.json`, `media/`;
  - `packs/`;
  - `daemon.pid`, `daemon.log`, `daemon-cmd*.json`;
  - `health.json`, `host-state.json` (chứa trạng thái `disabled`);
  - `update-state.json`, `updates/`;
  - `backups/`.
- **Chuyển dữ liệu cũ (chỉ một lần).** Áp dụng cho chủ repo và những ai đã clone repo trước đây. Ở chế độ installed, `<packageRoot>` là thư mục global của npm, nơi không bao giờ có `user-data`. Vì vậy `setup` phải tự tìm bản clone cũ *(quyết định của tôi, sau buổi reviewer đọc thử)*:
  1. Đọc lối tắt `Antigravity Custom Theme.lnk` cũ trong thư mục Startup và file VBS nó trỏ tới, lấy ra đường dẫn thư mục clone. Có thể chỉ định thẳng bằng `agy-theme setup --from <thư mục clone>`.
  2. Nếu `<clone>/user-data/daemon.pid` trỏ tới một process còn sống, dừng daemon cũ trước: gửi lệnh `stop` qua `daemon-cmd.json`, quá thời gian thì kill. Không làm vậy thì hai daemon sẽ tiêm và gỡ bundle của nhau trong cùng một cửa sổ.
  3. Nếu thư mục mới chưa có `config.json`, chép `config.json` và `media/` từ `<clone>/user-data/` sang. Bản cũ giữ nguyên, việc chuyển được ghi vào log.
  4. Ở chế độ source, `node cli.mjs start` dùng chung thư mục `%LOCALAPPDATA%` và chuyển dữ liệu từ `<repo>/user-data` theo cùng cách đó. Vì dùng chung một file pid, không thể có hai daemon cùng chạy.
- **Chế độ source không tự khởi động cùng Windows** *(quyết định của tôi)*. Dev tự chạy `node cli.mjs start`. Nếu `setup` được gọi ở chế độ source, nó giải thích điều này và dừng. Chủ repo dùng hằng ngày bản cài từ npm cùng pack One Piece, và chỉ chạy chế độ source khi phát triển.

### 5.3 Khởi động cùng Windows và gỡ cài đặt

- `setup` ghi một file VBS vào thư mục dữ liệu, rồi tạo `Antigravity Custom Theme.lnk` trong thư mục Startup.
  - Lối tắt này trùng tên với lối tắt của installer cũ nên sẽ ghi đè nó.
  - VBS **không chứa đường dẫn `node.exe`**. Lúc `setup`, nó ghi lại đường dẫn thật (`realpath`) của thư mục gói và của global prefix npm. Mỗi lần chạy:
    - thư mục gói còn: chạy ẩn `agy-theme.cmd start`. Nếu lệnh này không chạy được, ví dụ đang dùng một Node khác chưa cài gói, thì thoát im lặng và **không** tự xóa;
    - thư mục gói mất nhưng global prefix vẫn còn (người dùng đã `npm rm -g` mà không chạy `uninstall`): tự xóa cả lối tắt lẫn chính nó;
    - cả hai đều mất (thường do đổi bản Node bằng trình quản lý phiên bản): thoát im lặng, không tự xóa.
- **Trình quản lý phiên bản Node** *(quyết định của tôi)*:
  - Hỗ trợ chính thức: Node cài từ nodejs.org, qua winget, và nvm-windows. Với nvm-windows, theme chỉ chạy khi đang dùng một bản Node đã cài gói, và tự chạy lại khi chuyển về bản đó.
  - Volta và fnm: **không hỗ trợ chính thức**. `setup` phát hiện và cảnh báo.
  - Ở chế độ installed, nếu thư mục gói không nằm dưới `npm prefix -g` (kiểu Volta), code coi đó là bản cài "không quản lý được". Nút cập nhật bị tắt, kèm hướng dẫn cập nhật bằng chính công cụ đó.
- **Start Menu** có thêm hai lối tắt: "Tắt Antigravity Custom Theme" và "Bật Antigravity Custom Theme". Chúng chạy `agy-theme disable` / `agy-theme enable`.
- npm 7 trở lên không chạy script khi gỡ gói. Vì vậy README hướng dẫn chạy `agy-theme uninstall` trước `npm rm -g`. Nếu người dùng quên, cơ chế tự xóa của VBS ở trên sẽ dọn mục khởi động.
- Xóa `install.bat`, `uninstall.bat`, `scripts/install-win.ps1` và `scripts/uninstall-win.ps1`; `setup` và `uninstall` thay thế chúng.

### 5.4 Phiên bản và schema config

- **Một nguồn version duy nhất là `package.json`:**
  - `scripts/build.mjs` thay token `__AGY_THEME_VERSION__` trong `src/index.js` bằng version, để `window.__AGY_CUSTOM_THEME__.version` hiện đúng;
  - daemon và CLI đọc version từ `package.json`;
  - tên tarball và tag GitHub (`v1.2.3`) cũng theo version này.
- **Schema config:**
  - Thêm `schemaVersion` vào `DEFAULT_CONFIG`. Config hiện tại không có trường này nên được coi là `0`, và schema của bản phát hành đầu tiên là `1`.
  - Mảng `CONFIG_MIGRATIONS` trong `config-store.js` gồm các bước `{ from, to, up(cfg) }`, chạy lần lượt trong cả `loadConfig` (phía trang) lẫn `sanitizeImportedConfig` (phía daemon).
  - Mỗi bước có test riêng.
- **Quy tắc chuyển đổi: chỉ được thêm** *(quyết định của tôi)*. Trong cùng một major version (1.x), mỗi bước chuyển đổi chỉ được **thêm** trường mới hoặc giá trị mặc định mới. Không được đổi tên, xóa hay đổi ý nghĩa của trường đã có. Muốn thay đổi kiểu phá vỡ tương thích thì phải lên major version mới (2.0). Có test kiểm tra mọi bước chuyển đổi đều tuân theo quy tắc này.
- **Khi quay về bản cũ** (rollback tự động hoặc người dùng tự hạ phiên bản), `config.json` vẫn là **file làm việc duy nhất**:
  - Bản cũ gặp `schemaVersion` cao hơn mức nó hỗ trợ thì vẫn đọc các trường nó biết và giữ nguyên mọi trường lạ.
  - Khi ghi, nó giữ nguyên `schemaVersion` cao hơn đó. Sanitizer của cả trang lẫn daemon không được xóa trường lạ.
  - Sửa đổi người dùng làm trên bản cũ được lưu bình thường. Lên lại bản mới cũng không mất gì: không có bước chuyển đổi nào chạy lại (schema đã đúng), và các trường mới vẫn còn nguyên.
  - Hệ quả: hạ phiên bản không làm mất dữ liệu của bên nào.
- **Sao lưu chỉ để phòng xa.** Trước khi ghi một config có `schemaVersion` cao hơn lần đầu tiên, daemon ghi `backups/config.schema<N>.json`, mỗi schema giữ tối đa 3 bản. Daemon không bao giờ tự khôi phục bản sao lưu. Người dùng có thể khôi phục thủ công bằng `agy-theme doctor --restore-backup <file>`.
- **ID không tồn tại không phải là migration.** Config trỏ tới wallpaper, mascot, sticker, bubble hay bundle không còn trong registry (ví dụ pack tạm thời vắng mặt) thì **lúc render dùng giá trị mặc định, nhưng không ghi đè config**. Pack quay lại thì lựa chọn cũ của người dùng vẫn còn.

### 5.5 Chế độ an toàn

**Phía trang (bundle)**
- Bọc `controller.init()`, `mountNow()`, `refreshAll()`, `applyBundle()` và handler `MutationObserver` của `SurfaceEngine` trong một guard chung.
- Khi gặp lỗi:
  1. Gỡ sạch mọi thứ đã tiêm, dùng lại `destroy()` hiện có, để Antigravity về giao diện gốc.
  2. Hiện một nút nhỏ dựng bằng DOM thuần, tạo trong một `try` riêng, có thể tắt: *"Theme đã tự tắt do lỗi. [Thử lại] [Kiểm tra cập nhật]"*.
  3. Gửi qua bridge `{ type: 'health', status: 'error', version, stage, message }`. `message` được cắt ngắn và không chứa nội dung chat.
- **Dò mốc DOM.** Khoảng 5 giây sau khi mount, kiểm tra một danh sách mốc `DT_COMPAT_LANDMARKS` trong `dom-targets.js` (sidebar, khung header, composer…).
  - Thiếu mốc thì gửi `status: 'degraded'` kèm danh sách mốc thiếu. **Theme vẫn chạy.** Theme Studio hiện cảnh báo *"Antigravity vừa đổi giao diện, một số phần có thể hiển thị sai"* kèm nút kiểm tra cập nhật.
  - Đủ mốc thì gửi `status: 'ok'`.

**Phía daemon**
- Ghi health mới nhất vào `health.json`.
- Nếu **3 lần tiêm liên tiếp** của cùng một version đều gửi về `error`, daemon ngừng tiêm version đó và ghi lý do. Daemon chỉ tiêm lại khi:
  - một version khác được cài;
  - người dùng chạy `agy-theme enable`;
  - người dùng bấm "Thử lại", gửi `{ type: 'safe-mode-reset' }`.
- **Tắt khẩn cấp.** `agy-theme disable` ghi `disabled: true` vào `host-state.json`, tách khỏi `config.enabled` của người dùng. Daemon gỡ theme khỏi mọi target đang mở (dùng lại `teardownTarget`) và ngừng tiêm. `enable` làm ngược lại.

### 5.6 Cập nhật một nút có ký số

**Kiểm tra bản mới**
- Daemon kiểm tra lúc khởi động, sau đó cứ 24 giờ một lần, hoặc khi người dùng bấm "Kiểm tra".
- Gọi `GET https://registry.npmjs.org/antigravity-custom-theme` với header `Accept: application/vnd.npm.install-v1+json`, lấy `dist-tags.latest`, `dist.tarball` và `dist.integrity`. Request không gửi dữ liệu nào của người dùng.
- Chỉ chấp nhận version dạng `x.y.z` (bỏ qua prerelease) và **lớn hơn** version đang chạy.
- Kết quả lưu vào `update-state.json`.
- Lỗi mạng chỉ hiện "Không kiểm tra được", không báo lỗi to.

**Định dạng chữ ký** (file `antigravity-custom-theme-<ver>.tgz.sig` trên GitHub Release `v<ver>`)

```json
{ "name": "antigravity-custom-theme", "version": "1.2.0", "integrity": "sha512-<base64>", "keyId": "<8 ký tự đầu SHA-256 của public key>", "sig": "<base64>" }
```

Thông điệp được ký là chuỗi UTF-8 `antigravity-custom-theme@1.2.0\nsha512-<base64>\n`. Chữ ký buộc chặt tên, phiên bản và nội dung tarball với nhau, nên không thể lấy một bản cũ đã ký để đóng giả bản mới.

**Cài bản mới** (chỉ khi người dùng bấm nút trong Theme Studio, hoặc chạy `agy-theme update`)
1. Tải tarball về `updates/`.
2. Tính SHA-512 và đối chiếu với `dist.integrity` của registry.
3. Tải file `.sig` lần lượt từ danh sách nguồn ghi cứng trong `daemon/release-key.mjs`, dừng ở nguồn đầu tiên tải được:
   1. `https://github.com/VinhDat267/antigravity-custom-theme-releases/releases/download/v<ver>/`: repo chỉ chứa release, không có code và không có One Piece. Đây là nguồn chính, cố định lâu dài.
   2. `https://github.com/VinhDat267/antigravity-custom-theme/releases/download/v<ver>/`: nguồn dự phòng.

   Có nhiều nguồn vẫn an toàn, vì chữ ký tự chứng minh là thật, không phụ thuộc nơi chứa. Mỗi bản mới có thể bổ sung nguồn cho các lần cập nhật sau.
4. Kiểm tra `name`, `version` và `integrity` trong `.sig` khớp với những gì vừa tải. Sau đó `crypto.verify(null, msg, RELEASE_PUBLIC_KEY, sig)`.
   - Khóa công khai là hằng số trong `daemon/release-key.mjs`.
   - Bước nào sai thì **dừng hẳn**, xóa file tạm và báo lý do.
5. Chép updater sang `updates/updater.mjs`, rồi chạy nó dưới dạng process tách rời, với `cwd` là `updates/`, để npm thay được thư mục gói. Daemon tự dừng.
6. Updater chạy `npm i -g "<đường dẫn tarball đã kiểm tra>"`. Lệnh `npm` lấy từ cùng thư mục với `process.execPath`, không có thì tìm trong PATH. Tarball đã kiểm tra chính là thứ được cài.
7. Updater chạy `agy-theme start` rồi chờ tối đa 20 giây để daemon mới ghi `daemon.pid` và báo đúng version mới.
8. **Quay về bản cũ** nếu bước 6 hoặc 7 thất bại: `npm i -g antigravity-custom-theme@<bản cũ>`, rồi khởi động lại daemon.
   - Version trên npm không sửa được sau khi publish, nên bản cũ lấy từ registry vẫn đúng là bản người dùng từng chạy.
   - Kết quả ghi vào `update-state.json`.

**Giao diện**
- Tab Nâng cao của Theme Studio có một dòng: *"Phiên bản 1.2.0 · Có bản 1.3.0 · [Cập nhật] · Xem thay đổi"*. "Xem thay đổi" mở trang GitHub Release.
- Launcher có một chấm nhỏ khi có bản mới.
- Trong lúc cập nhật, trạng thái hiện lần lượt: đang tải → đang kiểm tra chữ ký → đang cài → đang khởi động lại. Kết thúc là thành công, hoặc *"Thất bại: <lý do>. Đã giữ bản 1.2.0"*.
- Sau khi cập nhật, daemon mới tiêm bundle mới. Bundle cũ được gỡ bằng `destroy()` như hiện tại.

**Kênh giữa trang và daemon**
- Trang → daemon: `{ type: 'update-check' }` và `{ type: 'update-apply', version }` qua `__agyThemeBridge` hiện có. Script khác trong trang có gọi `update-apply` cũng vô hại, vì daemon chỉ cài bản đã ký và mới hơn.
- Daemon → trang: trạng thái gửi qua `window.__AGY_CUSTOM_THEME__.onHostEvent(...)` bằng `Runtime.evaluate`, và cũng có trong `__AGY_THEME_BOOT__.host` mỗi lần tiêm.

**Chế độ source:** nút cập nhật bị ẩn, thay bằng dòng *"Đang chạy từ mã nguồn, cập nhật bằng git pull"*. `agy-theme update` cũng từ chối chạy.

**Mất hoặc đổi khóa:** cần phát hành một bản có khóa mới. Người dùng đang giữ khóa cũ sẽ thấy *"Không xác minh được bản cập nhật"* kèm hướng dẫn chạy `npm i -g antigravity-custom-theme@latest` một lần. Ghi rõ điều này trong SECURITY.md.

### 5.7 Quy trình phát hành (chạy trên máy chủ repo, không chạy trên CI)

- `agy-theme release keygen`:
  - sinh cặp khóa Ed25519;
  - ghi khóa bí mật (PEM) ra một đường dẫn chủ repo chọn **ngoài repo**, và từ chối ghi vào trong thư mục repo;
  - in khóa công khai và `keyId` để dán vào `daemon/release-key.mjs`.
- `agy-theme release pack --key <đường dẫn>` lần lượt:
  1. chạy `node --test`;
  2. build có kiểm tra cú pháp;
  3. chạy `npm pack`;
  4. **chạy guard chặn nội dung riêng** trên tarball: không có file nào thuộc `packs/`, và `dist/` không chứa ID nào trong denylist của mục 5.8;
  5. ký và ghi ra `.tgz` cùng `.tgz.sig`.
- **Thứ tự đăng (ghi trong RELEASING.md, `release publish` chạy giúp các bước 1–3 và dừng lại chờ bước 4):**
  1. `gh release create v<ver> <tgz> <sig> --repo VinhDat267/antigravity-custom-theme-releases --notes-file <phần CHANGELOG>`;
  2. cũng lệnh đó với `--repo VinhDat267/antigravity-custom-theme` (nguồn dự phòng);
  3. tải lại `.sig` từ nguồn chính và kiểm tra lại chữ ký;
  4. `npm publish <tgz>`, với tài khoản npm bật 2FA và nhập mã OTP.

  Chữ ký phải có trên **cả hai** repo **trước** khi người dùng thấy version mới trên npm.
- Không lưu khóa hay token npm trong GitHub Secrets.

### 5.8 Gói nội dung (content pack) và One Piece

**Registry**
- Thêm module mới `src/core/pack-registry.js` vào `MODULE_ORDER`, ngay trước `index.js`.
- Hàm `applyQueuedPacks()` đọc `window.__AGY_THEME_PACK_QUEUE__` và gộp nội dung vào `WALLPAPERS`, `MASCOT_TEMPLATES`, `STICKER_TEMPLATES`, `BUBBLE_PRESETS`, `INPUT_PRESETS`, `THEME_BUNDLES` và câu thoại của pet (`FX_PET_QUIPS`).
- `index.js` gọi hàm này trước khi tạo `CustomThemeController`.
- Định dạng một pack: `{ id, name, version, wallpapers: [], mascots: {}, stickers: {}, bubbles: [], inputs: [], bundles: [], quips: {} }`.
- **Trùng ID thì bản tích hợp thắng**: mục của pack bị bỏ qua, có cảnh báo trên console và trong health.

**Daemon**
- `prepareBundleSource` đọc `<home>/packs/*/pack.js` theo thứ tự tên.
- Mỗi pack được bọc trong `try/catch` riêng, đặt giữa phần boot và bundle chính. Pack hỏng không chặn được theme.
- Chữ ký file của các pack được tính vào cache và vào cơ chế hot-reload.
- Pack là code JS cục bộ, không ký. README ghi rõ chỉ cài pack từ nguồn tin cậy.

**Build pack**
- `agy-theme pack build <thư mục nguồn>` dùng lại logic của `scripts/build.mjs`: bỏ cú pháp module, nén code, nhúng ảnh `.webp`/`.png`/`.svg` thành `data:` URI.
- Kết quả ghi vào `<home>/packs/<id>/pack.js`.

**Chuyển One Piece sang pack**
- Gồm 20 mục:
  - bundle: `one-piece-sunny-sunset`, `one-piece-grand-line-bounty`, `one-piece-gear5-nika`;
  - hình nền: `one-piece-sunny-sunset`, `one-piece-grand-line-map`, `one-piece-nika-moon`;
  - mascot: `chopper-chibi`, `thousand-sunny`, `luffy-chibi`, `luffy-gear5`, `luffy-anime`, `luffy-gear5-anime`;
  - sticker: `mu-rom`, `jolly-roger`, `log-pose`;
  - bubble: `mu-rom-hai-tac`, `lenh-truy-na`, `gear5-nika`;
  - input: `dai-duong-sunny`, `nika-liberation`.
- Kèm theo: câu thoại tương ứng trong `pet-stage.js`, hai file `assets/pets/*.webp`, và 4 tài liệu One Piece / anime Luffy trong `docs/superpowers/`.
- Tất cả chuyển vào `packs/one-piece/` trong repo. Thêm `packs/` vào `.gitignore`.
- **Giữ nguyên ID** để config hiện có của chủ repo vẫn chạy sau khi build và cài pack.

**Guard**
- Denylist ID và từ khóa: `one-piece`, `luffy`, `chopper`, `thousand-sunny`, `nika`, `gear5`, `jolly-roger`, `mu-rom`, `log-pose`, `truy-na`, `dai-duong-sunny`.
- So khớp **không phân biệt hoa thường và theo nguyên từ**: một từ trong denylist chỉ khớp khi nó không dính liền với chữ cái hay chữ số khác. Không so khớp chuỗi con, vì `luffy` nằm trong `fluffy` (câu thoại của pet hồ ly nguyên bản).
- Có test kiểm tra `dist/` build từ `src/` và danh sách file của `npm pack --dry-run --json`.

**Test**
- Các test đang dùng ID One Piece (thuộc `build`, `cdp-daemon`, `fx-companions`, `presets`, `surface-engine`, `theme-studio`) chuyển sang dùng một pack mẫu nguyên bản trong `test/fixtures/packs/sample/`. Pack mẫu có mascot dạng ảnh để thay cho test của Luffy WebP.

### 5.9 Tài liệu và CI

**Tài liệu**
- **README** viết lại cho người dùng cuối, song ngữ VI/EN:
  - yêu cầu hệ thống;
  - cài, cập nhật, gỡ;
  - tắt khẩn cấp;
  - `agy-theme doctor`;
  - **quyền riêng tư**: chỉ kết nối tới `registry.npmjs.org` và `github.com` để kiểm tra và tải bản cập nhật, không gửi dữ liệu;
  - gói nội dung;
  - dòng tuyên bố không liên kết với Google.
- Phần dành cho dev chuyển sang `CONTRIBUTING.md`.
- **CHANGELOG.md** theo định dạng Keep a Changelog.
- **RELEASING.md** (mục 5.7).
- **SECURITY.md**: cách báo lỗ hổng, `keyId` của khóa đang dùng, hướng dẫn khi đổi khóa.
- **LICENSE**: MIT (đề xuất, chờ chủ repo xác nhận).
- Cập nhật **AGENTS.md** và **SKILL.md** theo cấu trúc mới, đồng thời sửa tên binding thành `__agyThemeBridge`.

**CI**
- Ma trận Node `22.x` và `24.x`, chạy trên Windows và Ubuntu.
- Các bước: `node --test` (đã gồm các test guard), build có kiểm tra cú pháp, `npm pack --dry-run`.
- CI không phát hành và không giữ bí mật nào.

## 6. Kiểm thử và tiêu chí hoàn thành

- `node --test` pass 100%, có thêm test cho:
  - các bước chuyển đổi config;
  - rollback không làm mất trường lạ;
  - ID không tồn tại thì render mặc định nhưng không ghi đè config;
  - kiểm tra chữ ký: đúng, sai chữ ký, sai `integrity`, sai version, version cũ hơn, khóa khác;
  - so sánh semver;
  - nhận biết chế độ installed/source;
  - chuyển dữ liệu cũ;
  - nạp pack: pack hỏng, trùng ID;
  - guard chặn nội dung riêng;
  - guard của trang khi khởi động bị lỗi;
  - đếm số lần lỗi để vào safe mode;
  - `disable`/`enable`.
- Có thể dùng bộ khóa test sinh ngay khi chạy test.
- **Kiểm thử end-to-end thủ công** trên Windows với Antigravity thật, ghi lại trong PR:
  1. `npm pack` rồi `npm i -g <tgz>`, `agy-theme setup`, thấy theme;
  2. cập nhật từ bản A lên bản B bằng nút (dùng registry giả hoặc biến môi trường trỏ URL sang server cục bộ, xem mục 7), cấu hình giữ nguyên;
  3. `.sig` sai thì bị từ chối;
  4. ép lỗi lúc khởi động thì Antigravity về giao diện gốc và hiện nút báo lỗi;
  5. `agy-theme uninstall` dọn sạch;
  6. cài pack One Piece trên máy chủ repo, config cũ hoạt động lại.
- `node cli.mjs verify` vẫn `PASS` ở chế độ source.

## 7. Để builder tự quyết

- Bố cục file mới (`daemon/updater.mjs`, `daemon/release-key.mjs`, `scripts/release.mjs`, `scripts/pack-build.mjs`…), miễn giữ đúng tên lệnh CLI ở mục 5.1.
- Cách cho test và kiểm thử thủ công trỏ registry/GitHub sang server cục bộ, ví dụ biến môi trường `AGY_THEME_REGISTRY_URL` và `AGY_THEME_RELEASE_BASE_URL`, chỉ đọc khi có thêm `AGY_THEME_DEV=1`.
- Ngưỡng và thời gian chờ: 5 giây dò mốc, 20 giây health check, 3 lần lỗi, giới hạn kích thước pack.
- Danh sách chính xác của `DT_COMPAT_LANDMARKS`.
- Cách chạy ẩn lúc khởi động. VBS như hiện tại là mặc định. Có thể thay bằng cách khác nếu không cần quyền admin và không hiện cửa sổ console.
- Vị trí và cách trình bày dòng phiên bản / cập nhật trong Theme Studio, theo phong cách UI hiện có và có i18n VI/EN.
- Chia công việc thành nhiều PR theo thứ tự phụ thuộc. Gợi ý: thư mục dữ liệu và version → safe mode → pack và tách One Piece → gói npm, setup và uninstall → updater và release → tài liệu.

## 8. Việc còn để ngỏ (chủ repo quyết sau)

- **Lịch sử git** vẫn còn file One Piece trong các commit cũ. Hai hướng: viết lại lịch sử, hoặc tạo repo phát hành mới. Không chặn bản phát hành đầu tiên.
- **LICENSE MIT**: chờ xác nhận.
- **Việc của chủ repo**:
  - tạo tài khoản npm và bật 2FA cho cả publish;
  - chạy `release keygen` và sao lưu khóa bí mật ở ít nhất hai nơi offline;
  - tạo repo công khai `VinhDat267/antigravity-custom-theme-releases` (chỉ có README trỏ về repo chính) trước lần phát hành đầu tiên.
