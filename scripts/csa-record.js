'use strict';
// Reads the record JSON from stdin (the page prints the whole command), regrades it, stores it.
const fs = require('fs');
const { getWeightedBlueprint } = require('../server/certification/weighted-blueprints');
const { loadBank } = require('../server/certification/question-bank');
const { parseRecord, regrade, storeResult } = require('../server/certification/sim-record');

const ID = 'servicenow-csa-2026';
try {
  const text = fs.readFileSync(0, 'utf8');
  if (!text.trim()) throw new Error('nothing received. Paste the whole command from the results page, including the EOF lines.');
  const rec = parseRecord(text);
  if (rec.blueprintId !== ID) throw new Error('unexpected blueprint ' + rec.blueprintId);
  const r = regrade(rec, loadBank(ID));
  const file = storeResult(rec, r);
  const exam = getWeightedBlueprint(ID).exam;
  const s = r.graded.simRecord;
  const counts = s.questions >= exam.questions && s.minutes <= exam.minutes && s.unreviewedQuestions === 0;
  console.log('Recorded run ' + rec.seed + ': ' + r.graded.score + '% (' + r.graded.correct + '/' + r.graded.total + '), ' + rec.minutes + ' min');
  console.log('Counts as a full simulation for the gate: ' + (counts ? 'YES' : 'NO (needs ' + exam.questions + '+ questions, within ' + exam.minutes + ' min, and 0 unreviewed; this run has ' + s.unreviewedQuestions + ' unreviewed)'));
  console.log('Evidence rows kept (reviewed questions only): ' + r.evidence.length + ' of ' + r.graded.total);
  console.log('Saved: ' + file);
} catch (e) { console.error('ERROR: ' + e.message); process.exit(1); }
