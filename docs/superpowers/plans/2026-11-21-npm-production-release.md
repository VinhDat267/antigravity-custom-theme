# Phát hành Production qua npm — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến bộ theme thành gói npm `antigravity-custom-theme` mà người khác cài bằng `npm i -g` rồi `agy-theme setup`. Gói có cập nhật một nút được ký Ed25519, chế độ an toàn, config có số phiên bản, và tách nội dung One Piece thành pack cục bộ.

**Architecture:**
- Giữ nguyên kiến trúc hiện tại: daemon CDP tiêm một bundle IIFE duy nhất.
- Thêm các lớp sau:
  - thư mục dữ liệu `%LOCALAPPDATA%\AntigravityCustomTheme`;
  - nhận biết chế độ chạy source / installed / unmanaged;
  - registry pack nạp lúc chạy;
  - guard an toàn ở phía trang và bộ đếm lỗi ở phía daemon;
  - updater tách rời: kiểm tra chữ ký tách rời trên GitHub Releases, rồi `npm i -g <tarball đã kiểm tra>`, lỗi thì rollback.
- Chia thành 6 phase. **Mỗi phase là một PR riêng**, merge được độc lập theo thứ tự.

**Tech Stack:** Node.js ≥ 22.4 ESM, chỉ dùng built-in (`node:test`, `node:crypto` Ed25519/SHA-512, `fetch`, `child_process`), PowerShell COM `WScript.Shell` cho shortcut, VBS cho chạy ẩn.

**Spec:** [`docs/superpowers/specs/2026-11-21-npm-production-release-design.md`](../specs/2026-11-21-npm-production-release-design.md). Người thực thi đọc spec và kế hoạch này song song.

**Nhánh làm việc:** `feat/npm-release-p<N>-<tên>` cho từng phase, cắt từ `main` sau khi phase trước đã merge.

## Global Constraints

- Node `>= 22.4`, **không thêm bất kỳ dependency npm nào** (`package.json` không có `dependencies` hay `devDependencies`).
- Mọi ràng buộc trong `AGENTS.md` vẫn áp dụng:
  - `MODULE_ORDER` phải được cập nhật khi thêm file vào `src/`;
  - tên định danh cấp cao nhất không trùng nhau giữa các file `src/`;
  - Zero Live Blur, ngân sách 120Hz, giữ nguyên `--agy-hole-clip`;
  - không có đường dẫn đặc thù của máy cụ thể trong source, preset, test hay JSON export.
- Chỉ hỗ trợ Windows (`"os": ["win32"]`). Code không phải Windows chỉ cần giữ cho test chạy được trên Ubuntu CI.
- Tên gói `antigravity-custom-theme`, bin `agy-theme`.
- Thư mục dữ liệu `%LOCALAPPDATA%\AntigravityCustomTheme\`, ghi đè được bằng `AGY_THEME_HOME`.
- Không telemetry. Mạng chỉ dùng tới `registry.npmjs.org` và `github.com`, và chỉ để kiểm tra / tải bản cập nhật.
- Chữ ký: thông điệp `antigravity-custom-theme@<ver>\nsha512-<base64>\n`. Nguồn `.sig` theo thứ tự:
  1. `https://github.com/VinhDat267/antigravity-custom-theme-releases/releases/download/v<ver>/`
  2. `https://github.com/VinhDat267/antigravity-custom-theme/releases/download/v<ver>/`
- Version chỉ dạng `x.y.z`, bỏ qua prerelease.
- Ngưỡng: dò mốc DOM 5 giây sau mount, chờ daemon mới 20 giây, 3 lỗi liên tiếp thì chặn version, mỗi pack tối đa 5 MB, mỗi schema giữ 3 bản backup.
- Chuyển đổi config trong 1.x **chỉ được thêm**. Sanitizer không xóa trường lạ khi được gọi với `preserveUnknown`.
- Denylist nội dung riêng, so khớp không phân biệt hoa thường và theo nguyên từ: `one-piece`, `luffy`, `chopper`, `thousand-sunny`, `nika`, `gear5`, `jolly-roger`, `mu-rom`, `log-pose`, `truy-na`, `dai-duong-sunny`.
- Hoàn thành mỗi task: `node --test` có 0 failure, `node cli.mjs build` báo `[syntax OK]`. Phase nào đụng UI hoặc bundle thì chạy thêm `node cli.mjs verify` khi Antigravity đang mở.

## Review Focus

1. **Chạy `setup` khi Antigravity chưa mở** (không có `DevToolsActivePort`): setup vẫn thành công, daemon chạy và chờ. → test trong Task 11.
2. **Daemon cũ còn sống khi updater chạy `npm i -g`**: updater phải chờ PID cũ thoát rồi mới cài, để tránh khóa file trên Windows. → test trong Task 15.
3. **Máy offline hoặc sau proxy chặn mạng**: kiểm tra cập nhật trả `unreachable`, không throw, không làm hỏng daemon. → test trong Task 14.
4. **Tên user Windows có dấu cách hoặc tiếng Việt** (`C:\Users\Nguyễn Văn A`): VBS và shortcut vẫn chạy. VBS phải ghi bằng UTF-16LE có BOM vì WSH không đọc UTF-8. → test trong Task 11.
5. **`config.json` hỏng** (mất điện giữa chừng lúc ghi): daemon cách ly file hỏng thành `config.corrupt-<ts>.json` trước khi ghi file mới, và không chuyển dữ liệu cũ đè lên. → test trong Task 2 và Task 4.

---

## Phase 1 — Nền móng: thư mục dữ liệu, version, schema config

### Task 1: Đường dẫn dữ liệu và chế độ chạy

**Files:**
- Create: `daemon/paths.mjs`
- Test: `test/paths.test.mjs`

**Interfaces:**
- Produces:
  - `PACKAGE_NAME = 'antigravity-custom-theme'`
  - `resolveThemeHome({ env = process.env, platform = process.platform, homedir = os.homedir() } = {}) -> string`
  - `homePaths(home: string) -> { config, mediaDir, packsDir, pid, log, cmd, cmdAck, health, hostState, updateState, hostVersion, updatesDir, backupsDir }`. Tên file lần lượt: `config.json`, `media`, `packs`, `daemon.pid`, `daemon.log`, `daemon-cmd.json`, `daemon-cmd-ack.json`, `health.json`, `host-state.json`, `update-state.json`, `host-version.json`, `updates`, `backups`.
  - `readPackageVersion(rootDir: string) -> string`
  - `detectRunMode({ rootDir, npmGlobalPrefix, realpath = fs.realpathSync, exists = fs.existsSync }) -> 'source' | 'installed' | 'unmanaged'`

- [ ] **Step 1: Viết test lỗi**

```js
test('resolveThemeHome honors AGY_THEME_HOME, then LOCALAPPDATA on win32', () => {
  assert.equal(resolveThemeHome({ env: { AGY_THEME_HOME: 'X:\\h' }, platform: 'win32' }), 'X:\\h');
  assert.equal(resolveThemeHome({ env: { LOCALAPPDATA: 'C:\\L' }, platform: 'win32' }), path.join('C:\\L', 'AntigravityCustomTheme'));
  assert.equal(resolveThemeHome({ env: {}, platform: 'linux', homedir: '/home/u' }), path.join('/home/u', '.agy-custom-theme'));
});
test('detectRunMode: .git => source; realpath under npm prefix => installed; other node_modules => unmanaged', () => { /* dùng realpath/exists giả */ });
test('readPackageVersion returns package.json version', () => { /* thư mục tmp có package.json { version: "9.8.7" } */ });
```

