'use strict';
// node scripts/csa-sim-page.js [--seed N] [--out path/to/file.html]
// Default output: ~/csa-sim/csa-sim.html (outside the repo).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { getWeightedBlueprint } = require('../server/certification/weighted-blueprints');
const { loadBank, validateBank } = require('../server/certification/question-bank');
const { buildSimulation } = require('../server/certification/simulation');
const { renderSimulationPage } = require('../server/certification/sim-page');

const ID = 'servicenow-csa-2026';
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const seedArg = opt('seed');
const seed = seedArg === undefined ? Math.floor(Math.random() * 4294967296) : Number(seedArg);
if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) { console.error('ERROR: --seed must be an integer from 0 to 4294967295'); process.exit(1); }
const out = opt('out') || path.join(os.homedir(), 'csa-sim', 'csa-sim.html');
try {
  const bank = loadBank(ID);
  const problems = validateBank(bank, getWeightedBlueprint(ID));
  if (problems.length) throw new Error('question bank has problems: ' + problems.join('; '));
  const sim = buildSimulation(ID, bank, { seed });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, renderSimulationPage(sim));
  console.log('Wrote ' + out + ' (seed ' + seed + ', ' + sim.items.length + ' questions, ' + sim.items.filter((i) => !i.reviewed).length + ' unreviewed)');
} catch (e) { console.error('ERROR: ' + e.message); process.exit(1); }
