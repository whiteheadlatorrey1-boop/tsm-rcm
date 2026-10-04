/* Phase 8A — Employer / Job / Requirement entities. Pure constructors + validation. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.TSMEmployerJobModel = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PROTECTED_KEYS = [
    'age', 'dob', 'dateofbirth', 'birthdate', 'birthyear', 'graduationyear', 'gradyear',
    'gender', 'sex', 'race', 'ethnicity', 'religion', 'nationality', 'nationalorigin',
    'maritalstatus', 'disability', 'pregnancy', 'veteranstatus', 'photo', 'image',
    'address', 'zip', 'zipcode', 'postalcode', 'candidatename'
  ];
  var NECESSITY = ['required', 'preferred'];
  var STATUS = ['draft', 'open', 'closed'];

  function normKey(k) { return String(k).toLowerCase().replace(/[^a-z0-9]/g, ''); }

  function assertNoProtected(value, path) {
    if (value === null || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(function (v, i) { assertNoProtected(v, path + '[' + i + ']'); });
      return;
    }
    Object.keys(value).forEach(function (k) {
      if (PROTECTED_KEYS.indexOf(normKey(k)) !== -1) {
        throw new Error('protected attribute not allowed: ' + path + '.' + k);
      }
      assertNoProtected(value[k], path + '.' + k);
    });
  }

  function reqString(v, name) {
    if (typeof v !== 'string' || !v.trim()) throw new Error(name + ' required');
    return v;
  }
  function optString(v) { return typeof v === 'string' && v ? v : null; }
  function strArray(v) {
    return Object.freeze((Array.isArray(v) ? v : []).filter(function (x) { return typeof x === 'string' && x; }));
  }

  function createEmployer(input) {
    var i = input || {};
    return Object.freeze({
      employerId: reqString(i.employerId, 'employerId'),
      name: reqString(i.name, 'name'),
      verticals: strArray(i.verticals),
      source: optString(i.source)
    });
  }

  function createRequirement(input) {
    var i = input || {};
    assertNoProtected(i, 'requirement');
    if (i.necessity !== null && i.necessity !== undefined && NECESSITY.indexOf(i.necessity) === -1) {
      throw new Error('necessity must be required | preferred | null');
    }
    var level = i.level === undefined ? null : i.level;
    if (level !== null && (typeof level !== 'number' || !(level >= 0 && level <= 1))) {
      throw new Error('level must be canonical 0-1 or null');
    }
    var status = i.status === 'mapped' ? 'mapped' : 'unmapped';
    var ref = status === 'mapped' ? reqString(i.competencyRef, 'competencyRef') : null;
    return Object.freeze({
      requirementId: reqString(i.requirementId, 'requirementId'),
      jobId: reqString(i.jobId, 'jobId'),
      competencyRef: ref,
      status: status,
      level: level,
      necessity: i.necessity || null,
      evidenceKinds: strArray(i.evidenceKinds),
      rawText: optString(i.rawText)
    });
  }

  function createJob(input) {
    var i = input || {};
    assertNoProtected(i, 'job');
    var status = i.status === undefined || i.status === null ? 'draft' : i.status;
    if (STATUS.indexOf(status) === -1) throw new Error('status must be draft | open | closed');
    var reqs = (Array.isArray(i.requirements) ? i.requirements : []).map(createRequirement);
    return Object.freeze({
      jobId: reqString(i.jobId, 'jobId'),
      employerId: reqString(i.employerId, 'employerId'),
      title: reqString(i.title, 'title'),
      verticalId: optString(i.verticalId),
      roleId: optString(i.roleId),
      status: status,
      provenance: optString(i.provenance),
      capturedAt: optString(i.capturedAt),
      taxonomyVersion: optString(i.taxonomyVersion),
      requirements: Object.freeze(reqs)
    });
  }

  return {
    PROTECTED_KEYS: PROTECTED_KEYS,
    assertNoProtected: assertNoProtected,
    createEmployer: createEmployer,
    createRequirement: createRequirement,
    createJob: createJob
  };
}));