- [ ] **Step 2:** Chạy `node --test test/paths.test.mjs`. Kết quả mong đợi: FAIL (module không tồn tại).
- [ ] **Step 3: Cài đặt `daemon/paths.mjs`**
  - `detectRunMode`:
    - có `<rootDir>/.git` thì là `source`;
    - `realpath(rootDir) === realpath(<npmGlobalPrefix>/node_modules/antigravity-custom-theme)` thì là `installed`;
    - đường dẫn chứa `node_modules` thì là `unmanaged`;
    - còn lại là `source`.
- [ ] **Step 4:** Chạy lại test. Kết quả mong đợi: PASS.
- [ ] **Step 5:** Commit `feat(paths): add theme home resolution and run-mode detection`.

### Task 2: Dùng thư mục dữ liệu mới và chuyển dữ liệu cũ

**Files:**
- Create: `daemon/migrate-legacy.mjs`
- Modify:
  - `cli.mjs:27-28` (bỏ `USER_DATA_DIR = path.join(ROOT_DIR, 'user-data')`)
  - `daemon/cdp-daemon.mjs`: các giá trị mặc định `path.join(resolvedRoot, 'user-data')` trong `prepareBundleSource`, `runOneShotInject`, `runOneShotCommand`, `getDaemonStatus`, `runDaemon`
- Test: `test/migrate-legacy.test.mjs`, cập nhật `test/cdp-daemon.test.mjs`

**Interfaces:**
- Consumes: `resolveThemeHome`, `homePaths` (Task 1).
- Produces: `migrateLegacyUserData({ legacyDir: string, homeDir: string, log?: (line) => void }) -> { migrated: boolean, reason: 'ok' | 'no-legacy' | 'home-config-present' | 'same-dir' }`

- [ ] **Step 1: Viết test lỗi**

```js
test('migrates config.json and media/*.dat when home has no config', ...);              // migrated: true; nguồn còn nguyên
test('does not migrate when home already has config.json, even if corrupt', ...);      // reason 'home-config-present'; nội dung file hỏng giữ nguyên
test('no legacy dir => reason no-legacy; same path => same-dir', ...);
test('daemon defaults resolve to resolveThemeHome() instead of <root>/user-data', ...); // getDaemonStatus().pidFile nằm dưới AGY_THEME_HOME
```

- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL.
- [ ] **Step 3: Cài đặt `migrateLegacyUserData` và nối vào code**
  - Mọi giá trị mặc định `userDataDir` chuyển thành `resolveThemeHome()`.
  - Ở chế độ source, `cli.mjs` gọi `migrateLegacyUserData({ legacyDir: <ROOT>/user-data, homeDir })` trước `start` và `inject`.
- [ ] **Step 4:** Chạy `node --test`. Kết quả mong đợi: PASS hết. Test cũ nào phụ thuộc `user-data` thì đặt `AGY_THEME_HOME` vào thư mục tmp.
- [ ] **Step 5:** Commit `feat(daemon): store user data under theme home with one-time legacy migration`.

### Task 3: Một nguồn version duy nhất

**Files:**
- Modify:
  - `src/index.js:412` (`version: '1.0.0'` thành `version: '__AGY_THEME_VERSION__'`)
  - `scripts/build.mjs` (`buildBundle`)
  - `cli.mjs` (thêm `--version`)
- Test: `test/build.test.mjs`

**Interfaces:**
- Consumes: `readPackageVersion` (Task 1).
- Produces: `buildBundle` thay mọi chuỗi `'__AGY_THEME_VERSION__'` bằng version trong `<rootDir>/package.json`. Lệnh `agy-theme --version` in ra version đó.

- [ ] **Step 1:** Viết test lỗi `bundle exposes package.json version on window.__AGY_CUSTOM_THEME__.version`: build repo thật, chạy trong vm sandbox như test `real repo bundle compiles cleanly...`, so với `JSON.parse(package.json).version`.
- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL (`'__AGY_THEME_VERSION__'` hoặc `'1.0.0'`).
- [ ] **Step 3:** Cài đặt việc thay token trong `buildBundle`, và nhánh `--version` trong `cli.mjs`.
- [ ] **Step 4:** Chạy `node --test`. Kết quả mong đợi: PASS.
- [ ] **Step 5:** Commit `feat(build): inject package.json version into bundle`.

### Task 4: Schema config, chuyển đổi chỉ-thêm, giữ trường lạ, backup

**Files:**
- Modify:
  - `src/core/config-store.js` (`DEFAULT_CONFIG`, `loadConfig`, `sanitizeImportedConfig`)
  - `daemon/cdp-daemon.mjs` (`persistBridgeMessage`, `loadBootPayload`)
- Test: `test/config-store.test.mjs`, `test/cdp-daemon.test.mjs`

**Interfaces:**
- Produces:
  - `CONFIG_SCHEMA_VERSION = 1`; `DEFAULT_CONFIG.schemaVersion = 1`
  - `CONFIG_MIGRATIONS: Array<{ from: number, to: number, up(cfg) -> cfg }>`, bắt đầu bằng `{ from: 0, to: 1 }` (chỉ gán `schemaVersion: 1`)
  - `migrateConfig(raw) -> { config, fromVersion: number, toVersion: number, migrated: boolean }`: thiếu `schemaVersion` thì coi là 0; lớn hơn `CONFIG_SCHEMA_VERSION` thì trả nguyên trạng.
  - `sanitizeImportedConfig(raw, { preserveUnknown = false } = {})`: khi `preserveUnknown`, chép lại các key (kể cả lồng nhau, trong plain object) mà sanitizer không sinh ra. Bỏ `__proto__`, `constructor`, `prototype`. Chỉ giữ giá trị JSON. Phần giữ lại tối đa 64 KB khi serialize, vượt thì bỏ phần thừa. `schemaVersion` luôn được giữ dưới dạng số nguyên ≥ 0.
  - `backupConfigBeforeSchemaBump(homeDir, existingRaw, nextSchema) -> string | null`: ghi `backups/config.schema<old>.<ts>.json`, mỗi schema giữ 3 bản mới nhất.

- [ ] **Step 1: Viết test lỗi**

```js
test('every CONFIG_MIGRATIONS step is additive', () => {
  // với mỗi bước: input = fixture của schema `from`; output = up(clone(input))
  // mọi đường dẫn lá trong input vẫn tồn tại trong output với cùng giá trị (deepEqual từng lá)
});
test('migrateConfig upgrades missing schemaVersion to 1 and leaves higher schema untouched', ...);
test('sanitizeImportedConfig preserveUnknown keeps unknown nested keys and drops __proto__', () => {
  const out = sanitizeImportedConfig({ schemaVersion: 3, futureFlag: true, pet: { futureMood: 'happy' }, ['__proto__']: { x: 1 } }, { preserveUnknown: true });
  assert.equal(out.schemaVersion, 3); assert.equal(out.futureFlag, true); assert.equal(out.pet.futureMood, 'happy');
  assert.equal(({}).x, undefined);
});
test('sanitizeImportedConfig without preserveUnknown still drops unknown keys (import path)', ...);
test('persistBridgeMessage never lowers schemaVersion and keeps unknown fields', ...);       // file có 3, message có 1 => file vẫn 3, trường lạ còn
test('persistBridgeMessage writes one backup before the first schema bump, max 3 per schema', ...);
test('persistBridgeMessage quarantines a corrupt config.json before writing', ...);          // Review Focus 5: có config.corrupt-<ts>.json
test('unknown preset ids render defaults without rewriting config', ...);                    // buildStylesheet với bubbleId 'missing' không throw; config gửi vào không bị đổi
```

- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL.
- [ ] **Step 3: Cài đặt**
  - `loadConfig` chạy `migrateConfig` trước khi merge.
  - `persistBridgeMessage` gọi `sanitizeImportedConfig(msg.data, { preserveUnknown: true })`, lấy `schemaVersion = max(existing, next)`, gọi backup trước lần nâng schema đầu tiên, và cách ly file hỏng khi `readJsonSafe` trả `null` mà file vẫn tồn tại.
  - `loadBootPayload` cũng dùng `preserveUnknown: true`.
- [ ] **Step 4:** Chạy `node --test`. Kết quả mong đợi: PASS.
- [ ] **Step 5:** Commit `feat(config): add schemaVersion, additive migrations, unknown-field preservation and backups`.

---

## Phase 2 — Chế độ an toàn

### Task 5: Guard phía trang, nút báo lỗi, dò mốc DOM

**Files:**
- Create: `test/helpers/dom-stub.mjs` (tách `createDomStubEnvironment` và `findFirst` từ `test/theme-studio.test.mjs:14-160` ra dùng chung)
- Modify:
  - `src/core/config-store.js` (export `emitBridgeMessage(message, envWindow)`, đổi tên từ `csEmitBridge`)
  - `src/core/dom-targets.js` (thêm landmarks)
  - `src/core/surface-engine.js:1105-1186` (bọc callback rAF của `scheduleScan`)
  - `src/index.js` (guard)
  - `src/ui/theme-studio.js` (banner)
  - `src/ui/i18n.js`
- Test: `test/safe-mode.test.mjs`

**Interfaces:**
- Produces:
  - `DT_COMPAT_LANDMARKS: Array<{ key: string, selector: string }>`. Tối thiểu có các key `shell`, `sidebar`, `composer`; selector cụ thể do builder chọn theo DOM thật.
  - `dtProbeCompatLandmarks(doc = document) -> string[]`: trả các key bị thiếu.
  - `SurfaceEngine` nhận thêm option `onFatalError(stage: string, error)`. Callback rAF bọc `try` và gọi `onFatalError('scan', err)`.
  - `CustomThemeController.failSafe(stage, error)`:
    - gọi `destroy()` trong `try`;
    - xóa `[data-agy-ct-injected]`, `#agy-ct-styles`, `#agy-ct-studio-root`;
    - gán `window.__AGY_CUSTOM_THEME__.safeMode = { stage, message }`;
    - hiện `#agy-ct-safe-notice`;
    - gửi `{ type: 'health', status: 'error', version, stage, message }`, `message` tối đa 200 ký tự.
  - Bọc guard quanh các stage `init`, `mount`, `refresh`, `bundle`, `config`, `scan`.
  - Nút trong notice:
    - "Thử lại" gửi `{ type: 'safe-mode-reset' }`;
    - "Kiểm tra cập nhật" gửi `{ type: 'update-check' }`.
  - 5000 ms sau khi mount, gửi `{ type: 'health', status: 'ok' | 'degraded', version, missing: string[] }`. Gán `controller.compatMissing`. ThemeStudio có option `getCompatMissing()` và vẽ banner khi mảng không rỗng.
  - i18n VI/EN: `safeModeNotice`, `retryBtn`, `checkUpdateBtn`, `compatWarning`.

- [ ] **Step 1: Viết test lỗi** (chạy bundle thật trong dom-stub)

```js
test('mount failure tears down, sets safeMode, shows notice and emits health error', ...); // stub: document.head.appendChild ném lỗi
test('scan failure inside rAF triggers failSafe("scan")', ...);
test('notice buttons emit safe-mode-reset and update-check over the bridge', ...);
test('dtProbeCompatLandmarks returns missing keys; healthy mount emits status ok after 5000ms', ...); // giả lập timer
test('studio shows compat banner when compatMissing is non-empty', ...);
```

- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL.
- [ ] **Step 3:** Cài đặt theo Interfaces. Notice dựng bằng DOM thuần trong một `try` riêng, có `data-agy-ct-injected="true"` để `teardownTarget` dọn được.
- [ ] **Step 4:** Chạy `node --test` và `node cli.mjs build`. Kết quả mong đợi: PASS, `[syntax OK]`.
- [ ] **Step 5:** Commit `feat(safe-mode): guard page lifecycle, fail open to native UI and probe DOM landmarks`.

### Task 6: Bộ đếm lỗi của daemon và bật/tắt khẩn cấp

**Files:**
- Create: `daemon/health.mjs`
- Modify:
  - `daemon/cdp-daemon.mjs`: `ensureHostBridge` nhận thêm `onMessage`; `persistBridgeMessage` trả `'health'` / `'safe-mode-reset'`; `syncTargets` kiểm tra điều kiện tiêm; `handleCommands` thêm `disable` / `enable`
  - `cli.mjs` (lệnh `enable` / `disable`)
- Test: `test/health.test.mjs`, `test/cdp-daemon.test.mjs`

**Interfaces:**
- Consumes: `homePaths` (Task 1), `readPackageVersion` (Task 1).
- Produces:
  - `recordHealth(homeDir, msg, { now = Date.now() } = {}) -> HealthState`. `HealthState = { version, consecutiveErrors, lastStatus, lastStage, lastMessage, missing, updatedAt, blockedVersion }`.
  - `resetSafeMode(homeDir) -> HealthState`
  - `readHostState(homeDir) -> { disabled: boolean }`
  - `writeHostState(homeDir, patch) -> { disabled: boolean }`
  - `shouldInject({ hostState, health, version }) -> boolean`
  - `ensureHostBridge(session, userDataDir, boundState, onMessage?: (msg, kind) => void)`
  - Daemon ghi `host-version.json = { version, pid, startedAt }` khi khởi động. Task 15 dùng file này.

- [ ] **Step 1: Viết test lỗi**

```js
test('3 consecutive errors for the same version block it; ok/degraded resets the counter', ...);
test('a different version resets consecutiveErrors and clears blockedVersion', ...);
test('shouldInject is false when disabled or version blocked', ...);
test('safe-mode-reset message clears block and triggers forced reinject via onMessage', ...);
test('cli enable/disable writes host-state and sends daemon command', ...);
```

- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL.
- [ ] **Step 3: Cài đặt**
  - Khi chuyển sang `disabled`, daemon gọi `teardownTarget` cho mọi session và ngừng tiêm.
  - `enable` gọi `resetSafeMode` rồi `syncTargets(true)`.
  - Khi daemon không chạy, CLI `disable` dùng `runOneShotCommand({ cmd: 'reset' })`.
- [ ] **Step 4:** Chạy `node --test`. Kết quả mong đợi: PASS.
- [ ] **Step 5:** Commit `feat(daemon): add health tracking, crash-loop blocking and enable/disable kill switch`.

---

## Phase 3 — Pack nội dung và tách One Piece

### Task 7: Registry pack và cách daemon nạp pack

**Files:**
- Create: `src/core/pack-registry.js`
- Modify:
  - `scripts/build.mjs` (`MODULE_ORDER`: chèn `'core/pack-registry.js'` sau `'ui/theme-studio.js'`)
  - `src/fx/pet-stage.js:7` (`export const FX_PET_QUIPS`)
  - `src/index.js` (gọi `applyQueuedPacks(window)` trong `try` trước `new CustomThemeController()`)
  - `daemon/cdp-daemon.mjs` (`prepareBundleSource`, watcher)
