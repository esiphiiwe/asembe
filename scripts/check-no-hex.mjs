#!/usr/bin/env node
/**
 * Guard against raw hex literals inside app/ and components/.
 *
 * Asambe's color system lives in `tailwind.config.js` + `constants/colors.ts`.
 * UI code must reference tokens via `palette.*` or Tailwind classes — never
 * inline a hex string. This keeps the palette lock from drifting.
 *
 * Run as part of `npm test`. Exits non-zero when a violation is found.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const ROOTS = ['app', 'components'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

// Matches 3, 4, 6, or 8-digit hex color literals inside string quotes.
const HEX_PATTERN = /["'`]#[0-9a-fA-F]{3,8}["'`]/g;

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      walk(full, acc);
      continue;
    }
    const dot = entry.lastIndexOf('.');
    if (dot === -1) continue;
    if (!EXTENSIONS.has(entry.slice(dot))) continue;
    acc.push(full);
  }
  return acc;
}

const violations = [];

for (const root of ROOTS) {
  const abs = join(REPO_ROOT, root);
  let files;
  try {
    files = walk(abs);
  } catch (err) {
    if (err.code === 'ENOENT') continue;
    throw err;
  }
  for (const file of files) {
    const contents = readFileSync(file, 'utf8');
    const lines = contents.split('\n');
    lines.forEach((line, index) => {
      const matches = line.match(HEX_PATTERN);
      if (!matches) return;
      for (const match of matches) {
        violations.push({
          file: relative(REPO_ROOT, file),
          line: index + 1,
          snippet: line.trim(),
          match,
        });
      }
    });
  }
}

if (violations.length > 0) {
  console.error('\n[check-no-hex] Raw hex literals found in app/ or components/:\n');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.match}`);
    console.error(`    ${v.snippet}`);
  }
  console.error(
    '\nReplace the hex with a palette token from constants/colors.ts or a Tailwind class from tailwind.config.js.\n'
  );
  process.exit(1);
}

console.log('[check-no-hex] OK — no raw hex literals in app/ or components/');
