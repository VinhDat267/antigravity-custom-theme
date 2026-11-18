import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildBundle, stripDeletedWallpapers, stripHiddenAssets } from '../scripts/build.mjs';
import { sanitizeImportedConfig } from '../src/core/config-store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const DEFAULT_ROOT_DIR = path.resolve(__dirname, '..');

export const VALID_MEDIA_SLOTS = new Set([
  'wallpaper',
  'wallpaperLight',
  'userAvatar',
  'agentAvatar',
  'pet',
  'sticker'
]);

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

export function resolvePortFile({ platform = process.platform, env = process.env, homedir = os.homedir() } = {}) {
  const override = typeof env?.AGY_PORT_FILE === 'string' ? env.AGY_PORT_FILE.trim() : '';
  if (override) return override;

  if (platform === 'win32') {
    const appData = env?.APPDATA || path.win32.join(homedir, 'AppData', 'Roaming');
    return path.win32.join(appData, 'Antigravity', 'DevToolsActivePort');
  }
  if (platform === 'darwin') {
    return path.posix.join(homedir, 'Library', 'Application Support', 'Antigravity', 'DevToolsActivePort');
  }
  const xdgConfig = env?.XDG_CONFIG_HOME || path.posix.join(homedir, '.config');
  return path.posix.join(xdgConfig, 'Antigravity', 'DevToolsActivePort');
}