- Test: `test/pack-registry.test.mjs`, `test/cdp-daemon.test.mjs`, `test/build.test.mjs` (`MODULE_ORDER`)

**Interfaces:**
- Produces:
  - `applyQueuedPacks(envWindow = window) -> { applied: string[], skipped: Array<{ packId, kind, id }> }`
    - Đọc hết `envWindow.__AGY_THEME_PACK_QUEUE__`.
    - Pack có dạng `{ id, name, version, wallpapers: [], mascots: {}, stickers: {}, bubbles: [], inputs: [], bundles: [], quips: {} }`.
    - Mọi `id` phải khớp `/^[a-z0-9-]+$/`. Mục trùng ID với bản tích hợp thì bị bỏ qua và có `console.warn`.
    - Gán `envWindow.__AGY_THEME_PACKS_LOADED__ = applied`.
  - `readPackScripts(homeDir, { maxBytesPerPack = 5 * 1024 * 1024 } = {}) -> { source: string, packIds: string[], sig: string }`
    - Đọc `<home>/packs/<dir>/pack.js` theo thứ tự tên thư mục.
    - Bọc từng pack: `try { <pack> } catch (e) { console.warn('[agy-theme] pack <id> failed', e); }`.
  - Thứ tự payload của `prepareBundleSource`: `bootPrefix + packs.source + strippedBundle`. `sig` của pack được tính vào chữ ký cache.
  - Daemon `fs.watch(packsDir, { recursive: true })` rồi `syncTargets(true)`.

- [ ] **Step 1: Viết test lỗi**

```js
test('applyQueuedPacks merges all kinds and skips id collisions with built-ins', ...);
test('malformed pack (bad id / non-object) is ignored without throwing', ...);
test('readPackScripts orders by dir, wraps each pack, skips files over 5 MB', ...);
test('payload places packs before bundle; a throwing pack does not prevent mount', ...); // chạy payload trong vm + dom-stub
test('MODULE_ORDER contains core/pack-registry.js right before index.js', ...);
```

- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL.
- [ ] **Step 3:** Cài đặt theo Interfaces.
- [ ] **Step 4:** Chạy `node --test` và `node cli.mjs build`. Kết quả mong đợi: PASS, `[syntax OK]`.
- [ ] **Step 5:** Commit `feat(packs): add runtime content-pack registry and daemon pack loading`.

### Task 8: Lệnh build pack

**Files:**
- Create: `scripts/pack-build.mjs`, `test/fixtures/packs/sample/` (`pack.json`, `content.js`, `assets/sample-sprite.png`). Toàn bộ nội dung mẫu phải là sáng tác nguyên bản.
- Modify:
  - `scripts/build.mjs` (export `replaceEmbeddedDataUri`, `collectDiskAssets`, `compactModuleCode`)
  - `cli.mjs` (`pack build <srcDir> [--out <dir>]`, chỉ ở chế độ source)
- Test: `test/pack-build.test.mjs`

**Interfaces:**
- Consumes: `applyQueuedPacks` (Task 7), `resolveThemeHome` (Task 1).
- Produces: `buildPack({ srcDir, outDir }) -> { outFile, packId, sizeBytes }`.
  - Nguồn: `pack.json` `{ id, name, version }` và `content.js` có `export default { ...định dạng pack... }`.
  - Ảnh trong `assets/<id>.<ext>` được nhúng vào các mục có `embeddedDataUri: ''`.
  - Output là một IIFE gồm, theo thứ tự:
    1. một prelude có `wpSvgUri(svg)` giống hệt bản trong `src/assets/wallpapers-manifest.js:5-11`;
    2. nội dung đã bỏ cú pháp module, với `export default` thay bằng `const __AGY_PACK_CONTENT__ =`;
    3. `(window.__AGY_THEME_PACK_QUEUE__ ||= []).push({ ...__AGY_PACK_CONTENT__, id, name, version })`.
  - Mặc định `outDir = <home>/packs/<id>`.

- [ ] **Step 1:** Viết test lỗi:
  - `buildPack output registers sample pack with embedded sprite data URI`: build fixture, chạy trong vm, gọi `applyQueuedPacks`, kiểm tra `MASCOT_TEMPLATES['sample-sprite'].embeddedDataUri` bắt đầu bằng `data:image/png;base64,`;
  - `pack content may use wpSvgUri`.
- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL.
- [ ] **Step 3:** Cài đặt `buildPack` và lệnh CLI.
- [ ] **Step 4:** Chạy `node --test`. Kết quả mong đợi: PASS.
- [ ] **Step 5:** Commit `feat(packs): add pack build command`.

### Task 9: Tách One Piece ra repo công khai

**Files:**
- Create (gitignored, không commit):
  - `packs/one-piece/pack.json`
  - `packs/one-piece/content.js`
  - `packs/one-piece/assets/luffy-anime.webp`, `luffy-gear5-anime.webp`
  - `packs/one-piece/docs/` (4 tài liệu One Piece / anime Luffy trong `docs/superpowers/{specs,plans}/`)
- Create (commit): `scripts/private-content-guard.mjs`, `test/private-content.test.mjs`
- Modify:
  - `src/assets/mascots.js:245-430`, `src/assets/stickers.js:109-127`, `src/assets/wallpapers-manifest.js:152-224`
  - `src/presets/bubbles.js:215-260`, `src/presets/inputs.js:98-126`, `src/presets/themes.js:258-350`
  - `src/fx/pet-stage.js:44-67`
  - `.gitignore` (thêm `packs/`)
  - Các test có ID One Piece: `test/build.test.mjs`, `cdp-daemon.test.mjs`, `fx-companions.test.mjs`, `presets.test.mjs`, `surface-engine.test.mjs`, `theme-studio.test.mjs`
- Delete: `assets/pets/luffy-anime.webp`, `assets/pets/luffy-gear5-anime.webp`

**Interfaces:**
- Consumes: `buildPack` (Task 8), fixture `test/fixtures/packs/sample` (Task 8).
- Produces:
  - `PRIVATE_CONTENT_DENYLIST` (11 từ trong Global Constraints)
  - `findPrivateContent(text: string) -> string[]`, dùng regex `(?<![a-z0-9])<term>(?![a-z0-9])` cờ `i`
  - `scanFilesForPrivateContent(paths: string[]) -> Array<{ file, terms }>`

- [ ] **Step 1: Viết test lỗi**

```js
test('findPrivateContent is case-insensitive whole-token', () => {
  assert.deepEqual(findPrivateContent('Smooth code, fluffy tails'), []);
  assert.deepEqual(findPrivateContent('Luffy'), ['luffy']);
  assert.deepEqual(findPrivateContent("id: 'one-piece-sunny-sunset'"), ['one-piece']);
});
test('tracked src/ files and freshly built dist contain no private content', ...); // loại trừ guard và test của nó
```

- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL (`src/` vẫn còn 20 mục).
- [ ] **Step 3: Chuyển 20 mục One Piece** (theo spec 5.8) cùng câu thoại sang `packs/one-piece/content.js`, **giữ nguyên ID**. Chuyển hai file WebP và 4 tài liệu.
- [ ] **Step 4: Viết lại các test** đang dùng ID One Piece để dùng fixture `sample` hoặc preset nguyên bản. Thay test `built-in WebP pet sprites stay compact` bằng kiểm tra kích thước sprite của fixture.
- [ ] **Step 5: Kiểm tra**
  - Chạy `node --test`. Kết quả mong đợi: PASS.
  - Chạy `node cli.mjs pack build packs/one-piece`. Kết quả mong đợi: in ra `<home>/packs/one-piece/pack.js`.
  - Với Antigravity đang mở và config hiện tại đang chọn bundle One Piece: chạy `node cli.mjs inject --one-shot` rồi `node cli.mjs verify`. Kết quả mong đợi: `PASS`, và One Piece hiển thị như trước.
- [ ] **Step 6: Sao lưu nguồn pack.** `packs/` bị gitignore và sẽ mất nếu worktree bị dọn. Chép `packs/one-piece/` sang `<home>/pack-sources/one-piece/`, và ghi chú vị trí này trong mô tả PR.
- [ ] **Step 7:** Commit `refactor(content): move One Piece assets into a private local pack and add private-content guard`. Chạy `git status` để chắc chắn không có file nào dưới `packs/` bị stage.

---

## Phase 4 — Gói npm, setup, uninstall, doctor

### Task 10: Định dạng gói và CLI

**Files:**
- Create: `daemon/npm-tools.mjs`, `test/npm-package.test.mjs`
- Modify:
  - `package.json`
  - `cli.mjs` (kiểm tra Node, chặn lệnh theo chế độ, help)
  - `daemon/cdp-daemon.mjs` (`prepareBundleSource({ allowBuild })`)
- Test: `test/npm-package.test.mjs`, `test/cdp-daemon.test.mjs`

**Interfaces:**
- Consumes: `detectRunMode`, `PACKAGE_NAME` (Task 1), `findPrivateContent` (Task 9).
- Produces:
  - `package.json` có: `version: "1.0.0"`, `license: "MIT"`, `bin: { "agy-theme": "cli.mjs" }`, `engines: { node: ">=22.4" }`, `os: ["win32"]`, `repository`, `homepage`, `bugs`.
  - `files`: `["cli.mjs", "daemon/", "scripts/build.mjs", "scripts/verify-cdp.mjs", "scripts/win-integration.mjs", "src/core/config-store.js", "dist/antigravity-theme.js", "README.md", "LICENSE", "CHANGELOG.md"]`.
  - `resolveNpmCommand({ execPath = process.execPath, platform = process.platform, exists = fs.existsSync }) -> { command: string, shell: boolean }`: ưu tiên `<dirname(execPath)>/npm.cmd`, `shell: true` trên win32.
  - `runNpm(args: string[], { cwd, timeoutMs }) -> Promise<{ code, stdout, stderr }>`: bao mỗi đối số trong `"`, từ chối đối số có chứa `"`.
  - `getNpmGlobalPrefix() -> Promise<string | null>`
  - `assertNodeVersion(current: string, min = '22.4.0') -> void`: in thông báo VI/EN rồi `process.exit(1)` nếu Node thấp hơn.
  - Lệnh chỉ chạy ở chế độ source: `build`, `pack`, `release`, `inject`, `verify`, `open-settings`, `reset`. Ở chế độ khác thì in "chỉ dùng khi chạy từ mã nguồn" và thoát với mã 2.
  - `cli.mjs` chỉ được import tĩnh các file nằm trong `files`. Các module không phát hành (`scripts/pack-build.mjs`, `scripts/release.mjs`) phải nạp bằng `await import()` bên trong nhánh lệnh tương ứng, nếu không bản cài từ npm sẽ crash ngay khi khởi động.
  - `prepareBundleSource({ ..., allowBuild = true })`: khi `false` mà thiếu `dist/` thì throw `Error('Bundle missing: reinstall antigravity-custom-theme')`.

- [ ] **Step 1: Viết test lỗi**

```js
test('npm pack --dry-run --json ships exactly the release files', ...);
// phải có: cli.mjs, dist/antigravity-theme.js, daemon/cdp-daemon.mjs, src/core/config-store.js, scripts/build.mjs
// không được có path bắt đầu bằng packs/, test/, docs/, assets/, user-data/, release/, và không có src/index.js
test('packed dist contains no private content', ...);
test('installed layout boots: cli.mjs --version and status run with only packed files', ...); // giải nén tarball của `npm pack` vào tmp rồi chạy `node cli.mjs --version`
test('resolveNpmCommand prefers npm.cmd next to node.exe on win32', ...);
test('runNpm rejects arguments containing double quotes', ...);
test('source-only commands exit 2 in installed mode', ...);
test('prepareBundleSource without allowBuild throws when dist is missing', ...);
```

- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL.
- [ ] **Step 3:** Cài đặt. Test npm pack gọi `buildBundle()` trước rồi mới chạy `runNpm(['pack', '--dry-run', '--json'])`.
- [ ] **Step 4:** Chạy `node --test`. Kết quả mong đợi: PASS.
- [ ] **Step 5:** Commit `feat(npm): define package contents, node version gate and run-mode command gating`.

### Task 11: Tích hợp Windows — setup và uninstall

**Files:**
- Create: `scripts/win-integration.mjs`, `test/win-integration.test.mjs`
- Modify: `cli.mjs` (`setup [--from <dir>]`, `uninstall [--purge]`)
- Delete: `install.bat`, `uninstall.bat`, `scripts/install-win.ps1`, `scripts/uninstall-win.ps1`

