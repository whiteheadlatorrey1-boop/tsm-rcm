'use strict';

/**
 * L1 Copilot Analyze Batch Job Store
 *
 * Background-job tracking for POST /api/l1-copilot/analyze/batch when a
 * caller submits more tickets than the synchronous threshold. Modeled on
 * server/l1-copilot/audit-store.js's durable file-backed pattern (same
 * DATA_DIR convention -- a Fly Volume mounted at /app/data in production,
 * a local data/ dir otherwise -- and the same atomic write-then-rename
 * save). A separate file rather than reusing the audit store's shape,
 * since job progress isn't governance evidence.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.NODE_ENV === 'production'
  ? '/app/data'
  : path.join(__dirname, '..', '..', 'data');

const FILE_PATH = path.join(DATA_DIR, 'l1-copilot-analyze-jobs.json');
const MAX_JOBS = 200; // bound file growth -- a job's per-record results can be large across up to 100 tickets

function loadJobs() {
  try {
    if (!fs.existsSync(FILE_PATH)) return [];

    const raw = fs.readFileSync(FILE_PATH, 'utf8');
    if (!raw.trim()) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    throw new Error(`Unable to load L1 analyze job records: ${err.message}`);
  }
}

function saveJobs(jobs) {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const tempPath = `${FILE_PATH}.tmp`;

  fs.writeFileSync(tempPath, JSON.stringify(jobs, null, 2), 'utf8');
  fs.renameSync(tempPath, FILE_PATH);
}

function createJob({ tickets, maxTokens, options }) {
  if (!Array.isArray(tickets) || tickets.length === 0) {
    throw new Error('createJob requires a non-empty tickets array');
  }

  const jobs = loadJobs();
  const now = new Date().toISOString();

  const job = {
    id: `L1-ANALYZE-JOB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: 'running',
    total: tickets.length,
    succeeded: 0,
    failed: 0,
    tickets,
    maxTokens: maxTokens || null,
    options: options || null,
    results: new Array(tickets.length).fill(null),
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    error: null
  };

  jobs.push(job);

  const retained = jobs.length > MAX_JOBS ? jobs.slice(-MAX_JOBS) : jobs;
  saveJobs(retained);

  return job;
}

function getJob(jobId) {
  if (!jobId) return null;
  return loadJobs().find(j => j.id === jobId) || null;
}

function updateJob(jobId, patch) {
  const jobs = loadJobs();
  const index = jobs.findIndex(j => j.id === jobId);
  if (index === -1) return null;

  jobs[index] = { ...jobs[index], ...patch, updatedAt: new Date().toISOString() };
  saveJobs(jobs);

  return jobs[index];
}

// Merges one chunk's worth of per-record results into the job's results
// array by index, and recomputes succeeded/failed from the full results
// array every time -- so callers (including the retry path, which only
// reprocesses a subset of indices) never need to track running counts
// themselves.
function applyResults(jobId, chunkResults) {
  const jobs = loadJobs();
  const index = jobs.findIndex(j => j.id === jobId);
  if (index === -1) return null;

  const job = jobs[index];
  chunkResults.forEach(r => { job.results[r.index] = r; });
  job.succeeded = job.results.filter(r => r && r.success === true).length;
  job.failed = job.results.filter(r => r && r.success === false).length;
  job.updatedAt = new Date().toISOString();

  saveJobs(jobs);

  return job;
}

function completeJob(jobId) {
  return updateJob(jobId, { status: 'completed', completedAt: new Date().toISOString() });
}

// Call once at server startup, before any request can reach the analyze
// routes. A job can only be "running" while a server process is actively
// driving its chunk loop -- if the process restarts (deploy, crash) with a
// job still marked "running", that loop is gone and the job will sit stuck
// forever, its unprocessed records permanently null. This reclassifies any
// such orphaned job as "interrupted" so callers can see it's dead (not
// quietly still in progress) and retry it -- the retry route treats
// never-processed (null) records the same as explicit failures, so an
// interrupted job's remaining work is exactly what gets re-run.
function markRunningJobsInterrupted() {
  const jobs = loadJobs();
  const now = new Date().toISOString();
  const markedIds = [];

  jobs.forEach(job => {
    if (job.status === 'running') {
      job.status = 'interrupted';
      job.updatedAt = now;
      markedIds.push(job.id);
    }
  });

  if (markedIds.length > 0) saveJobs(jobs);

  return markedIds;
}

module.exports = {
  FILE_PATH,
  createJob,
  getJob,
  updateJob,
  applyResults,
  completeJob,
  markRunningJobsInterrupted
};
