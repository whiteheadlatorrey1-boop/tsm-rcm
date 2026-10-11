'use strict';

const assert = require('assert');
const { getWeightedBlueprint } = require('../server/certification/weighted-blueprints');
const {
  qualifiesAsFullCsaSimulation,
} = require('../server/certification/csa-full-simulation-gate');

const blueprint = getWeightedBlueprint('servicenow-csa-2026');
const exam = blueprint.exam;
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('PASS ' + name);
  } catch (e) {
    failed++;
    console.error('FAIL ' + name + ': ' + e.message);
  }
}

function valid(overrides = {}) {
  return {
    blueprintId: 'servicenow-csa-2026',
    questions: exam.questions,
    minutes: exam.minutes,
    unreviewedQuestions: 0,
    ...overrides,
  };
}

test('accepts a full CSA simulation at exact limits', () => {
  assert.strictEqual(qualifiesAsFullCsaSimulation(valid()), true);
});

test('accepts more than the required question count', () => {
  assert.strictEqual(
    qualifiesAsFullCsaSimulation(valid({ questions: exam.questions + 1 })),
    true
  );
});

test('rejects fewer than the required questions', () => {
  assert.strictEqual(
    qualifiesAsFullCsaSimulation(valid({ questions: exam.questions - 1 })),
    false
  );
});

test('rejects duration above the exam limit', () => {
  assert.strictEqual(
    qualifiesAsFullCsaSimulation(valid({ minutes: exam.minutes + 1 })),
    false
  );
});

test('accepts positive duration within the limit', () => {
  assert.strictEqual(
    qualifiesAsFullCsaSimulation(valid({ minutes: exam.minutes - 1 })),
    true
  );
});

test('rejects zero duration', () => {
  assert.strictEqual(
    qualifiesAsFullCsaSimulation(valid({ minutes: 0 })),
    false
  );
});

test('rejects unreviewed questions', () => {
  assert.strictEqual(
    qualifiesAsFullCsaSimulation(valid({ unreviewedQuestions: 1 })),
    false
  );
});

test('rejects the wrong blueprint', () => {
  assert.strictEqual(
    qualifiesAsFullCsaSimulation(valid({ blueprintId: 'other-blueprint' })),
    false
  );
});

test('rejects missing input', () => {
  assert.strictEqual(qualifiesAsFullCsaSimulation(), false);
});

test('rejects a non-object input', () => {
  assert.strictEqual(qualifiesAsFullCsaSimulation('invalid'), false);
});

test('rejects fractional question counts', () => {
  assert.strictEqual(
    qualifiesAsFullCsaSimulation(valid({ questions: exam.questions + 0.5 })),
    false
  );
});

test('rejects non-finite duration', () => {
  assert.strictEqual(
    qualifiesAsFullCsaSimulation(valid({ minutes: Infinity })),
    false
  );
});

test('rejects missing unreviewed-question count', () => {
  const sim = valid();
  delete sim.unreviewedQuestions;
  assert.strictEqual(qualifiesAsFullCsaSimulation(sim), false);
});

console.log(`\n# pass ${passed}`);
console.log(`# fail ${failed}`);
if (failed) process.exitCode = 1;