**Interfaces:**
- Consumes: `resolveThemeHome`, `homePaths`, `detectRunMode` (Task 1); `migrateLegacyUserData` (Task 2); `getNpmGlobalPrefix` (Task 10); `writeDaemonCommand`, `readDaemonPid`, `isNodeProcessAlive`, `runOneShotCommand` (daemon có sẵn).
- Produces:
  - `renderStartupVbs({ packageDir, npmPrefix, shimPath }) -> string`: ba nhánh theo spec 5.3. Mọi đường dẫn đặt trong dấu nháy kiểu VBS (`""`).
  - `renderCommandVbs({ shimPath, command: 'enable' | 'disable' }) -> string`
  - `writeUtf16Vbs(filePath, content) -> void`: UTF-16LE có BOM `FF FE`.
  - `createShortcut({ lnkPath, target, args, workingDir, description }) -> Promise<void>` và `readShortcut(lnkPath) -> Promise<{ target, args, workingDir } | null>`: qua `powershell -NoProfile -NonInteractive -EncodedCommand <base64 UTF-16LE>`, dùng COM `WScript.Shell`.
  - `findLegacyCloneDir({ startupDir, readShortcut, readFile }) -> Promise<string | null>`:
    - đọc `Antigravity Custom Theme.lnk`, rồi file VBS cũ ở định dạng `scripts/install-win.ps1:32-35`;
    - lấy ra đường dẫn `cli.mjs`, trả về thư mục cha;
    - chỉ chấp nhận khi `<dir>/user-data` tồn tại.
  - `stopLegacyDaemon(legacyUserDataDir) -> Promise<'not-running' | 'stopped' | 'killed'>`
  - `detectVersionManager(env) -> 'nvm-windows' | 'volta' | 'fnm' | null`
  - `runSetup({ home, packageDir, mode, from, deps }) -> Promise<{ ok, actions: string[], warnings: string[] }>`:
    - `deps` gồm `createShortcut`, `startDaemon`, `findLegacyCloneDir`, `stopLegacyDaemon`, `readActivePort`, `paths` (Startup, Start Menu);
    - chế độ source: `ok: true`, `actions: []`, kèm lời giải thích.
  - `runUninstall({ home, purge, deps }) -> Promise<{ ok, actions }>`
  - Vị trí file:
    - Startup: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Antigravity Custom Theme.lnk`, trỏ tới `wscript.exe "<home>\startup.vbs"`;
    - Start Menu: `...\Programs\Antigravity Custom Theme\Tắt Antigravity Custom Theme.lnk` và `Bật Antigravity Custom Theme.lnk`, trỏ tới `<home>\disable.vbs` và `<home>\enable.vbs`.

- [ ] **Step 1: Viết test lỗi** (không phụ thuộc nền tảng, dùng deps giả)

```js
test('renderStartupVbs quotes paths with spaces and Vietnamese characters; writeUtf16Vbs writes FF FE BOM', ...); // Review Focus 4: 'C:\\Users\\Nguyễn Văn A\\...'
test('renderStartupVbs: package missing + prefix present => self-delete; both missing => silent exit', ...);
test('findLegacyCloneDir parses the old install-win.ps1 VBS format', ...);
test('runSetup migrates legacy data and stops the legacy daemon before starting the new one', ...);
test('runSetup succeeds when DevToolsActivePort is missing', ...);                 // Review Focus 1
test('runSetup in source mode makes no changes', ...);
test('runSetup warns for volta/fnm', ...);
test('runUninstall removes shortcuts and scripts; --purge refuses a home inside packageDir', ...);
```

- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL.
- [ ] **Step 3:** Cài đặt, rồi xóa 4 file installer cũ.
- [ ] **Step 4:** Chạy `node --test`. Kết quả mong đợi: PASS.
- [ ] **Step 5: Kiểm thử thủ công trên Windows**
  1. `npm pack`;
  2. `npm i -g ./antigravity-custom-theme-1.0.0.tgz`;
  3. `agy-theme setup`;
  4. mở Antigravity, thấy theme;
  5. `agy-theme disable` / `enable`;
  6. `agy-theme uninstall`, rồi kiểm tra không còn shortcut;
  7. `npm rm -g antigravity-custom-theme`.

  Ghi kết quả vào mô tả PR.
- [ ] **Step 6:** Commit `feat(setup): add npm-friendly Windows setup/uninstall with legacy clone migration`.

### Task 12: Lệnh doctor

**Files:**
- Create: `daemon/doctor.mjs`, `test/doctor.test.mjs`
- Modify: `cli.mjs` (`doctor [--json] [--restore-backup <file>]`)

**Interfaces:**
- Consumes: Task 1, 6, 10, 11 (`detectVersionManager`).
- Produces:
  - `collectDiagnostics(deps) -> { node, platform, runMode, version, home, daemon, activePort, health, hostState, packs: string[], updateState, legacyShortcut: boolean, versionManager }`
  - `restoreConfigBackup({ home, file }) -> { ok, reason? }`: chỉ chấp nhận file nằm trong `<home>/backups`. Sao lưu `config.json` hiện tại trước khi ghi đè, rồi gửi lệnh `reinject`.

- [ ] **Step 1:** Viết test lỗi:
  - `collectDiagnostics returns all keys with fake deps`;
  - `restoreConfigBackup rejects paths outside backups (including ..\\ traversal)`.
- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL.
- [ ] **Step 3:** Cài đặt. Bản in cho người đọc có nhãn VI/EN; `--json` in ra JSON.
- [ ] **Step 4:** Chạy `node --test`. Kết quả mong đợi: PASS.
- [ ] **Step 5:** Commit `feat(cli): add doctor diagnostics and backup restore`.

---

## Phase 5 — Cập nhật một nút có ký số và quy trình phát hành

### Task 13: Lõi chữ ký và semver

**Files:**
- Create: `daemon/release-key.mjs`, `daemon/update-verify.mjs`, `test/update-verify.test.mjs`

**Interfaces:**
- Produces:
  - `RELEASE_PUBLIC_KEY_PEM: string` và `RELEASE_KEY_ID: string`. Giá trị ban đầu là `'PLACEHOLDER'`; Task 17 từ chối phát hành khi còn placeholder.
  - `SIGNATURE_SOURCES` (2 URL gốc theo Global Constraints), `REGISTRY_URL = 'https://registry.npmjs.org'`
  - `parseStrictSemver(s) -> [number, number, number] | null`
  - `compareSemver(a, b) -> -1 | 0 | 1`
  - `computeIntegrity(buf) -> 'sha512-<base64>'`
  - `computeKeyId(publicKeyPem) -> string`: 8 ký tự hex đầu của SHA-256 trên DER SPKI.
  - `buildSignedMessage({ name, version, integrity }) -> string`: `${name}@${version}\n${integrity}\n`
  - `signRelease({ name, version, tarball: Buffer, privateKeyPem }) -> { name, version, integrity, keyId, sig }`
  - `verifyReleaseSignature({ sigJson, tarball, expected: { name, version, integrity }, publicKeyPem }) -> { ok: true } | { ok: false, reason }`. `reason` thuộc: `'malformed' | 'name-mismatch' | 'version-mismatch' | 'integrity-mismatch' | 'tarball-hash-mismatch' | 'key-mismatch' | 'bad-signature'`.

- [ ] **Step 1: Viết test lỗi** (sinh cặp khóa Ed25519 ngay trong test bằng `crypto.generateKeyPairSync('ed25519')`)

```js
test('signRelease output verifies', ...);
test('verifyReleaseSignature reports each failure reason', ...); // một case cho mỗi reason
test('parseStrictSemver rejects prereleases and garbage; compareSemver orders numerically (1.10.0 > 1.9.9)', ...);
```

- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL.
- [ ] **Step 3:** Cài đặt bằng `crypto.sign(null, ...)` / `crypto.verify(null, ...)`.
- [ ] **Step 4:** Chạy test. Kết quả mong đợi: PASS.
- [ ] **Step 5:** Commit `feat(update): add Ed25519 release signature and semver core`.

### Task 14: Kiểm tra bản mới và kênh trang ↔ daemon

**Files:**
- Create: `daemon/update-check.mjs`, `test/update-check.test.mjs`
- Modify:
  - `daemon/cdp-daemon.mjs`: lịch kiểm tra; message `update-check`; `pushHostEvent`; `loadBootPayload` / `prepareBundleSource` thêm `host`
  - `src/index.js` (`onHostEvent`, `controller.hostState`, thuộc tính `data-agy-ct-update` trên launcher)
  - `src/core/surface-engine.js` (CSS chấm báo cập nhật trên `#agy-ct-launcher[data-agy-ct-update="available"]`, chỉ dùng `::after` tĩnh)

**Interfaces:**
- Consumes: Task 1, 6 (`ensureHostBridge` onMessage), 13 (`parseStrictSemver`, `compareSemver`, `REGISTRY_URL`).
- Produces:
  - `UpdateState = { status: 'up-to-date' | 'available' | 'unreachable' | 'unsupported-mode' | 'unmanaged' | 'downloading' | 'verifying' | 'installing' | 'restarting' | 'updated' | 'rolled-back' | 'failed', current, latest, tarballUrl, integrity, checkedAt, reason?, lastResult? }`
  - `resolveUpdateEndpoints(env = process.env) -> { registryUrl, signatureSources }`: chỉ đọc `AGY_THEME_REGISTRY_URL` / `AGY_THEME_RELEASE_BASE_URL` khi `AGY_THEME_DEV === '1'`.
  - `fetchLatestRelease({ fetchImpl = fetch, registryUrl, name, timeoutMs = 10000 }) -> Promise<{ version, tarballUrl, integrity }>`: header `Accept: application/vnd.npm.install-v1+json`.
  - `checkForUpdate({ currentVersion, homeDir, runMode, fetchImpl, now }) -> Promise<UpdateState>`: ghi `update-state.json`, không bao giờ throw.
  - `pushHostEvent(sessions, event) -> Promise<void>`: evaluate `window.__AGY_CUSTOM_THEME__?.onHostEvent?.(<json>)`.
  - Boot: `window.__AGY_THEME_BOOT__.host = { version, runMode, update: UpdateState | null, health }`.
  - Lịch: chỉ ở chế độ installed. Kiểm tra lúc khởi động, rồi `setInterval` 24 giờ (`unref`). Message `update-check` thì kiểm tra ngay.

