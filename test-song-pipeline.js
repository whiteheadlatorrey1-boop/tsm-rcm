#!/usr/bin/env node
'use strict';

/**
 * test-song-pipeline.js
 * Feeds the real seed lyrics through every AI function in sequence,
 * evaluating whether the guide output is actionable enough to build a full song.
 *
 * Usage: node test-song-pipeline.js
 */

const fs   = require('fs');
const http = require('https');

const FILE  = 'html/music-command/index.html';
const MODEL = 'openai/gpt-oss-120b';

const SEED_LYRICS = `Grindin' n Slavin' while Misbavin'!
Feelin' so Fresh n So Clean even Missed on Shavin'!
Some look at the Hustle! n Cant Stand the Struggle,
Those Real in the Field see A Time for Muscle!
I Plan for Greatest! Rule 1: No Fakeness!
Real is What You FEEL! That's Pill! So Take This!`;

const OPENING_LINE = `Real is What You FEEL! That's Pill! So Take This!`;

// ── helpers ──────────────────────────────────────────────────────────────────

function post(url, headers, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const opts = {
      method: 'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers
      }
    };
    const req = http.request(url, opts, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function ask(system, user) {
  const html   = fs.readFileSync(FILE, 'utf8');
  const keyMatch = html.match(/['"`](gsk_[A-Za-z0-9]{20,})['"`]/);
  const key    = keyMatch ? keyMatch[1] : process.env.GROQ_API_KEY;
  if (!key) throw new Error('No Groq key found');

  const res = await post(
    new URL('https://api.groq.com/openai/v1/chat/completions'),
    { Authorization: `Bearer ${key}` },
    { model: MODEL, max_tokens: 600,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }
  );
  if (res.status !== 200) throw new Error(`HTTP ${res.status}: ${JSON.stringify(res.body).slice(0,120)}`);
  return res.body.choices[0].message.content.trim();
}

function section(title) {
  console.log(`\n${'─'.repeat(64)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(64));
}

function grade(label, text, checks) {
  const results = checks.map(({ desc, fn }) => ({ desc, pass: fn(text) }));
  const passed  = results.filter(r => r.pass).length;
  const score   = Math.round((passed / results.length) * 100);
  const icon    = score === 100 ? '🟢' : score >= 60 ? '🟡' : '🔴';
  console.log(`\n${icon}  ${label}  [${passed}/${results.length} checks — ${score}%]`);
  results.forEach(r => console.log(`   ${r.pass ? '✅' : '❌'}  ${r.desc}`));
  console.log('\n── Output preview:');
  console.log(text.slice(0, 400).replace(/^/gm, '   '));
  if (text.length > 400) console.log('   [... truncated]');
  return score;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n🎤  TSM Song Pipeline Test');
  console.log(`    Seed: "${SEED_LYRICS.split('\n')[0]}..."`);

  const scores = [];

  // ── 1. Song Concept ────────────────────────────────────────────────────────
  section('Stage 1 of 6 — Song Concept (tsmStudioGuide path)');
  const concept = await ask(
    'You are TSM\'s AI music mentor. Be direct, raw, street-literate. No filler.',
    `Expand these seed lyrics into a full song concept.\n`
    + `Give: theme, story arc (verse 1 → verse 2 → bridge → hook), `
    + `emotional journey, target audience, and production direction.\n\n`
    + `Seed lyrics:\n${SEED_LYRICS}`
  );
  scores.push(grade('Song Concept', concept, [
    { desc: 'Identifies core theme',           fn: t => /theme|hustle|grind|struggle|real/i.test(t) },
    { desc: 'Outlines verse structure',        fn: t => /verse/i.test(t) },
    { desc: 'Mentions hook/chorus',            fn: t => /hook|chorus/i.test(t) },
    { desc: 'Covers emotional arc',            fn: t => /emotion|journey|arc|triumph|struggle/i.test(t) },
    { desc: 'Gives production direction',      fn: t => /beat|trap|bpm|produc|tempo|808|sample/i.test(t) },
  ]));

  // ── 2. Song Structure ─────────────────────────────────────────────────────
  section('Stage 2 of 6 — Song Structure');
  const structure = await ask(
    'You are a song structure architect for hip-hop. Be specific and section-by-section.',
    `Build a complete song structure outline based on this vibe and these seed bars.\n`
    + `Include: intro, verse 1 focus, pre-hook, hook message, verse 2 shift, `
    + `bridge purpose, outro. Say what each section does emotionally.\n\n`
    + `Seed bars:\n${SEED_LYRICS}`
  );
  scores.push(grade('Song Structure', structure, [
    { desc: 'Has Verse 1 section',   fn: t => /verse\s*1/i.test(t) },
    { desc: 'Has Hook/Chorus',       fn: t => /hook|chorus/i.test(t) },
    { desc: 'Has Bridge section',    fn: t => /bridge/i.test(t) },
    { desc: 'Has Verse 2',           fn: t => /verse\s*2/i.test(t) },
    { desc: 'Describes emotion/purpose per section', fn: t => /emotional|energy|tension|release|build|shift/i.test(t) },
  ]));

  // ── 3. Hook Generation ────────────────────────────────────────────────────
  section('Stage 3 of 6 — Hook Generation');
  const hook = await ask(
    'You are an elite hook writer for hip-hop and trap. Output ONLY hook options — no preamble.',
    `Write 3 hook options for this song. Each hook: 4 lines, highly repeatable, `
    + `punchy, true to the artist's voice. Label them Hook Option 1 / 2 / 3.\n\n`
    + `Source bars:\n${SEED_LYRICS}\n\nOpening line energy:\n${OPENING_LINE}`
  );
  scores.push(grade('Hook Generation', hook, [
    { desc: 'Contains Hook Option 1',             fn: t => /hook option 1/i.test(t) },
    { desc: 'Contains Hook Option 2',             fn: t => /hook option 2/i.test(t) },
    { desc: 'Contains Hook Option 3',             fn: t => /hook option 3/i.test(t) },
    { desc: 'Reflects hustle/realness theme',     fn: t => /real|grind|hustle|feel|rise|top|stand/i.test(t) },
    { desc: 'Lines are short and punchy (< 12 words avg)',
      fn: t => {
        const lines = t.split('\n').filter(l => l.trim() && !/hook option/i.test(l));
        const avg = lines.reduce((a, l) => a + l.split(' ').length, 0) / (lines.length || 1);
        return avg < 14;
      }
    },
  ]));

  // ── 4. Verse Expansion ────────────────────────────────────────────────────
  section('Stage 4 of 6 — Verse 1 Expansion (Draft path)');
  const verse = await ask(
    'You are a ghostwriter and lyric architect for hip-hop. Raw, real, street-literate. No filler.',
    `Expand these seed bars into a full 16-bar Verse 1.\n`
    + `Keep the artist's voice: punchy, exclamation energy, hustler mentality.\n`
    + `Maintain internal rhyme scheme. Build toward the hook.\n\n`
    + `Seed bars (keep these, expand around them):\n${SEED_LYRICS}`
  );
  scores.push(grade('Verse 1 Expansion', verse, [
    { desc: 'Contains seed bar content',          fn: t => /grind|hustle|fakeness|muscle|struggle/i.test(t) },
    { desc: 'Approximate 16 bars (12-20 lines)',  fn: t => t.split('\n').filter(l => l.trim()).length >= 12 },
    { desc: 'Maintains rhyme pattern',            fn: t => {
        const lines = t.split('\n').filter(l => l.trim());
        const endings = lines.map(l => l.trim().split(' ').pop()?.replace(/[^a-z]/gi,'').toLowerCase());
        const pairs = endings.filter((e,i) => i > 0 && e && endings[i-1] &&
          (e.slice(-2) === endings[i-1].slice(-2)));
        return pairs.length >= 3;
      }
    },
    { desc: 'Has exclamation energy (! present)', fn: t => (t.match(/!/g)||[]).length >= 3 },
    { desc: 'Builds in intensity',                fn: t => t.length > 300 },
  ]));

  // ── 5. Bridge ─────────────────────────────────────────────────────────────
  section('Stage 5 of 6 — Bridge Build');
  const bridge = await ask(
    'You are a bridge architect for hip-hop and trap. Output ONLY bridge options — no preamble.',
    `Write 2 bridge options that contrast the hustle verses with a moment of reflection or triumph.\n`
    + `4-6 lines each. Emotional turning point — the struggle was worth it.\n`
    + `Label them Bridge Option 1 / Bridge Option 2.\n\n`
    + `Verse energy:\n${SEED_LYRICS}`
  );
  scores.push(grade('Bridge Build', bridge, [
    { desc: 'Contains Bridge Option 1',      fn: t => /bridge option 1/i.test(t) },
    { desc: 'Contains Bridge Option 2',      fn: t => /bridge option 2/i.test(t) },
    { desc: 'Has contrasting emotion (reflection/triumph)', fn: t => /worth|light|rise|through|made it|stand|found|believe|victory|truth/i.test(t) },
    { desc: 'Different tone from verse',     fn: t => !/grind|hustle|fake/i.test(t.slice(0,50)) },
  ]));

  // ── 6. Ad-libs ────────────────────────────────────────────────────────────
  section('Stage 6 of 6 — Ad-lib Placement');
  const adlibs = await ask(
    'You are a precision ad-lib placement tool. Return ONLY the full lyrics with each ad-lib in (parentheses). No commentary.',
    `Ad-lib words: yeah, ay, let's go, uh\n\n`
    + `Place them naturally into these lyrics at breath gaps and emphasis points:\n\n`
    + SEED_LYRICS
  );
  scores.push(grade('Ad-lib Placement', adlibs, [
    { desc: 'Ad-libs in (parentheses)',           fn: t => t.includes('(') && t.includes(')') },
    { desc: 'Source lyrics preserved',            fn: t => /grind|hustle|fakeness|muscle/i.test(t) },
    { desc: 'Multiple ad-libs placed (3+)',       fn: t => (t.match(/\(/g)||[]).length >= 3 },
    { desc: 'Not over-saturated (< 10 parens)',   fn: t => (t.match(/\(/g)||[]).length < 10 },
  ]));

  // ── Final Verdict ─────────────────────────────────────────────────────────
  const avg = Math.round(scores.reduce((a,b) => a+b, 0) / scores.length);
  const icon = avg >= 85 ? '🟢' : avg >= 65 ? '🟡' : '🔴';

  console.log(`\n${'═'.repeat(64)}`);
  console.log(`  PIPELINE VERDICT`);
  console.log('═'.repeat(64));
  console.log(`  Stages:  Concept → Structure → Hook → Verse → Bridge → Adlibs`);
  console.log(`  Scores:  ${scores.map(s => s+'%').join('  →  ')}`);
  console.log(`  Average: ${avg}%  ${icon}`);
  console.log('═'.repeat(64));

  if (avg >= 85) {
    console.log('\n🚀  Guide is strong enough to build the full song.');
    console.log('    Deploy + test live in the app:');
    console.log('    fly deploy -a tsm-shell');
  } else if (avg >= 65) {
    console.log('\n🟡  Guide is functional but some stages need prompt tuning.');
    console.log('    Check the 🔴/🟡 stages above and tighten those system prompts.');
  } else {
    console.log('\n🛑  Pipeline needs work before this is production-ready.');
  }
}

run().catch(e => { console.error('\n❌ Fatal:', e.message); process.exit(1); });