export function parsePortFileContent(raw) {
  if (typeof raw !== 'string') return null;
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;
  if (!/^\d+$/.test(lines[0])) return null;
  const port = Number(lines[0]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  const wsPath = lines[1];
  if (!wsPath.startsWith('/')) return null;
  return { port, wsPath };
}

export function readActivePort(opts = {}) {
  const portFile = resolvePortFile(opts);
  try {
    if (!fs.existsSync(portFile)) return null;
    const raw = fs.readFileSync(portFile, 'utf8');
    const parsed = parsePortFileContent(raw);
    if (!parsed) return null;
    return { ...parsed, portFile };
  } catch {
    return null;
  }
}

export function filterAntigravityTargets(targets) {
  if (!Array.isArray(targets)) return [];
  return targets.filter((t) => {
    if (!t || t.type !== 'page') return false;
    if (typeof t.webSocketDebuggerUrl !== 'string' || !t.webSocketDebuggerUrl.startsWith('ws')) {
      return false;
    }
    if (typeof t.url !== 'string' || !t.url) return false;
    try {
      const parsed = new URL(t.url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
      return LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase());
    } catch {
      return false;
    }
  });
}

function atomicWriteFile(filePath, content) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = path.join(dir, `${path.basename(filePath)}.tmp-${process.pid}-${crypto.randomUUID()}`);
  fs.writeFileSync(tmpPath, content, 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function persistBridgeMessage(userDataDir, rawJson) {
  let msg = null;
  try {
    msg = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
  } catch {
    return null;
  }
  if (!msg || typeof msg !== 'object') return null;

  if (msg.type === 'config' || msg.type === 'config-init') {
    if (!msg.data || typeof msg.data !== 'object' || Array.isArray(msg.data)) return null;
    const configPath = path.join(userDataDir, 'config.json');
    const existing = readJsonSafe(configPath);
    const hasValidTs = Number.isFinite(Number(msg.data.__savedAt));
    const nextTs = hasValidTs ? Number(msg.data.__savedAt) : 0;
    if (existing) {
      if (msg.type === 'config-init') return null;
      const prevTs = Number(existing.__savedAt || 0);
      if (!hasValidTs && prevTs > 0) return null;
      if (nextTs < prevTs) return null;
    }
    const clean = sanitizeImportedConfig(msg.data);
    atomicWriteFile(configPath, JSON.stringify(clean, null, 2));
    return 'config';
  }

  if (msg.type === 'media') {
    if (typeof msg.key !== 'string' || !VALID_MEDIA_SLOTS.has(msg.key)) return null;
    const slotPath = path.join(userDataDir, 'media', `${msg.key}.dat`);
    if (msg.dataUrl === null || msg.dataUrl === '' || msg.dataUrl === undefined) {
      if (fs.existsSync(slotPath)) fs.unlinkSync(slotPath);
      return 'media';
    }
    if (typeof msg.dataUrl === 'string' && /^data:image\//i.test(msg.dataUrl)) {
      atomicWriteFile(slotPath, msg.dataUrl);
      return 'media';
    }
    return null;
  }

  return null;
}

export function loadBootPayload(userDataDir) {
  const rawConfig = readJsonSafe(path.join(userDataDir, 'config.json'));
  const config = rawConfig ? sanitizeImportedConfig(rawConfig) : null;
  const media = {};
  for (const slot of VALID_MEDIA_SLOTS) {
    const slotPath = path.join(userDataDir, 'media', `${slot}.dat`);
    try {
      if (fs.existsSync(slotPath)) {
        const val = fs.readFileSync(slotPath, 'utf8').trim();
        if (/^data:image\//i.test(val)) media[slot] = val;
      }
    } catch {
      // Skip unreadable slot
    }
  }
  return { config, media };
}

export function ackDaemonCommand(userDataDir, nonce, extra = {}) {
  if (typeof nonce !== 'string' || !nonce) return null;
  const ack = { ...extra, nonce, at: Date.now() };
  atomicWriteFile(path.join(userDataDir, 'daemon-cmd-ack.json'), JSON.stringify(ack, null, 2));
  return ack;
}

export function readDaemonCommandAck(userDataDir) {
  return readJsonSafe(path.join(userDataDir, 'daemon-cmd-ack.json'));
}

export function writeDaemonCommand(userDataDir, cmd, extra = {}) {
  const payload = {
    ...extra,
    cmd,
    nonce: crypto.randomUUID(),
    at: Date.now()
  };
  atomicWriteFile(path.join(userDataDir, 'daemon-cmd.json'), JSON.stringify(payload, null, 2));
  return payload;
}

export function consumeDaemonCommand(userDataDir, lastNonce = '') {
  const cmdPath = path.join(userDataDir, 'daemon-cmd.json');
  const parsed = readJsonSafe(cmdPath);
  if (!parsed || typeof parsed.cmd !== 'string' || typeof parsed.nonce !== 'string' || !parsed.nonce) {
    return { command: null, nextNonce: lastNonce };
  }
  if (parsed.nonce === lastNonce) {
    return { command: null, nextNonce: lastNonce };
  }
  return { command: parsed, nextNonce: parsed.nonce };
}

export function fetchCdpJson(port, urlPath, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      {
        host: '127.0.0.1',
        port,
        path: urlPath,
        timeout: timeoutMs
      },
      (res) => {
        if ((res.statusCode || 500) >= 400) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode} for ${urlPath}`));
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          try {
            const text = Buffer.concat(chunks).toString('utf8');
            resolve(JSON.parse(text));
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error(`Timeout fetching ${urlPath} from 127.0.0.1:${port}`));
    });
    req.on('error', reject);
  });
}

export async function fetchCdpTargets(port) {
  try {
    return await fetchCdpJson(port, '/json/list');
  } catch {
    return await fetchCdpJson(port, '/json');
  }
}

export class CdpSession {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
    this.eventHandlers = new Map();
    this.closeHandlers = new Set();
    this.closed = false;
  }

  static async connect(wsUrl, timeoutMs = 4000) {
    if (typeof WebSocket !== 'function') {
      throw new Error('Global WebSocket is required (Node.js >= 22.4).');
    }
    const session = new CdpSession(wsUrl);
    await session.#open(timeoutMs);
    return session;
  }

  #open(timeoutMs) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      this.ws = ws;
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          ws.close();
        } catch {
          // Ignore close error on timeout
        }
        reject(new Error(`Timeout connecting CDP WebSocket: ${this.wsUrl}`));
      }, timeoutMs);

      ws.addEventListener('open', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      });

      ws.addEventListener('message', (evt) => {
        this.#handleMessage(evt.data);
      });

      ws.addEventListener('error', (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(new Error(err?.message || `WebSocket connection error: ${this.wsUrl}`));
        }
      });

      ws.addEventListener('close', () => {
        this.closed = true;
        clearTimeout(timer);
        for (const [, p] of this.pending) {
          clearTimeout(p.timer);
          p.reject(new Error('CDP session closed'));
        }
        this.pending.clear();
        for (const fn of this.closeHandlers) fn();
      });
    });
  }

  #handleMessage(rawData) {
    let msg;
    try {
      msg = JSON.parse(typeof rawData === 'string' ? rawData : String(rawData));
    } catch {
      return;
    }
    if (typeof msg.id === 'number') {
      const entry = this.pending.get(msg.id);
      if (!entry) return;
      this.pending.delete(msg.id);
      clearTimeout(entry.timer);
      if (msg.error) {
        entry.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
      } else {
        entry.resolve(msg.result || {});
      }
      return;
    }
    if (msg.method) {
      const listeners = this.eventHandlers.get(msg.method);
      if (listeners) {
        for (const fn of listeners) {
          try {
            fn(msg.params || {});
          } catch {
            // Isolate listener failures
          }
        }
      }
    }
  }

  onEvent(method, handler) {
    if (!this.eventHandlers.has(method)) this.eventHandlers.set(method, new Set());
    this.eventHandlers.get(method).add(handler);
    return () => this.eventHandlers.get(method)?.delete(handler);
  }

  onClose(handler) {
    this.closeHandlers.add(handler);
    return () => this.closeHandlers.delete(handler);
  }

  send(method, params = {}, timeoutMs = 5000) {
    if (this.closed || !this.ws) {
      return Promise.reject(new Error('CDP session is not open'));
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout calling ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evalExpr(expression, { awaitPromise = false, returnByValue = true, timeoutMs = 8000 } = {}) {
    const res = await this.send(
      'Runtime.evaluate',
      {
        expression,
        awaitPromise,
        returnByValue
      },
      timeoutMs
    );
    if (res.exceptionDetails) {
      const text = res.exceptionDetails.exception?.description || res.exceptionDetails.text || 'Evaluation error';
      throw new Error(text);
    }
    return res.result?.value;
  }

  close() {
    this.closed = true;
    try {
      this.ws?.close();
    } catch {
      // Ignore close failures
    }
  }
}

export async function isShellTarget(session) {
  try {
    const found = await session.evalExpr(
      "Boolean(typeof document !== 'undefined' && (document.querySelector('.agy-shell') || document.querySelector('[data-agy-mock-shell]')))"
    );
    return Boolean(found);
  } catch {
    return false;
  }
}

export async function ensureHostBridge(session, userDataDir, boundState = null) {
  if (boundState?.attached) return;
  await session.send('Runtime.enable');
  await session.send('Runtime.addBinding', { name: '__agyThemeBridge' });
  session.onEvent('Runtime.bindingCalled', (params) => {
    if (params?.name === '__agyThemeBridge') {
      persistBridgeMessage(userDataDir, params.payload);
    }
  });
  if (boundState) boundState.attached = true;
}

const BUNDLE_PAYLOAD_CACHE = new Map();

function statSig(filePath) {
  try {
    const st = fs.statSync(filePath);
    return `${st.mtimeMs}:${st.size}`;
  } catch {
    return 'missing';
  }
}

export function computeNextPollDelay({ hasActiveSessions, fastPollMs = 1500, idlePollMs = 8000 } = {}) {
  return hasActiveSessions ? Math.max(fastPollMs, idlePollMs) : fastPollMs;
}

export function prepareBundleSource({ rootDir = DEFAULT_ROOT_DIR, userDataDir } = {}) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedUserDir = path.resolve(userDataDir || path.join(resolvedRoot, 'user-data'));
  const bundlePath = path.join(resolvedRoot, 'dist', 'antigravity-theme.js');
  if (!fs.existsSync(bundlePath)) {
    buildBundle({ rootDir: resolvedRoot, outFile: bundlePath });
  }

  const cacheKey = `${bundlePath}|${resolvedUserDir}`;
  const sigParts = [statSig(bundlePath), statSig(path.join(resolvedUserDir, 'config.json'))];
  for (const slot of VALID_MEDIA_SLOTS) {
    sigParts.push(statSig(path.join(resolvedUserDir, 'media', `${slot}.dat`)));
  }
  const sig = sigParts.join('|');

  const cached = BUNDLE_PAYLOAD_CACHE.get(cacheKey);
  if (cached && cached.sig === sig) {
    return { ...cached.value, fromCache: true };
  }

  const rawBundle = fs.readFileSync(bundlePath, 'utf8');
  const boot = loadBootPayload(resolvedUserDir);
  const strippedBundle = stripHiddenAssets(rawBundle, boot.config);
  const bootPrefix = `window.__AGY_THEME_BOOT__ = ${JSON.stringify(boot)};\n`;
  const value = {
    bundlePath,
    boot,
    payload: `${bootPrefix}${strippedBundle}`
  };
  if (BUNDLE_PAYLOAD_CACHE.size >= 8) BUNDLE_PAYLOAD_CACHE.clear();
  BUNDLE_PAYLOAD_CACHE.set(cacheKey, { sig, value });
  return { ...value, fromCache: false };
}

export function buildNewDocumentWrapper(payload) {
  return `(() => {
    const runMount = () => {
${payload}
    };
    const hasShell = () => Boolean(document && (document.querySelector('.agy-shell') || document.querySelector('[data-agy-mock-shell]')));
    if (hasShell()) {
      runMount();
      return;
    }
    let done = false;
    let observer = null;
    let timer = null;
    const cleanup = () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      document.removeEventListener('DOMContentLoaded', tryMount);
    };
    const tryMount = () => {
      if (done) return;
      if (!hasShell()) return;
      done = true;
      cleanup();
      runMount();
    };
    const root = document.documentElement || document;
    if (typeof MutationObserver === 'function' && root) {
      observer = new MutationObserver(tryMount);
      observer.observe(root, { childList: true, subtree: true });
    }
    document.addEventListener('DOMContentLoaded', tryMount);
    timer = setTimeout(cleanup, 15000);
  })();`;
}

export async function injectTarget(session, { rootDir = DEFAULT_ROOT_DIR, userDataDir, registerNewDocument = false, state = null } = {}) {
  const hasShell = await isShellTarget(session);
  if (!hasShell) return { injected: false, reason: 'no-shell' };

  await ensureHostBridge(session, userDataDir, state);
  const { payload } = prepareBundleSource({ rootDir, userDataDir });

  if (registerNewDocument) {
    try {
      await session.send('Page.enable');
      if (Array.isArray(state?.newDocScriptIds)) {
        for (const sid of state.newDocScriptIds) {
          await session.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: sid }).catch(() => {});
        }
        state.newDocScriptIds = [];
      }
      const added = await session.send('Page.addScriptToEvaluateOnNewDocument', {
        source: buildNewDocumentWrapper(payload)
      });
      if (added?.identifier && state) {
        if (!Array.isArray(state.newDocScriptIds)) state.newDocScriptIds = [];
        state.newDocScriptIds.push(added.identifier);
      }
      if (state && !state.loadListenerAttached) {
        state.loadListenerAttached = true;
        session.onEvent('Page.loadEventFired', () => {
          if (session.closed) return;
          void injectTarget(session, {
            rootDir,
            userDataDir,
            registerNewDocument: false,
            state
          }).catch(() => {});
        });
      }
    } catch {
      // Page domain registration optional if unavailable
    }
  }

  const mounted = await session.evalExpr(
    `${payload}\n;Boolean(window.__AGY_CUSTOM_THEME__ && window.__AGY_CUSTOM_THEME__.isMounted)`
  );
  return { injected: Boolean(mounted), reason: mounted ? 'ok' : 'not-mounted' };
}

export async function teardownTarget(session, state = null, { wipeData = false } = {}) {
  if (Array.isArray(state?.newDocScriptIds)) {
    for (const sid of state.newDocScriptIds) {
      await session.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: sid }).catch(() => {});
    }
    state.newDocScriptIds = [];
  }

  const wipeExpr = wipeData
    ? `
      try { localStorage.removeItem('agy_custom_theme_v1'); } catch {}
      try { localStorage.removeItem('agy_ct_glass_cache_v1'); } catch {}
      try { indexedDB.deleteDatabase('agy_custom_theme_media_v1'); } catch {}
    `
    : '';

  await session.evalExpr(`(() => {
    try { window.__AGY_CUSTOM_THEME__?.destroy?.(); } catch {}
    ${wipeExpr}
    document.querySelectorAll('[data-agy-ct-injected], #agy-ct-styles, #agy-ct-studio-root').forEach((el) => el.remove());
    document.querySelectorAll('.agy-ct-bubble-styled, .agy-ct-input-styled').forEach((el) => {
      el.classList.remove('agy-ct-bubble-styled', 'agy-ct-input-styled');
    });
    const shell = document.querySelector('.agy-shell, [data-agy-mock-shell]');
    if (shell) {
      shell.removeAttribute('data-agy-hole-active');
      shell.removeAttribute('data-agy-ct-themed');
      shell.style.removeProperty('--agy-l-glass-bg');
      shell.style.removeProperty('--agy-hole-clip');
    }
    return !Boolean(window.__AGY_CUSTOM_THEME__);
  })()`).catch(() => false);
}

export async function runOneShotInject({ rootDir = DEFAULT_ROOT_DIR, userDataDir, portFileOpts = {} } = {}) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedUserDir = userDataDir || path.join(resolvedRoot, 'user-data');
  const active = readActivePort(portFileOpts);
  if (!active) {
    throw new Error(`DevToolsActivePort not found or invalid (${resolvePortFile(portFileOpts)})`);
  }

  const allTargets = await fetchCdpTargets(active.port);
  const candidates = filterAntigravityTargets(allTargets);
  let matchedShells = 0;
  let injectedCount = 0;
  const details = [];

  for (const target of candidates) {
    let session;
    try {
      session = await CdpSession.connect(target.webSocketDebuggerUrl);
      const res = await injectTarget(session, {
        rootDir: resolvedRoot,
        userDataDir: resolvedUserDir,
        registerNewDocument: false
      });
      if (res.reason !== 'no-shell') matchedShells += 1;
      if (res.injected) injectedCount += 1;
      details.push({ id: target.id, url: target.url, ...res });
      // Allow syncConfigToHost / initial IndexedDB-to-disk media sync messages to arrive over binding
      if (res.injected) {
        await new Promise((r) => setTimeout(r, 150));
      }
    } catch (err) {
      details.push({ id: target.id, url: target.url, injected: false, reason: err.message });
    } finally {
      session?.close();
    }
  }

  return {
    port: active.port,
    totalTargets: allTargets.length,
    candidatePages: candidates.length,
    matchedShells,
    injectedCount,
    details
  };
}

export async function runOneShotCommand({
  rootDir = DEFAULT_ROOT_DIR,
  userDataDir,
  cmd,
  tab = null,
  wipeData = false,
  portFileOpts = {}
} = {}) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedUserDir = userDataDir || path.join(resolvedRoot, 'user-data');

  if (cmd === 'reset' && wipeData) {
    const cfgPath = path.join(resolvedUserDir, 'config.json');
    if (fs.existsSync(cfgPath)) fs.unlinkSync(cfgPath);
    const mediaDir = path.join(resolvedUserDir, 'media');
    if (fs.existsSync(mediaDir)) fs.rmSync(mediaDir, { recursive: true, force: true });
  }

  const active = readActivePort(portFileOpts);
  if (!active) return { port: null, affected: 0 };

  const allTargets = await fetchCdpTargets(active.port);
  const candidates = filterAntigravityTargets(allTargets);
  let affected = 0;

  for (const target of candidates) {
    let session;
    try {
      session = await CdpSession.connect(target.webSocketDebuggerUrl);
      const hasShell = await isShellTarget(session);
      if (!hasShell) continue;
      if (cmd === 'reset') {
        await teardownTarget(session, null, { wipeData });
        affected += 1;
      } else if (cmd === 'open-settings') {
        const opened = await session.evalExpr(
          `Boolean(window.__AGY_CUSTOM_THEME__?.openSettings(${JSON.stringify(tab)}))`
        );
        if (opened) affected += 1;
      }
    } catch {
      // Ignore unreachable target
    } finally {
      session?.close();
    }
  }

  return { port: active.port, affected };
}

export function isNodeProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  if (pid === process.pid) return true;
  try {
    process.kill(pid, 0);
  } catch {
    return false;
  }

  if (process.platform === 'win32') {
    try {
      const out = execFileSync('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 2000
      });
      return /"?node\.exe"?/i.test(out);
    } catch {
      return false;
    }
  }

  return true;
}

export function readDaemonPid(userDataDir) {
  const pidPath = path.join(userDataDir, 'daemon.pid');
  try {
    if (!fs.existsSync(pidPath)) return null;
    const raw = fs.readFileSync(pidPath, 'utf8').trim();
    const pid = Number(raw);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

export function getDaemonStatus({ rootDir = DEFAULT_ROOT_DIR, userDataDir, portFileOpts = {} } = {}) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedUserDir = userDataDir || path.join(resolvedRoot, 'user-data');
  const pidFile = path.join(resolvedUserDir, 'daemon.pid');
  const pid = readDaemonPid(resolvedUserDir);
  const running = pid ? isNodeProcessAlive(pid) : false;
  const activePort = readActivePort(portFileOpts);
  const bundleExists = fs.existsSync(path.join(resolvedRoot, 'dist', 'antigravity-theme.js'));
  const configExists = fs.existsSync(path.join(resolvedUserDir, 'config.json'));

  return {
    running,
    pid: running ? pid : null,
    stalePid: !running && pid ? pid : null,
    pidFile,
    portFile: resolvePortFile(portFileOpts),
    activePort: activePort ? activePort.port : null,
    bundleExists,
    configExists
  };
}

export function capDaemonLogFile(logPath, maxBytes = 262_144) {
  if (!logPath || !Number.isFinite(maxBytes) || maxBytes < 64) return;
  try {
    const st = fs.statSync(logPath);
    if (st.size <= maxBytes) return;
    const buf = fs.readFileSync(logPath);
    const sliceStart = Math.max(0, buf.length - maxBytes);
    let tail = buf.subarray(sliceStart).toString('utf8');
    const nl = tail.indexOf('\n');
    if (nl !== -1 && nl + 1 < tail.length) {
      tail = tail.slice(nl + 1);
    }
    atomicWriteFile(logPath, tail);
  } catch {
    // Ignore missing or locked log file
  }
}

export async function runDaemon({
  rootDir = DEFAULT_ROOT_DIR,
  userDataDir,
  portFileOpts = {},
  pollMs = 1500
} = {}) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedUserDir = userDataDir || path.join(resolvedRoot, 'user-data');
  fs.mkdirSync(resolvedUserDir, { recursive: true });

  const pidPath = path.join(resolvedUserDir, 'daemon.pid');
  const existingPid = readDaemonPid(resolvedUserDir);
  if (existingPid && existingPid !== process.pid && isNodeProcessAlive(existingPid)) {
    throw new Error(`Daemon already running with PID ${existingPid}`);
  }
  atomicWriteFile(pidPath, String(process.pid));

  const logPath = path.join(resolvedUserDir, 'daemon.log');
  capDaemonLogFile(logPath);
  const writeLog = (line) => {
    try {
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${line}\n`, 'utf8');
    } catch {
      // Ignore logging error
    }
  };

  let currentPort = null;
  let lastCmdNonce = consumeDaemonCommand(resolvedUserDir, '').nextNonce;
  const sessions = new Map(); // targetId -> { session, wsUrl, state }
  let stopping = false;
  let syncBusy = false;

  const closeAllSessions = () => {
    for (const [, entry] of sessions) {
      entry.session.close();
    }
    sessions.clear();
  };

  const syncTargets = async (forceReinject = false) => {
    if (stopping || syncBusy) return;
    syncBusy = true;
    try {
      const active = readActivePort(portFileOpts);
      if (!active) {
        if (currentPort !== null) {
          closeAllSessions();
          currentPort = null;
        }
        return;
      }

      if (currentPort !== active.port) {
        closeAllSessions();
        currentPort = active.port;
        writeLog(`Connected to DevToolsActivePort ${active.port}`);
      }

      let rawTargets = [];
      try {
        rawTargets = await fetchCdpTargets(active.port);
      } catch {
        return;
      }

      const candidates = filterAntigravityTargets(rawTargets);
      const liveIds = new Set(candidates.map((t) => t.id));

      for (const [id, entry] of sessions) {
        if (!liveIds.has(id) || entry.session.closed) {
          entry.session.close();
          sessions.delete(id);
        }
      }

      for (const target of candidates) {
        let entry = sessions.get(target.id);
        if (!entry) {
          try {
            const session = await CdpSession.connect(target.webSocketDebuggerUrl);
            const state = { attached: false, newDocScriptIds: [] };
            session.onClose(() => sessions.delete(target.id));
            const res = await injectTarget(session, {
              rootDir: resolvedRoot,
              userDataDir: resolvedUserDir,
              registerNewDocument: true,
              state
            });
            if (res.reason === 'no-shell') {
              session.close();
              continue;
            }
            sessions.set(target.id, { session, wsUrl: target.webSocketDebuggerUrl, state });
            writeLog(`Injected target ${target.id} (${res.reason})`);
          } catch (err) {
            writeLog(`Target ${target.id} attach skipped: ${err.message}`);
          }
        } else if (forceReinject) {
          try {
            await injectTarget(entry.session, {
              rootDir: resolvedRoot,
              userDataDir: resolvedUserDir,
              registerNewDocument: true,
              state: entry.state
            });
          } catch {
            entry.session.close();
            sessions.delete(target.id);
          }
        }
      }
    } finally {
      syncBusy = false;
    }
  };

  const handleCommands = async () => {
    const { command, nextNonce } = consumeDaemonCommand(resolvedUserDir, lastCmdNonce);
    lastCmdNonce = nextNonce;
    if (!command) return;

    writeLog(`Executing command: ${command.cmd}`);
    if (command.cmd === 'reinject') {
      await syncTargets(true);
      ackDaemonCommand(resolvedUserDir, command.nonce, { ok: true, cmd: 'reinject' });
    } else if (command.cmd === 'open-settings') {
      for (const [, entry] of sessions) {
        await entry.session
          .evalExpr(`window.__AGY_CUSTOM_THEME__?.openSettings(${JSON.stringify(command.tab || null)})`)
          .catch(() => {});
      }
      ackDaemonCommand(resolvedUserDir, command.nonce, { ok: true, cmd: 'open-settings' });
    } else if (command.cmd === 'reset') {
      const wipeData = Boolean(command.wipeData);
      for (const [, entry] of sessions) {
        await teardownTarget(entry.session, entry.state, { wipeData });
      }
      if (wipeData) {
        const cfgPath = path.join(resolvedUserDir, 'config.json');
        if (fs.existsSync(cfgPath)) fs.unlinkSync(cfgPath);
        const mediaDir = path.join(resolvedUserDir, 'media');
        if (fs.existsSync(mediaDir)) fs.rmSync(mediaDir, { recursive: true, force: true });
      }
      ackDaemonCommand(resolvedUserDir, command.nonce, { ok: true, cmd: 'reset' });
    } else if (command.cmd === 'stop') {
      ackDaemonCommand(resolvedUserDir, command.nonce, { ok: true, cmd: 'stop' });
      shutdown();
    }
  };

  const watchers = [];
  let bundleTimer = null;
  const distDir = path.join(resolvedRoot, 'dist');
  fs.mkdirSync(distDir, { recursive: true });

  try {
    const bundleWatcher = fs.watch(distDir, (_evt, fname) => {
      if (fname && fname !== 'antigravity-theme.js') return;
      clearTimeout(bundleTimer);
      bundleTimer = setTimeout(() => void syncTargets(true), 180);
    });
    watchers.push(bundleWatcher);
  } catch {
    // Ignore fs.watch failure on unsupported FS
  }

  try {
    const cmdWatcher = fs.watch(resolvedUserDir, (_evt, fname) => {
      if (!fname || fname === 'daemon-cmd.json') {
        void handleCommands();
      }
    });
    watchers.push(cmdWatcher);
  } catch {
    // Polling fallback handles commands if fs.watch fails
  }

  let portTimer = null;
  try {
    const portFilePath = resolvePortFile(portFileOpts);
    const portFileDir = path.dirname(portFilePath);
    const portFileName = path.basename(portFilePath);
    if (fs.existsSync(portFileDir)) {
      const portWatcher = fs.watch(portFileDir, (_evt, fname) => {
        if (fname && fname !== portFileName) return;
        clearTimeout(portTimer);
        portTimer = setTimeout(() => void syncTargets(false), 120);
      });
      watchers.push(portWatcher);
    }
  } catch {
    // Polling fallback handles DevToolsActivePort updates if fs.watch fails
  }

  let pollTimer = null;
  const scheduleNextPoll = () => {
    if (stopping) return;
    const delay = computeNextPollDelay({
      hasActiveSessions: sessions.size > 0,
      fastPollMs: pollMs,
      idlePollMs: Math.max(pollMs, 8000)
    });
    pollTimer = setTimeout(() => {
      if (stopping) return;
      void handleCommands()
        .then(() => syncTargets(false))
        .finally(scheduleNextPoll);
    }, delay);
  };

  let resolveExit;
  const exitPromise = new Promise((resolve) => {
    resolveExit = resolve;
  });

  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    clearTimeout(pollTimer);
    clearTimeout(portTimer);
    clearTimeout(bundleTimer);
    for (const w of watchers) {
      try {
        w.close();
      } catch {
        // Ignore watcher close error
      }
    }
    closeAllSessions();
    try {
      const pidNow = readDaemonPid(resolvedUserDir);
      if (pidNow === process.pid && fs.existsSync(pidPath)) {
        fs.unlinkSync(pidPath);
      }
    } catch {
      // Ignore PID unlink error
    }
    writeLog('Daemon stopped cleanly');
    resolveExit();
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  await syncTargets(false);
  scheduleNextPoll();
  return exitPromise;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const args = process.argv.slice(2);
  let rootDir = DEFAULT_ROOT_DIR;
  const rootIdx = args.indexOf('--root');
  if (rootIdx !== -1 && args[rootIdx + 1]) rootDir = path.resolve(args[rootIdx + 1]);
  runDaemon({ rootDir }).catch((err) => {
    console.error(`[agy-theme-daemon] ${err.message}`);
    process.exit(1);
  });
}