- [ ] **Step 1: Viết test lỗi** (dùng `fetchImpl` giả)

```js
test('checkForUpdate: newer latest => available with tarballUrl and integrity', ...);
test('checkForUpdate: older/equal/prerelease latest => up-to-date', ...);
test('checkForUpdate returns unreachable without throwing on network error or timeout', ...); // Review Focus 3
test('checkForUpdate in source mode => unsupported-mode, unmanaged => unmanaged, no fetch made', ...);
test('resolveUpdateEndpoints ignores overrides unless AGY_THEME_DEV=1', ...);
test('onHostEvent stores host state and sets data-agy-ct-update on launcher', ...); // dom-stub
```

- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL.
- [ ] **Step 3:** Cài đặt. Thêm `update-state.json` và `health.json` vào chữ ký cache của `prepareBundleSource`.
- [ ] **Step 4:** Chạy `node --test` và `node cli.mjs build`. Kết quả mong đợi: PASS, `[syntax OK]`.
- [ ] **Step 5:** Commit `feat(update): add registry update check and host event channel`.

### Task 15: Cài bản cập nhật, updater, rollback

**Files:**
- Create: `daemon/update-apply.mjs`, `daemon/updater.mjs`, `test/update-apply.test.mjs`, `test/updater.test.mjs`
- Modify:
  - `daemon/cdp-daemon.mjs`: message `update-apply`; đẩy tiến trình qua `pushHostEvent`; gọi `launchUpdater` rồi `shutdown()`
  - `cli.mjs` (`update [--check]`)

**Interfaces:**
- Consumes: Task 13 (`verifyReleaseSignature`, `compareSemver`, `SIGNATURE_SOURCES`, `RELEASE_PUBLIC_KEY_PEM`); Task 14 (`UpdateState`, `checkForUpdate`, `resolveUpdateEndpoints`); Task 10 (`resolveNpmCommand`); `homePaths` (Task 1).
- Produces:
  - `downloadAndVerifyUpdate({ state, currentVersion, homeDir, fetchImpl, publicKeyPem, signatureSources, onProgress }) -> Promise<{ ok: true, tarballPath } | { ok: false, reason }>`
    - Báo tiến trình `downloading`, rồi `verifying`.
    - Thử từng nguồn `.sig` theo thứ tự; 404 hoặc lỗi mạng thì sang nguồn tiếp theo.
    - Hết nguồn thì `reason: 'signature-unavailable'`.
    - Đòi `compareSemver(state.latest, currentVersion) > 0`.
    - Lỗi thì xóa file tạm.
  - `launchUpdater({ homeDir, packageDir, tarballPath, fromVersion, toVersion, spawnImpl }) -> void`
    - Chép `daemon/updater.mjs` sang `<home>/updates/updater.mjs`.
    - Chạy `spawn(process.execPath, [copy, '--home', h, '--tarball', t, '--from', f, '--to', v, '--old-pid', String(process.pid)], { detached: true, windowsHide: true, cwd: <home>/updates, stdio: 'ignore' })` rồi `unref`.
  - `daemon/updater.mjs` **tự đứng một mình**, chỉ import `node:*`. Export `runUpdater({ home, tarball, from, to, oldPid, deps }) -> Promise<'updated' | 'rolled-back' | 'failed'>`, gồm các bước:
    1. chờ `oldPid` thoát, tối đa 15 giây;
    2. ghi trạng thái `installing`;
    3. `npm i -g "<tarball>"`;
    4. ghi `restarting`, rồi khởi động `node <prefix>/node_modules/antigravity-custom-theme/cli.mjs start` bằng `process.execPath`;
    5. chờ tối đa 20 giây để `host-version.json.version === to` và PID còn sống;
    6. lỗi ở bước 3 hoặc 5 thì `npm i -g antigravity-custom-theme@<from>` và khởi động lại;
    7. ghi `lastResult` vào `update-state.json` và log vào `<home>/updates/updater.log`.
  - Message `update-apply { version }` chỉ được thực hiện khi: `runMode === 'installed'`, `state.status === 'available'` và `version === state.latest`.

- [ ] **Step 1: Viết test lỗi** (fetch, spawn, npm và PID đều giả)

```js
test('downloadAndVerifyUpdate succeeds with valid sig from primary source', ...);
test('falls back to secondary source when primary returns 404', ...);
test('all sources unavailable => signature-unavailable; bad sig => rejected and temp removed', ...);
test('refuses when latest is not newer than current', ...);
test('update-apply is ignored unless installed + available + matching version', ...);
test('runUpdater waits for old daemon pid to exit before npm install', ...);   // Review Focus 2
test('runUpdater success path writes updated', ...);
test('runUpdater rolls back on npm failure and on health timeout', ...);
test('updater.mjs imports only node: builtins', ...);                          // quét câu lệnh import
```

- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL.
- [ ] **Step 3:** Cài đặt theo Interfaces.
- [ ] **Step 4:** Chạy `node --test`. Kết quả mong đợi: PASS.
- [ ] **Step 5:** Commit `feat(update): add signed one-click update apply with detached updater and rollback`.

### Task 16: Giao diện cập nhật trong Theme Studio

**Files:**
- Modify:
  - `src/ui/theme-studio.js` (`renderAdvancedTab` ở dòng 955: thêm thẻ phiên bản ở đầu tab)
  - `src/ui/i18n.js`
  - `src/index.js` (truyền callback)
- Test: `test/theme-studio.test.mjs`

**Interfaces:**
- Consumes: `controller.hostState` (Task 14), `emitBridgeMessage` (Task 5).
- Produces:
  - ThemeStudio nhận thêm option `getHostState()`, `onUpdateCheck()`, `onUpdateApply(version)`.
  - `renderVersionCard(container, host, lang)` hiện:
    - phiên bản hiện tại;
    - câu trạng thái tương ứng với từng `UpdateState.status`;
    - nút [Cập nhật] khi `available`, nút [Kiểm tra];
    - link "Xem thay đổi" tới `https://github.com/VinhDat267/antigravity-custom-theme-releases/releases/tag/v<latest>`.
  - Khi `reason === 'key-mismatch'`, câu trạng thái kèm lệnh `npm i -g antigravity-custom-theme@latest`.
  - i18n VI/EN: `versionLabel`, `updateAvailable`, `updateBtn`, `viewChanges`, `updateChecking`, `updateDownloading`, `updateVerifying`, `updateInstalling`, `updateRestarting`, `updateDone`, `updateFailed`, `updateRolledBack`, `updateUpToDate`, `updateUnreachable`, `updateSourceMode`, `updateUnmanaged`, `updateUnverifiable`.

