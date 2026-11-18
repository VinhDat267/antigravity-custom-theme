import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

import {
  ackDaemonCommand,
  buildNewDocumentWrapper,
  capDaemonLogFile,
  computeNextPollDelay,
  isNodeProcessAlive,
  resolvePortFile,
  parsePortFileContent,
  filterAntigravityTargets,
  persistBridgeMessage,
  prepareBundleSource,
  readDaemonCommandAck,
  teardownTarget,
  writeDaemonCommand,
  consumeDaemonCommand
} from '../daemon/cdp-daemon.mjs';

test('resolvePortFile prioritizes AGY_PORT_FILE and resolves Windows AppData DevToolsActivePort', () => {
  const custom = resolvePortFile({
    platform: 'win32',
    env: { AGY_PORT_FILE: 'D:\\Custom\\DevToolsActivePort', APPDATA: 'C:\\Users\\Test\\AppData\\Roaming' },
    homedir: 'C:\\Users\\Test'
  });
  assert.equal(custom, 'D:\\Custom\\DevToolsActivePort');

  const winDefault = resolvePortFile({
    platform: 'win32',
    env: { APPDATA: 'C:\\Users\\Test\\AppData\\Roaming' },
    homedir: 'C:\\Users\\Test'
  });
  assert.equal(winDefault, path.win32.join('C:\\Users\\Test\\AppData\\Roaming', 'Antigravity', 'DevToolsActivePort'));

  const winFallbackHome = resolvePortFile({
    platform: 'win32',
    env: {},
    homedir: 'C:\\Users\\Test'
  });
  assert.equal(winFallbackHome, path.win32.join('C:\\Users\\Test', 'AppData', 'Roaming', 'Antigravity', 'DevToolsActivePort'));
});

test('parsePortFileContent parses port + browser wsPath and rejects invalid input', () => {
  assert.deepEqual(
    parsePortFileContent('61824\r\n/devtools/browser/abc-123\r\n'),
    { port: 61824, wsPath: '/devtools/browser/abc-123' }
  );
  assert.equal(parsePortFileContent(''), null);
  assert.equal(parsePortFileContent('not-a-port\n/devtools/browser/x'), null);
  assert.equal(parsePortFileContent('0\n/devtools/browser/x'), null);
  assert.equal(parsePortFileContent('61824\n'), null);
});

test('filterAntigravityTargets keeps loopback page targets and rejects plugin, data, devtools, and external URLs', () => {
  const targets = [
    { id: '1', type: 'page', url: 'https://127.0.0.1:61824/index.html', webSocketDebuggerUrl: 'ws://127.0.0.1:61824/devtools/page/1' },
    { id: '2', type: 'page', url: 'http://localhost:3000/workspace', webSocketDebuggerUrl: 'ws://127.0.0.1:61824/devtools/page/2' },
    { id: '3', type: 'page', url: 'plugin://extension-host/index.html', webSocketDebuggerUrl: 'ws://127.0.0.1:61824/devtools/page/3' },
    { id: '4', type: 'page', url: 'data:text/html,<html></html>', webSocketDebuggerUrl: 'ws://127.0.0.1:61824/devtools/page/4' },
    { id: '5', type: 'page', url: 'devtools://devtools/bundled/inspector.html', webSocketDebuggerUrl: 'ws://127.0.0.1:61824/devtools/page/5' },
    { id: '6', type: 'page', url: 'https://github.com/dolphintapcode/theme-antigravity', webSocketDebuggerUrl: 'ws://127.0.0.1:61824/devtools/page/6' },
    { id: '7', type: 'service_worker', url: 'https://127.0.0.1:61824/sw.js', webSocketDebuggerUrl: 'ws://127.0.0.1:61824/devtools/page/7' },
    { id: '8', type: 'page', url: 'chrome-extension://abcdef/popup.html', webSocketDebuggerUrl: 'ws://127.0.0.1:61824/devtools/page/8' }
  ];

  const kept = filterAntigravityTargets(targets);
  assert.deepEqual(kept.map((t) => t.id), ['1', '2']);
});

