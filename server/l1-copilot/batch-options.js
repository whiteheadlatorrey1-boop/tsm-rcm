'use strict';

// L1 batch routes (ServiceNow batch-tickets-read, analyze/batch) accept a
// caller-supplied `options` object that is chunking/pacing config for a
// shared backend (a customer's ServiceNow instance, or the LLM provider) --
// without a server-side ceiling, a caller could pass e.g.
// { chunkSize: 500, delayBetweenChunksMs: 0 } and hammer that backend with
// effectively unbounded concurrency and no pacing, regardless of what the
// module's own internal defaults are tuned for.
//
// maxRetries/initialBackoffMs get one universal bound across every batch
// route (unlike chunkSize/delay, which vary by backend sensitivity and so
// are parameters, not constants) -- a caller asking a retry loop to hammer
// a backend with e.g. maxRetries: 50 or initialBackoffMs: 1 is the same
// class of problem chunkSize/delayBetweenChunksMs already guard against.
const MAX_RETRIES_CEILING = 3;
const INITIAL_BACKOFF_MIN_MS = 250;
const INITIAL_BACKOFF_MAX_MS = 10000;

// clampBatchOptions(options, defaults, maxChunkSize, minDelayMs):
//   - chunkSize is capped at maxChunkSize (a caller asking for LESS than the
//     cap, e.g. 1, is left alone -- only the ceiling is enforced)
//   - delayBetweenChunksMs is floored at minDelayMs (a caller asking for
//     MORE pacing than the floor is left alone -- only the floor is enforced)
//   - maxRetries, if present (caller-supplied or in `defaults`), is capped
//     at MAX_RETRIES_CEILING; a caller asking for FEWER retries is left
//     alone, same "only enforce the ceiling" rule as chunkSize
//   - initialBackoffMs, if present, is clamped between
//     INITIAL_BACKOFF_MIN_MS and INITIAL_BACKOFF_MAX_MS
//   - maxRetries/initialBackoffMs are only touched when the field is
//     actually present on `defaults` or in the caller's `options` -- a
//     caller of a route whose defaults don't define them (e.g. analyze/batch,
//     whose retry behavior lives in groqChat(), not here) never gets either
//     field invented on the merged result
//   - invalid/non-numeric input for any of the four fields falls back to
//     `defaults`, same as a caller omitting the field entirely
function clampBatchOptions(options, defaults, maxChunkSize, minDelayMs) {
  const merged = Object.assign({}, defaults, options || {});

  const chunkSize = Number(merged.chunkSize);
  merged.chunkSize = Number.isFinite(chunkSize) && chunkSize > 0
    ? Math.min(chunkSize, maxChunkSize)
    : defaults.chunkSize;

  const delay = Number(merged.delayBetweenChunksMs);
  merged.delayBetweenChunksMs = Number.isFinite(delay)
    ? Math.max(delay, minDelayMs)
    : defaults.delayBetweenChunksMs;

  if (merged.maxRetries !== undefined) {
    const maxRetries = Number(merged.maxRetries);
    merged.maxRetries = Number.isFinite(maxRetries) && maxRetries >= 0
      ? Math.min(maxRetries, MAX_RETRIES_CEILING)
      : defaults.maxRetries;
  }

  if (merged.initialBackoffMs !== undefined) {
    const backoff = Number(merged.initialBackoffMs);
    merged.initialBackoffMs = Number.isFinite(backoff)
      ? Math.min(Math.max(backoff, INITIAL_BACKOFF_MIN_MS), INITIAL_BACKOFF_MAX_MS)
      : defaults.initialBackoffMs;
  }

  return merged;
}

module.exports = {
  clampBatchOptions,
  MAX_RETRIES_CEILING,
  INITIAL_BACKOFF_MIN_MS,
  INITIAL_BACKOFF_MAX_MS,
};