- [ ] **Step 1:** Viết test lỗi:
  - `version card renders each status text in vi and en`;
  - `update button emits update-apply with latest version; check emits update-check`;
  - `source mode hides update button`.
- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL.
- [ ] **Step 3:** Cài đặt theo phong cách `tsEl` và `agy-ct-card` hiện có.
- [ ] **Step 4:** Chạy `node --test`, `node cli.mjs build`, và `node cli.mjs verify` khi Antigravity đang mở. Kết quả mong đợi: PASS.
- [ ] **Step 5:** Commit `feat(studio): add version card with one-click update states`.

### Task 17: Script phát hành

**Files:**
- Create: `scripts/release.mjs`, `test/release.test.mjs`
- Modify:
  - `cli.mjs` (`release keygen --out <path>`, `release pack --key <path>`, `release publish`; chỉ ở chế độ source)
  - `.gitignore` (thêm `release/`)

**Interfaces:**
- Consumes: Task 13 (`signRelease`, `verifyReleaseSignature`, `computeKeyId`, `RELEASE_KEY_ID`, `RELEASE_PUBLIC_KEY_PEM`, `SIGNATURE_SOURCES`); Task 9 (`findPrivateContent`); Task 10 (`runNpm`); `buildBundle`.
- Produces:
  - `keygen({ outPath, rootDir }) -> { publicKeyPem, keyId }`: từ chối khi `outPath` nằm trong `rootDir`, hoặc file đã tồn tại.
  - `packRelease({ rootDir, keyPath, deps }) -> { tarballPath, sigPath, version }`. Các bước:
    1. `node --test`;
    2. build và kiểm tra bằng vm;
    3. `npm pack --json` ra thư mục `release/`;
    4. guard: không có file nào thuộc `packs/`, và `findPrivateContent` trên mọi file văn bản trong tarball (giải nén bằng `tar -xzf` có sẵn trên Windows 10+ vào thư mục tmp);
    5. từ chối khi `RELEASE_PUBLIC_KEY_PEM === 'PLACEHOLDER'`, hoặc `keyId` suy từ khóa bí mật khác `RELEASE_KEY_ID`;
    6. `signRelease` rồi ghi `.tgz.sig`.
  - `publishRelease({ rootDir, version, deps }) -> { npmCommand: string }`:
    1. `gh release create v<ver> <tgz> <sig> --repo VinhDat267/antigravity-custom-theme-releases --notes-file <tmp chứa mục CHANGELOG>`;
    2. cũng lệnh đó với `--repo VinhDat267/antigravity-custom-theme`;
    3. tải lại `.sig` từ nguồn chính và kiểm tra lại;
    4. **không** tự chạy `npm publish`, chỉ in ra lệnh `npm publish release/<tgz>` để chủ repo chạy với OTP.

- [ ] **Step 1:** Viết test lỗi:
  - `keygen refuses paths inside the repo`;
  - `packRelease refuses placeholder key and mismatched keyId`;
  - `packRelease fails when tarball contains private content`;
  - `packRelease sig verifies with verifyReleaseSignature`;
  - `publishRelease runs gh for both repos in order, re-verifies, and returns npm publish command without running it`.

  Mọi deps đều giả.
- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL.
- [ ] **Step 3:** Cài đặt.
- [ ] **Step 4:** Chạy `node --test`. Kết quả mong đợi: PASS.
- [ ] **Step 5: Kiểm thử end-to-end thủ công cập nhật** (spec mục 6, bước 2–3)
  - Dùng `AGY_THEME_DEV=1` cùng một registry giả và server `.sig` cục bộ (`node:http` phục vụ thư mục `release/`).
  - Cài bản `1.0.0` từ tarball, phát hành giả `1.0.1`, bấm Cập nhật. Kết quả mong đợi: lên `1.0.1`, config giữ nguyên.
  - Sửa 1 byte trong `.sig`. Kết quả mong đợi: bị từ chối.

  Ghi kết quả vào mô tả PR.
- [ ] **Step 6:** Commit `feat(release): add keygen, signed pack and two-repo publish scripts`.

---

## Phase 6 — Tài liệu và CI

### Task 18: Tài liệu phát hành và CI

**Files:**
- Create: `LICENSE`, `CHANGELOG.md`, `RELEASING.md`, `SECURITY.md`, `CONTRIBUTING.md`, `test/docs.test.mjs`
- Modify: `README.md` (viết lại), `AGENTS.md`, `SKILL.md`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `findPrivateContent` (Task 9), `RELEASE_KEY_ID` (Task 13).
- Produces:
  - **README** (VI/EN): yêu cầu (Windows 10/11, Node ≥ 22.4, Antigravity 2.x); cài; cập nhật; gỡ (`agy-theme uninstall` trước `npm rm -g`); tắt khẩn cấp; `agy-theme doctor`; mục **Quyền riêng tư** nêu `registry.npmjs.org` và `github.com`; pack nội dung (cảnh báo chỉ dùng pack từ nguồn tin cậy); dòng không liên kết với Google.
  - **CONTRIBUTING**: nhận phần dev của README cũ, kèm vòng kiểm tra.
  - **CHANGELOG**: định dạng Keep a Changelog, mục `1.0.0`.
  - **RELEASING**: các bước keygen / pack / publish, sao lưu khóa ở 2 nơi offline, bật 2FA cho npm, tạo repo `antigravity-custom-theme-releases`.
  - **SECURITY**: cách báo lỗ hổng, `RELEASE_KEY_ID`, quy trình đổi khóa.
  - **LICENSE**: MIT, chủ thể lấy theo `git config user.name` của chủ repo.
  - **AGENTS.md / SKILL.md**: sửa tên binding thành `__agyThemeBridge`; thêm thư mục dữ liệu, chế độ chạy, pack, guard nội dung riêng; vòng kiểm tra có thêm `npm pack --dry-run`.
  - **CI**: ma trận `node-version: ['22.4.0', '24.x']` × `[ubuntu-latest, windows-latest]`; các bước `node --test`, `node scripts/build.mjs --check`, `npm pack --dry-run`.

- [ ] **Step 1:** Viết test lỗi:
  - `README, CHANGELOG, SECURITY, RELEASING, CONTRIBUTING contain no private content`;
  - `README mentions registry.npmjs.org, github.com, agy-theme setup, agy-theme uninstall`;
  - `AGENTS.md references __agyThemeBridge, not __agyThemeSave`.
- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL.
- [ ] **Step 3:** Viết tài liệu và cập nhật CI.
- [ ] **Step 4:** Chạy `node --test`. Kết quả mong đợi: PASS. Push nhánh; CI xanh trên cả 4 tổ hợp.
- [ ] **Step 5:** Commit `docs: add end-user README, release/security docs, MIT license and CI matrix`.

---

## Đối chiếu spec → task

| Spec | Task |
|---|---|
| 5.1 Gói npm và CLI | 3, 10, 12 |
| 5.2 Thư mục dữ liệu và chuyển dữ liệu cũ | 1, 2, 11 |
| 5.3 Khởi động cùng Windows, gỡ, trình quản lý phiên bản Node | 11 |
| 5.4 Version và schema | 3, 4 |
| 5.5 Chế độ an toàn | 5, 6 |
| 5.6 Cập nhật một nút | 13, 14, 15, 16 |
| 5.7 Quy trình phát hành | 17, 18 |
| 5.8 Pack và One Piece | 7, 8, 9 |
| 5.9 Tài liệu và CI | 18 |
| 6 Kiểm thử end-to-end | 9 (bước 5), 11 (bước 5), 17 (bước 5) |
