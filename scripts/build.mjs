#!/usr/bin/env node
/**
 * Zero-dependency IIFE bundler for Antigravity 2.x Custom Theme Suite.
 * - Optionally embeds raster/SVG wallpapers (assets/wallpapers/<id>.*) and mascot sprites (assets/pets/<id>.*)
 * - Concatenates src/ modules in dependency order into dist/antigravity-theme.js
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

import { readPackageVersion } from '../daemon/paths.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '..');

export const MODULE_ORDER = [
  'assets/mascots.js',
  'assets/stickers.js',
  'assets/wallpapers-manifest.js',
  'presets/bubbles.js',
  'presets/inputs.js',
  'presets/themes.js',
  'core/config-store.js',
  'core/prebaked-glass.js',
  'core/dom-targets.js',
  'core/surface-engine.js',
  'fx/ambient-canvas.js',
  'fx/pet-stage.js',
  'fx/sticker-layer.js',
  'ui/i18n.js',
  'ui/theme-studio.js',
  'index.js'
];

const ASSET_MIME_MAP = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml'
};

const EMBEDDED_URI_VALUE_RE = "(?:'[^']*'|\"[^\"]*\"|wpSvgUri\\(\\s*`[^`]*`\\s*\\))";

function replaceEmbeddedDataUri(sourceCode, id, replacementExpr) {
  if (typeof id !== 'string' || !/^[a-z0-9-]+$/i.test(id)) return sourceCode;
  const pattern = new RegExp(
    `(id:\\s*(['"])${id}\\2(?:(?!(?:\\}|render\\s*\\())[\\s\\S])*?embeddedDataUri:\\s*)${EMBEDDED_URI_VALUE_RE}`
  );
  return String(sourceCode || '').replace(pattern, (_m, prefix) => `${prefix}${replacementExpr}`);
}

export function compactModuleCode(code) {
  return String(code || '')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/g, (svg) =>
      svg
        .replace(/>\s+</g, '><')
        .replace(/\s{2,}/g, ' ')
        .trim()
    )
    .replace(/^[ \t]*\/\*\*[\s\S]*?\*\/[ \t]*$/gm, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/^[ \t]+/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function stripModuleSyntax(code) {
  return String(code || '')
    .replace(/^\s*import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*import\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*export\s+\{[^}]*\};?\s*$/gm, '')
    .replace(/^\s*export\s+(?=(?:const|let|var|function|async\s+function|class)\b)/gm, '')
    .trim();
}

export function stripHiddenAssets(bundleSource, config) {
  const hiddenWps = Array.isArray(config?.hiddenWallpapers) ? config.hiddenWallpapers : [];
  const hiddenPets = Array.isArray(config?.hiddenPets) ? config.hiddenPets : [];
  let out = String(bundleSource || '');

  const stripListInBlock = (block, list) => {
    let chunk = block;
    for (const id of list) {
      chunk = replaceEmbeddedDataUri(chunk, id, "''");
    }
    return chunk;
  };

  if (hiddenWps.length) {
    const wpArrayRe = /(\bWALLPAPERS\s*=\s*\[[\s\S]*?\];)/;
    if (wpArrayRe.test(out)) {
      out = out.replace(wpArrayRe, (wpBlock) => stripListInBlock(wpBlock, hiddenWps));
    } else if (!/\bMASCOT_TEMPLATES\s*=/.test(out)) {
      out = stripListInBlock(out, hiddenWps);
    }
  }

  if (hiddenPets.length) {
    const petObjRe = /(\bMASCOT_TEMPLATES\s*=\s*\{[\s\S]*?\n\s*\};)/;
    if (petObjRe.test(out)) {
      out = out.replace(petObjRe, (petBlock) => stripListInBlock(petBlock, hiddenPets));
    }
  }

  return out;
}

export function stripDeletedWallpapers(bundleSource, config) {
  return stripHiddenAssets(bundleSource, { hiddenWallpapers: config?.hiddenWallpapers });
}

function collectDiskAssets(dirPath) {
  const map = {};
  if (!fs.existsSync(dirPath)) return map;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    const mime = ASSET_MIME_MAP[ext];
    if (!mime) continue;
    const id = path.basename(entry.name, ext);
    if (!/^[a-z0-9-]+$/i.test(id)) continue;
    const b64 = fs.readFileSync(path.join(dirPath, entry.name)).toString('base64');
    map[id] = `data:${mime};base64,${b64}`;
  }
  return map;
}

function injectEmbeddedDataUris(sourceCode, assetMap) {
  let out = sourceCode;
  for (const [id, dataUri] of Object.entries(assetMap)) {
    out = replaceEmbeddedDataUri(out, id, `'${dataUri}'`);
  }
  return out;
}

export function buildBundle({ rootDir = DEFAULT_ROOT, outFile, moduleFiles = MODULE_ORDER } = {}) {
  const resolvedRoot = path.resolve(rootDir);
  const srcDir = path.join(resolvedRoot, 'src');
  const wallpapersDir = path.join(resolvedRoot, 'assets', 'wallpapers');
  const petsDir = path.join(resolvedRoot, 'assets', 'pets');
  const targetOut = outFile ? path.resolve(outFile) : path.join(resolvedRoot, 'dist', 'antigravity-theme.js');

  const diskWallpapers = collectDiskAssets(wallpapersDir);
  const diskPets = collectDiskAssets(petsDir);

  const parts = [
    '/**',
    ' * Antigravity 2.x Custom Theme Suite (Zero-Patch CDP Bundle)',
    ' * Generated by scripts/build.mjs — zero external dependencies.',
    ' */',
    '(function () {',
    "  'use strict';"
  ];

  for (const rel of moduleFiles) {
    const full = path.join(srcDir, rel);
    let code = fs.readFileSync(full, 'utf8');

    if (rel === 'assets/wallpapers-manifest.js') {
      code = injectEmbeddedDataUris(code, diskWallpapers);
    } else if (rel === 'assets/mascots.js') {
      code = injectEmbeddedDataUris(code, diskPets);
    }

    parts.push(`\n// ===== ${rel} =====`);
    parts.push(compactModuleCode(stripModuleSyntax(code)));
  }

  const pkgPath = path.join(resolvedRoot, 'package.json');
  const version = fs.existsSync(pkgPath)
    ? readPackageVersion(resolvedRoot)
    : readPackageVersion(DEFAULT_ROOT);

  parts.push('\n})();\n');
  const code = parts.join('\n').replaceAll('__AGY_THEME_VERSION__', version);

  fs.mkdirSync(path.dirname(targetOut), { recursive: true });
  fs.writeFileSync(targetOut, code, 'utf8');

  return {
    outFile: targetOut,
    sizeBytes: Buffer.byteLength(code, 'utf8'),
    code
  };
}

const isCliRun = (() => {
  try {
    return fs.realpathSync(process.argv[1] || '') === fs.realpathSync(__filename);
  } catch {
    return false;
  }
})();

if (isCliRun) {
  const checkSyntax = process.argv.includes('--check');
  const res = buildBundle();
  if (checkSyntax) {
    new vm.Script(res.code, { filename: res.outFile });
  }
  const kb = (res.sizeBytes / 1024).toFixed(1);
  console.log(`Built ${res.outFile} (${kb} KB)${checkSyntax ? ' [syntax OK]' : ''}`);
}
