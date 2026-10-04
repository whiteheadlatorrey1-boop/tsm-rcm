'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, '../../html/js/career');
const files = ['tsm-competency-taxonomy.js', 'tsm-employer-job-model.js', 'tsm-job-requirement-normalizer.js'];
const Taxonomy = require(path.join(base, files[0]));
const Model = require(path.join(base, files[1]));
const Norm = require(path.join(base, files[2]));

function deepFreeze(o) {
  Object.keys(o).forEach(k => { if (o[k] && typeof o[k] === 'object') deepFreeze(o[k]); });
  return Object.freeze(o);
}
const rawJob = () => ({
  jobId: 'job-1', employerId: 'emp-1', title: 'L1 Support Analyst', verticalId: 'it',
  provenance: 'job order', capturedAt: '2026-09-29T00:00:00Z',
  requirements: [
    { text: 'ServiceNow', level: 80, necessity: 'required' },
    { competencyId: 'workplace.communication', level: 0.6, necessity: 'preferred' },
    { text: 'Underwater basket weaving', level: 50 }
  ]
});

describe('Phase 8A — Employer + Job Intelligence', function () {
  it('loads as pure modules (no I/O, no globals)', function () {
    files.forEach(f => {
      const src = fs.readFileSync(path.join(base, f), 'utf8');
      assert(!/require\(['"](fs|http|https|child_process|net)['"]\)|\bfetch\(|localStorage|Date\.now|new Date\(|Math\.random/.test(src), f);
    });
    assert.strictEqual(typeof Norm.normalizeJob, 'function');
    assert.strictEqual(typeof Model.createJob, 'function');
    assert.strictEqual(typeof Taxonomy.createTaxonomy, 'function');
  });

  it('does not mutate inputs', function () {
    const input = deepFreeze(rawJob());
    const before = JSON.stringify(input);
    Norm.normalizeJob(input);
    assert.strictEqual(JSON.stringify(input), before);
  });

  it('resolves requirements to competency references; unknown text becomes unmapped', function () {
    const { job, summary } = Norm.normalizeJob(rawJob());
    assert.strictEqual(job.requirements[0].competencyRef, 'it.servicenow.fundamentals');
    assert.strictEqual(job.requirements[1].competencyRef, 'workplace.communication');
    assert.strictEqual(job.requirements[2].status, 'unmapped');
    assert.strictEqual(job.requirements[2].competencyRef, null);
    assert.deepStrictEqual({ t: summary.total, m: summary.mapped, u: summary.unmapped, s: summary.scorable }, { t: 3, m: 2, u: 1, s: 2 });
  });

  it('normalizes 0-1 and 0-100 levels identically', function () {
    assert.strictEqual(Norm.normalizeLevel(0.8), Norm.normalizeLevel(80));
    assert.strictEqual(Norm.normalizeLevel(80), 0.8);
    assert.strictEqual(Norm.normalizeLevel(-1), null);
    assert.strictEqual(Norm.normalizeLevel(101), null);
    assert.strictEqual(Norm.normalizeLevel('abc'), null);
  });

  it('preserves provenance and rawText without inventing them', function () {
    const { job } = Norm.normalizeJob(rawJob());
    assert.strictEqual(job.provenance, 'job order');
    assert.strictEqual(job.requirements[0].rawText, 'ServiceNow');
    const bare = Norm.normalizeJob({ jobId: 'j2', employerId: 'e', title: 'T', requirements: [{ text: 'sap' }] }).job;
    assert.strictEqual(bare.provenance, null);
    assert.strictEqual(bare.capturedAt, null);
    assert.strictEqual(bare.requirements[0].level, null);
    assert.strictEqual(bare.requirements[0].necessity, null);
  });

  it('is deterministic, with a deterministic empty result for no requirements', function () {
    assert.deepStrictEqual(Norm.normalizeJob(rawJob()), Norm.normalizeJob(rawJob()));
    const empty = Norm.normalizeJob({ jobId: 'j3', employerId: 'e', title: 'T' });
    assert.deepStrictEqual(empty.summary, { total: 0, mapped: 0, unmapped: 0, scorable: 0 });
    assert.deepStrictEqual(empty.job.requirements, []);
  });

  it('rejects protected-class fields anywhere in job or requirement input', function () {
    assert.throws(() => Norm.normalizeJob(Object.assign(rawJob(), { graduationYear: 2001 })), /protected attribute/);
    const j = rawJob(); j.requirements[0].gender = 'x';
    assert.throws(() => Norm.normalizeJob(j), /protected attribute/);
    assert.throws(() => Model.createJob({ jobId: 'j', employerId: 'e', title: 'T', Date_Of_Birth: 'x' }), /protected attribute/);
  });

  it('records the taxonomy version on every normalized job', function () {
    assert.strictEqual(Norm.normalizeJob(rawJob()).job.taxonomyVersion, Taxonomy.TAXONOMY_VERSION);
    const custom = Taxonomy.createTaxonomy([{ competencyId: 'x.y', label: 'X Y', dimensionId: 'd', aliases: ['xy'] }], '2.0.0');
    const out = Norm.normalizeJob({ jobId: 'j4', employerId: 'e', title: 'T', requirements: [{ text: 'xy' }] }, { taxonomy: custom });
    assert.strictEqual(out.job.taxonomyVersion, '2.0.0');
    assert.strictEqual(out.job.requirements[0].competencyRef, 'x.y');
  });

  it('extends the taxonomy without changing the requirement schema', function () {
    const keysBefore = Object.keys(Norm.normalizeJob(rawJob()).job.requirements[0]).sort();
    const bigger = Taxonomy.createTaxonomy(Taxonomy.defaultTaxonomy.entries.concat([
      { competencyId: 'm365.excel', label: 'Microsoft Excel', dimensionId: 'workplace', aliases: ['excel'] }
    ]), '1.1.0');
    const out = Norm.normalizeJob({ jobId: 'j5', employerId: 'e', title: 'T', requirements: [{ text: 'Excel', level: 70 }] }, { taxonomy: bigger });
    assert.deepStrictEqual(Object.keys(out.job.requirements[0]).sort(), keysBefore);
    assert.strictEqual(out.job.requirements[0].competencyRef, 'm365.excel');
  });

  it('validates employer and rejects duplicate taxonomy ids', function () {
    assert.throws(() => Model.createEmployer({ name: 'No Id' }), /employerId/);
    assert.strictEqual(Model.createEmployer({ employerId: 'e1', name: 'Acme', verticals: ['it'] }).source, null);
    assert.throws(() => Taxonomy.createTaxonomy([{ competencyId: 'a' }, { competencyId: 'a' }], '1'), /duplicate/);
  });
});
