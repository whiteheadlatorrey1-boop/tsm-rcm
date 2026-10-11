#!/usr/bin/env node
'use strict';
// Adds <script src="/shared/tsm-relay-sync.js"></script> to every page under
// html/ that reads or writes a relay key, so its relays are mirrored through
// the server (see html/shared/tsm-relay-sync.js). Idempotent: a page that
// already has the tag is left alone.
//
//   node scripts/add-relay-sync-tag.js           # apply
//   node scripts/add-relay-sync-tag.js --check   # list pages missing the tag, exit 1 if any
//
// scripts/test-enterprise-relay-sync.js runs the same rule in --check mode, so
// a new relay page without the tag fails `npm test` instead of quietly
// staying single-browser.
const fs = require('fs');
const path = require('path');

const HTML = path.join(__dirname, '..', 'html');
const TAG = '<script src="/shared/tsm-relay-sync.js"></script>';
const SKIP_DIRS = new Set(['node_modules', 'tmp_root', '__pycache__']);
// A quoted relay key, the relay bus, or the kernel relay helper.
const RELAY_KEY = /['"`]((?:TSM|tsm)_[A-Za-z0-9_-]*(?:RELAY|relay)[A-Za-z0-9_-]*|TSM_WAR_ROOM_BRIEF)['"`]/g;
const NOT_KEYS = new Set(['TSM_RELAY_EVENT', 'TSM_RELAY_SYNC', 'TSM_RELAY_SYNC_META', 'TSM_RELAY_SYNC_RELOADED', 'TSM_RELAY_SYNC_OFF']);
const RELAY_API = /TSM\.relay\.(?:read|write)\(|relay\.core\.js|TSM_KERNEL\.(?:setRelay|getRelay)\(/;

function usesRelay(src) {
  if (RELAY_API.test(src)) return true;
  RELAY_KEY.lastIndex = 0;
  let m;
  while ((m = RELAY_KEY.exec(src))) if (!NOT_KEYS.has(m[1])) return true;
  return false;
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function addTag(src) {
  // First thing in <head>, so the pull starts before the page's own scripts.
  const head = src.match(/<head[^>]*>/i);
  if (head) return src.replace(head[0], head[0] + '\n' + TAG);
  const firstScript = src.search(/<script[\s>]/i);
  if (firstScript !== -1) return src.slice(0, firstScript) + TAG + '\n' + src.slice(firstScript);
  return null;
}

function relayPages() {
  return walk(HTML).filter(f => usesRelay(fs.readFileSync(f, 'utf8'))).sort();
}

function missingTag() {
  return relayPages().filter(f => !fs.readFileSync(f, 'utf8').includes(TAG));
}

if (require.main === module) {
  const check = process.argv.includes('--check');
  const missing = missingTag();
  if (check) {
    missing.forEach(f => console.log('missing relay sync tag: ' + path.relative(path.join(HTML, '..'), f)));
    console.log(relayPages().length + ' relay pages, ' + missing.length + ' without the tag');
    process.exit(missing.length ? 1 : 0);
  }
  let added = 0, skipped = [];
  for (const f of missing) {
    const out = addTag(fs.readFileSync(f, 'utf8'));
    if (out === null) { skipped.push(f); continue; }
    fs.writeFileSync(f, out);
    added += 1;
  }
  skipped.forEach(f => console.log('no <head> or <script> to anchor on, skipped: ' + path.relative(path.join(HTML, '..'), f)));
  console.log('added the relay sync tag to ' + added + ' page(s); ' + relayPages().length + ' relay pages in total');
  process.exit(skipped.length ? 1 : 0);
}

module.exports = { TAG, usesRelay, relayPages, missingTag, addTag };
