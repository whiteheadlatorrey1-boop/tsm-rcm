// demo-step.js — shared fail-loud capture helper for demo recordings.
//
// A step runs an action, then checks that the action was real: required controls
// were visible+enabled before it ran, expected elements appeared, on-screen text
// matched, no visible error is shown, and the page actually changed (text and
// screenshot both differ from the previous step unless `same` is set). Any
// failure stops the whole capture immediately and names the step and selector —
// there is no silent skip.
//
// Extracted from capture-l1-flagship-v3.js so other captures (e.g. the
// Intelligence Platform tour, which crosses several apps) get the same
// guarantees instead of clickIfVisible()-style steps that swallow failures.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_ERR_RE = /(evaluation failed|unauthori[sz]ed|not defined|lookup failed|request failed|failed to|is not a function)/i;
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
const pad = (n) => String(n).padStart(3, '0');

// createCapture({ page, browser, outDir, base, errSelector, errRe })
//   page, browser : the Playwright page/browser driving the capture
//   outDir        : frame directory; cleared of *.png before capture starts
//   base          : BASE_URL, stripped from logged URLs
//   errSelector   : CSS selector for visible-error elements (default '.err')
//   errRe         : regex that flags a status string as an error (default DEFAULT_ERR_RE)
function createCapture({ page, browser, outDir, base, errSelector, errRe }) {
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) if (f.endsWith('.png')) fs.unlinkSync(path.join(outDir, f));

  const ERR_SEL = errSelector || '.err';
  const ERR_RE = errRe || DEFAULT_ERR_RE;
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 120)));

  let n = 0, prevShot = null, prevSig = null;
  const log = [];
  const w = (ms) => page.waitForTimeout(ms);

  async function diagnose() {
    return page.evaluate(() => {
      const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      return location.pathname + ' | visible buttons: ' +
        [...document.querySelectorAll('button[id]')].filter(vis).map((e) => e.id + (e.disabled ? '(dis)' : '')).slice(0, 30).join(' ');
    });
  }

  async function fail(id, why) {
    console.error('\n✗ STEP ' + id + ' FAILED: ' + why);
    console.error('  ' + (await diagnose().catch(() => '?')));
    if (pageErrors.length) console.error('  page errors: ' + [...new Set(pageErrors)].join(' | '));
    await browser.close();
    process.exit(1);
  }

  const usable = (sel) => page.locator(sel).first().evaluate((e) => {
    const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.disabled;
  }).catch(() => false);

  // step(label, action, opts)
  //   need           : selectors that must be visible+enabled before the action runs
  //   see            : selectors that must become visible after the action
  //   text           : [selector, regex] — selector's innerText must match regex
  //   statusSelector : a status/result element; checked against errRe and logged
  //   statusKey      : sidecar field name for the status text (default 'status')
  //   record         : { key: selector } — extra on-screen text to log per step
  //   focus          : selector to scroll into view before the screenshot
  //   same           : allow the page text to be unchanged from the previous step
  //   wait           : ms to wait after the action before checking (default 1100)
  async function step(label, action, o = {}) {
    n++;
    const id = pad(n) + '-' + label;
    for (const sel of o.need || []) if (!(await usable(sel))) return fail(id, 'control not visible/enabled before action: ' + sel);
    try { await action(); } catch (e) { return fail(id, 'action threw: ' + e.message.split('\n')[0]); }
    await w(o.wait || 1100);
    for (const sel of o.see || []) {
      try { await page.locator(sel).first().waitFor({ state: 'visible', timeout: 6000 }); }
      catch (e) { return fail(id, 'expected element did not appear: ' + sel); }
    }
    if (o.text) {
      try { await page.waitForFunction(([s, re]) => { const e = document.querySelector(s); return !!e && new RegExp(re, 'i').test(e.innerText); },
              [o.text[0], o.text[1].source], { timeout: 15000 }); }
      catch (e) { return fail(id, o.text[0] + ' never matched ' + o.text[1] + '; shows: ' +
        ((await page.locator(o.text[0]).first().innerText().catch(() => '(missing)')).replace(/\s+/g, ' ').slice(0, 160))); }
    }
    const errs = await page.evaluate((sel) => [...document.querySelectorAll(sel)]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && e.innerText.trim(); })
      .map((e) => e.innerText.trim().slice(0, 80)), ERR_SEL);
    if (errs.length) return fail(id, 'visible error on screen: ' + errs.join(' | '));
    let status;
    if (o.statusSelector) {
      status = (await page.locator(o.statusSelector).first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      if (ERR_RE.test(status)) return fail(id, 'status shows an error: ' + status.slice(0, 140));
    }
    const sig = md5(await page.evaluate(() => document.body.innerText));
    if (!o.same && sig === prevSig) return fail(id, 'the page text did not change after this action (nothing happened)');
    if (o.focus) await page.locator(o.focus).first().scrollIntoViewIfNeeded().catch(() => {});
    await w(250);
    const png = await page.screenshot();
    if (md5(png) === prevShot) return fail(id, 'frame is byte-identical to the previous frame');
    prevShot = md5(png); prevSig = sig;
    fs.writeFileSync(path.join(outDir, id + '.png'), png);
    const extra = {};
    if (o.record) {
      for (const [key, sel] of Object.entries(o.record)) {
        const txt = (await page.locator(sel).first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 200);
        if (txt) extra[key] = txt;
      }
    }
    const statusKey = o.statusKey || 'status';
    log.push({ n, id, url: page.url().replace(base, ''), [statusKey]: status ? status.slice(0, 200) : undefined, ...extra, shot: md5(png).slice(0, 8) });
    console.log('  ✓ ' + id + (status ? '   [' + status.slice(0, 70) + ']' : ''));
  }

  function writeSidecar(sidecarPath) {
    fs.writeFileSync(sidecarPath, JSON.stringify({ capturedAt: new Date().toISOString(), base, frames: log, pageErrors: [...new Set(pageErrors)] }, null, 2));
    return { n, log };
  }

  return { step, writeSidecar, pageErrors, count: () => n };
}

module.exports = { createCapture };
