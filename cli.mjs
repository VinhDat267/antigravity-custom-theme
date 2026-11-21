#!/usr/bin/env node
/**
 * Unified CLI for Antigravity 2.x Custom Theme Suite.
 * Subcommands: build | start | stop | status | inject | open-settings | reset | verify
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getDaemonStatus,
  isNodeProcessAlive,
  readDaemonCommandAck,
  readDaemonPid,
  runDaemon,
  runOneShotCommand,
  runOneShotInject,
  writeDaemonCommand
} from './daemon/cdp-daemon.mjs';
import { buildBundle } from './scripts/build.mjs';
import { runVerifyCli } from './scripts/verify-cdp.mjs';
import { migrateLegacyUserData } from './daemon/migrate-legacy.mjs';
import { detectRunMode, homePaths, readPackageVersion, resolveThemeHome } from './daemon/paths.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = __dirname;
const USER_DATA_DIR = resolveThemeHome();

function maybeMigrateLegacySourceData() {
  if (detectRunMode({ rootDir: ROOT_DIR }) !== 'source') return;
  migrateLegacyUserData({
    legacyDir: path.join(ROOT_DIR, 'user-data'),
    homeDir: USER_DATA_DIR,
    log: (line) => console.log(`[migrate] ${line}`)
  });
}

function printHelp() {
  console.log(
    [
      'Antigravity 2.x Custom Theme CLI',
      '',
      'Usage: node cli.mjs <command> [options]',
      '',
      'Commands:',
      '  build [--check]             Build dist/antigravity-theme.js from src/',
      '  start [--foreground]        Start CDP sync daemon (detached by default)',
      '  stop                        Stop running CDP sync daemon cleanly',
      '  status                      Show daemon, port, bundle, and config status',
      '  inject [--one-shot]         Inject/reinject theme into live Antigravity windows',
      '  open-settings [--tab <id>]  Open Custom Theme Studio on active window',
      '  reset [--wipe]              Tear down live theme hooks (optional --wipe deletes saved config)',
      '  verify [--unmounted]        Verify live theme state & Zero Live Blur over CDP',
      '  --version, -v               Print package version'
    ].join('\n')
  );
}

async function waitFor(predicate, timeoutMs = 2000, stepMs = 80) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await new Promise((r) => setTimeout(r, stepMs));
  }
  return predicate();
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd || cmd === '--help' || cmd === '-h') {
    printHelp();
    return;
  }

  if (cmd === '--version' || cmd === '-v') {
    console.log(readPackageVersion(ROOT_DIR));
    return;
  }

  if (cmd === 'build') {
    const res = buildBundle({ rootDir: ROOT_DIR });
    const kb = (res.sizeBytes / 1024).toFixed(1);
    console.log(`Built ${res.outFile} (${kb} KB) [syntax OK]`);
    return;
  }

  if (cmd === 'status') {
    const st = getDaemonStatus({ rootDir: ROOT_DIR, userDataDir: USER_DATA_DIR });
    console.log(JSON.stringify(st, null, 2));
    return;
  }

  if (cmd === 'start') {
    maybeMigrateLegacySourceData();
    const status = getDaemonStatus({ rootDir: ROOT_DIR, userDataDir: USER_DATA_DIR });
    if (status.running) {
      console.log(`CDP daemon already running (PID ${status.pid}).`);
      return;
    }

    if (!status.bundleExists) {
      buildBundle({ rootDir: ROOT_DIR });
    }

    if (args.includes('--foreground')) {
      console.log('Starting Antigravity CDP theme daemon in foreground...');
      await runDaemon({ rootDir: ROOT_DIR, userDataDir: USER_DATA_DIR });
      return;
    }

    const daemonScript = path.join(ROOT_DIR, 'daemon', 'cdp-daemon.mjs');
    const child = spawn(process.execPath, [daemonScript, '--root', ROOT_DIR], {
      detached: true,
      windowsHide: true,
      stdio: 'ignore'
    });
    child.unref();

    const started = await waitFor(() => {
      const pid = readDaemonPid(USER_DATA_DIR);
      return pid && isNodeProcessAlive(pid);
    }, 2500);

    const pid = readDaemonPid(USER_DATA_DIR);
    if (started && pid) {
      console.log(`Started Antigravity CDP theme daemon (PID ${pid}).`);
    } else {
      console.error(`Failed to confirm CDP daemon startup. Check ${homePaths(USER_DATA_DIR).log}.`);
      process.exitCode = 1;
    }
    return;
  }

  if (cmd === 'stop') {
    const pid = readDaemonPid(USER_DATA_DIR);
    if (!pid || !isNodeProcessAlive(pid)) {
      const pidFile = path.join(USER_DATA_DIR, 'daemon.pid');
      if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
      console.log('CDP daemon is not running.');
      return;
    }

    writeDaemonCommand(USER_DATA_DIR, 'stop');
    const exited = await waitFor(() => !isNodeProcessAlive(pid), 2500);
    if (!exited) {
      try {
        process.kill(pid);
      } catch {
        // Ignore if already exited
      }
      await waitFor(() => !isNodeProcessAlive(pid), 1000);
    }
    const pidFile = path.join(USER_DATA_DIR, 'daemon.pid');
    if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
    console.log(`Stopped CDP daemon (PID ${pid}).`);
    return;
  }

  if (cmd === 'inject') {
    maybeMigrateLegacySourceData();
    const bundlePath = path.join(ROOT_DIR, 'dist', 'antigravity-theme.js');
    if (!fs.existsSync(bundlePath) || args.includes('--build')) {
      buildBundle({ rootDir: ROOT_DIR });
    }
    const status = getDaemonStatus({ rootDir: ROOT_DIR, userDataDir: USER_DATA_DIR });
    if (status.running && !args.includes('--one-shot')) {
      writeDaemonCommand(USER_DATA_DIR, 'reinject');
      console.log('Sent reinject command to running CDP daemon.');
      return;
    }
    const res = await runOneShotInject({ rootDir: ROOT_DIR, userDataDir: USER_DATA_DIR });
    console.log(JSON.stringify(res, null, 2));
    if (res.injectedCount === 0) {
      process.exitCode = 1;
    }
    return;
  }

  if (cmd === 'open-settings') {
    let tab = null;
    const tabIdx = args.indexOf('--tab');
    if (tabIdx !== -1 && args[tabIdx + 1]) tab = args[tabIdx + 1];

    const status = getDaemonStatus({ rootDir: ROOT_DIR, userDataDir: USER_DATA_DIR });
    if (status.running) {
      writeDaemonCommand(USER_DATA_DIR, 'open-settings', { tab });
      console.log('Sent open-settings command to running CDP daemon.');
      return;
    }
    const res = await runOneShotCommand({
      rootDir: ROOT_DIR,
      userDataDir: USER_DATA_DIR,
      cmd: 'open-settings',
      tab
    });
    console.log(JSON.stringify(res, null, 2));
    return;
  }

  if (cmd === 'reset') {
    const wipeData = args.includes('--wipe');
    const status = getDaemonStatus({ rootDir: ROOT_DIR, userDataDir: USER_DATA_DIR });
    if (status.running) {
      const issued = writeDaemonCommand(USER_DATA_DIR, 'reset', { wipeData });
      const acked = await waitFor(() => readDaemonCommandAck(USER_DATA_DIR)?.nonce === issued.nonce, 3000, 60);
      if (!acked) {
        await runOneShotCommand({
          rootDir: ROOT_DIR,
          userDataDir: USER_DATA_DIR,
          cmd: 'reset',
          wipeData
        });
      }
      if (wipeData) {
        const cfgPath = path.join(USER_DATA_DIR, 'config.json');
        if (fs.existsSync(cfgPath)) fs.unlinkSync(cfgPath);
        const mediaDir = path.join(USER_DATA_DIR, 'media');
        if (fs.existsSync(mediaDir)) fs.rmSync(mediaDir, { recursive: true, force: true });
      }
      console.log(`Reset completed on open Antigravity windows (${acked ? 'daemon-acked' : 'one-shot-fallback'}).`);
      return;
    }
    const res = await runOneShotCommand({
      rootDir: ROOT_DIR,
      userDataDir: USER_DATA_DIR,
      cmd: 'reset',
      wipeData
    });
    console.log(JSON.stringify(res, null, 2));
    return;
  }

  if (cmd === 'verify') {
    await runVerifyCli(args);
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  printHelp();
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(`[cli] ${err.message}`);
  process.exit(1);
});