test('persistBridgeMessage atomically writes config, guards stale timestamps & config-init, and stores media slots', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-ct-daemon-'));
  try {
    // config-init creates config.json when missing
    const init1 = persistBridgeMessage(
      tmpDir,
      JSON.stringify({ type: 'config-init', data: { enabled: true, __savedAt: 200, accentColor: '#f5c451' } })
    );
    assert.equal(init1, 'config');
    assert.equal(JSON.parse(fs.readFileSync(path.join(tmpDir, 'config.json'), 'utf8')).accentColor, '#f5c451');

    // config updates config.json when newer
    const newer = persistBridgeMessage(
      tmpDir,
      JSON.stringify({ type: 'config', data: { enabled: true, __savedAt: 500, accentColor: '#22d3ee' } })
    );
    assert.equal(newer, 'config');
    assert.equal(JSON.parse(fs.readFileSync(path.join(tmpDir, 'config.json'), 'utf8')).accentColor, '#22d3ee');

    // stale config (__savedAt < existing) is ignored
    const stale = persistBridgeMessage(
      tmpDir,
      JSON.stringify({ type: 'config', data: { enabled: true, __savedAt: 300, accentColor: '#ef4444' } })
    );
    assert.equal(stale, null);
    assert.equal(JSON.parse(fs.readFileSync(path.join(tmpDir, 'config.json'), 'utf8')).accentColor, '#22d3ee');

    // config-init NEVER overwrites an existing config.json even if __savedAt is higher
    const init2 = persistBridgeMessage(
      tmpDir,
      JSON.stringify({ type: 'config-init', data: { enabled: true, __savedAt: 9999, accentColor: '#000000' } })
    );
    assert.equal(init2, null);
    assert.equal(JSON.parse(fs.readFileSync(path.join(tmpDir, 'config.json'), 'utf8')).accentColor, '#22d3ee');

    // media slot write and delete
    const dataUri = 'data:image/png;base64,iVBORw0KGgo=';
    assert.equal(persistBridgeMessage(tmpDir, JSON.stringify({ type: 'media', key: 'wallpaper', dataUrl: dataUri })), 'media');
    assert.equal(fs.readFileSync(path.join(tmpDir, 'media', 'wallpaper.dat'), 'utf8'), dataUri);

    assert.equal(persistBridgeMessage(tmpDir, JSON.stringify({ type: 'media', key: 'wallpaper', dataUrl: null })), 'media');
    assert.equal(fs.existsSync(path.join(tmpDir, 'media', 'wallpaper.dat')), false);

    // invalid slot key is rejected safely
    assert.equal(persistBridgeMessage(tmpDir, JSON.stringify({ type: 'media', key: '../evil', dataUrl: dataUri })), null);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('writeDaemonCommand and consumeDaemonCommand execute each nonce once', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-ct-cmd-'));
  try {
    const empty = consumeDaemonCommand(tmpDir, '');
    assert.equal(empty.command, null);
    assert.equal(empty.nextNonce, '');

    const written = writeDaemonCommand(tmpDir, 'open-settings', { tab: 'theme' });
    assert.equal(written.cmd, 'open-settings');
    assert.equal(typeof written.nonce, 'string');
    assert.ok(written.nonce.length > 0);

    const first = consumeDaemonCommand(tmpDir, '');
    assert.equal(first.command?.cmd, 'open-settings');
    assert.equal(first.command?.tab, 'theme');
    assert.equal(first.nextNonce, written.nonce);

    // Duplicate poll with same nonce returns null
    const dup = consumeDaemonCommand(tmpDir, first.nextNonce);
    assert.equal(dup.command, null);
    assert.equal(dup.nextNonce, written.nonce);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('buildNewDocumentWrapper defers payload until .agy-shell appears and disconnects observer cleanly', () => {
  const code = buildNewDocumentWrapper('globalThis.__ranCount = (globalThis.__ranCount || 0) + 1;');
  let shellPresent = false;
  let observerCallback = null;
  let disconnected = false;
  let domHandler = null;
  let scheduledTimer = null;
  let clearedTimer = null;

  class MockMutationObserver {
    constructor(cb) {
      observerCallback = cb;
    }
    observe() {}
    disconnect() {
      disconnected = true;
    }
  }

  const sandbox = {
    __ranCount: 0,
    MutationObserver: MockMutationObserver,
    setTimeout: (_fn, _ms) => {
      scheduledTimer = 42;
      return scheduledTimer;
    },
    clearTimeout: (id) => {
      clearedTimer = id;
    },
    document: {
      documentElement: {},
      querySelector: (sel) => (shellPresent && sel === '.agy-shell' ? {} : null),
      addEventListener: (_evt, fn) => {
        domHandler = fn;
      },
      removeEventListener: () => {}
    }
  };

  vm.runInNewContext(code, sandbox);
  assert.equal(sandbox.__ranCount, 0);
  assert.equal(typeof observerCallback, 'function');

  // Mutation before .agy-shell exists does nothing
  observerCallback();
  assert.equal(sandbox.__ranCount, 0);

  // Once .agy-shell renders, payload executes once and cleans up
  shellPresent = true;
  observerCallback();
  if (domHandler) domHandler();
  assert.equal(sandbox.__ranCount, 1);
  assert.equal(disconnected, true);
  assert.equal(clearedTimer, scheduledTimer);
});

test('persistBridgeMessage sanitizes config payloads, rejects non-finite __savedAt stale writes, and restricts media to data:image/', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-ct-sec-'));
  try {
    persistBridgeMessage(
      tmpDir,
      JSON.stringify({ type: 'config', data: { __savedAt: 500, dimming: 30, wallpaperId: 'thunder-samurai' } })
    );

    // NaN __savedAt must NOT overwrite existing timestamped config
    const badTs = persistBridgeMessage(
      tmpDir,
      JSON.stringify({ type: 'config', data: { __savedAt: 'not-a-number', dimming: 10 } })
    );
    assert.equal(badTs, null);

    // New valid config must still be sanitized before writing to disk
    const updated = persistBridgeMessage(
      tmpDir,
      JSON.stringify({
        type: 'config',
        data: { __savedAt: 600, dimming: 999, customCss: 'a{}</style><script>1</script>' }
      })
    );
    assert.equal(updated, 'config');
    const saved = JSON.parse(fs.readFileSync(path.join(tmpDir, 'config.json'), 'utf8'));
    assert.equal(saved.dimming, 92);
    assert.ok(!/<\/style/i.test(saved.customCss));

    // Reject non-image data URIs
    assert.equal(
      persistBridgeMessage(
        tmpDir,
        JSON.stringify({ type: 'media', key: 'wallpaper', dataUrl: 'data:text/html,<script>alert(1)</script>' })
      ),
      null
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('ackDaemonCommand and readDaemonCommandAck coordinate reset before stop, and teardownTarget supports wipeData', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-ct-ack-'));
  try {
    const cmd = writeDaemonCommand(tmpDir, 'reset');
    assert.equal(readDaemonCommandAck(tmpDir)?.nonce, undefined);
    ackDaemonCommand(tmpDir, cmd.nonce, { ok: true });
    assert.equal(readDaemonCommandAck(tmpDir)?.nonce, cmd.nonce);
    assert.equal(readDaemonCommandAck(tmpDir)?.ok, true);

    const evals = [];
    const mockSession = {
      send: async () => ({}),
      evalExpr: async (expr) => {
        evals.push(expr);
        return true;
      }
    };
    await teardownTarget(mockSession, null, { wipeData: true });
    assert.equal(evals.length, 1);
    assert.ok(evals[0].includes('agy_custom_theme_v1'));
    assert.ok(evals[0].includes('agy_custom_theme_media_v1'));
    assert.ok(evals[0].includes('agy_ct_glass_cache_v1'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('prepareBundleSource memoizes payload by file mtimes and computeNextPollDelay backs off when sessions are active', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-ct-bundle-cache-'));
  try {
    const distDir = path.join(tmpDir, 'dist');
    const userDir = path.join(tmpDir, 'user-data');
    fs.mkdirSync(distDir, { recursive: true });
    fs.mkdirSync(userDir, { recursive: true });

    const bundleFile = path.join(distDir, 'antigravity-theme.js');
    const cfgFile = path.join(userDir, 'config.json');
    fs.writeFileSync(bundleFile, 'console.log("bundle");', 'utf8');
    fs.writeFileSync(cfgFile, JSON.stringify({ enabled: true, accentColor: '#f5c451' }), 'utf8');

    const first = prepareBundleSource({ rootDir: tmpDir, userDataDir: userDir });
    const second = prepareBundleSource({ rootDir: tmpDir, userDataDir: userDir });
    assert.equal(first.fromCache, false);
    assert.equal(second.fromCache, true);
    assert.equal(first.payload, second.payload);

    fs.writeFileSync(cfgFile, JSON.stringify({ enabled: true, accentColor: '#22d3ee' }), 'utf8');
    const future = new Date(Date.now() + 2000);
    fs.utimesSync(cfgFile, future, future);

    const third = prepareBundleSource({ rootDir: tmpDir, userDataDir: userDir });
    assert.equal(third.fromCache, false);
    assert.ok(third.payload.includes('#22d3ee'));

    assert.equal(computeNextPollDelay({ hasActiveSessions: false, fastPollMs: 1500, idlePollMs: 8000 }), 1500);
    assert.equal(computeNextPollDelay({ hasActiveSessions: true, fastPollMs: 1500, idlePollMs: 8000 }), 8000);

    // prepareBundleSource strips hiddenPets inside MASCOT_TEMPLATES
    fs.writeFileSync(
      bundleFile,
      `const MASCOT_TEMPLATES = {\n  'luffy-anime': {\n    id: 'luffy-anime',\n    embeddedDataUri: 'data:image/webp;base64,PETDATA',\n    render() { return '<svg></svg>'; }\n  }\n};\n`,
      'utf8'
    );
    fs.writeFileSync(cfgFile, JSON.stringify({ enabled: true, hiddenPets: ['luffy-anime'] }), 'utf8');
    const future2 = new Date(Date.now() + 5000);
    fs.utimesSync(bundleFile, future2, future2);
    fs.utimesSync(cfgFile, future2, future2);
    const fourth = prepareBundleSource({ rootDir: tmpDir, userDataDir: userDir });
    assert.ok(!fourth.payload.includes('PETDATA'), 'prepareBundleSource must strip hiddenPets embeddedDataUri');

    // capDaemonLogFile handles missing, small, and oversized log files safely
    const logFile = path.join(userDir, 'daemon.log');
    assert.doesNotThrow(() => capDaemonLogFile(logFile, 512));
    fs.writeFileSync(logFile, `${'old-line-entry\n'.repeat(80)}latest-tail-marker\n`, 'utf8');
    capDaemonLogFile(logFile, 512);
    const trimmed = fs.readFileSync(logFile, 'utf8');
    assert.ok(Buffer.byteLength(trimmed, 'utf8') <= 512, 'capDaemonLogFile must bound log file size');
    assert.ok(trimmed.endsWith('latest-tail-marker\n'), 'capDaemonLogFile must preserve newest tail lines');
    assert.equal(isNodeProcessAlive(process.pid), true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});


