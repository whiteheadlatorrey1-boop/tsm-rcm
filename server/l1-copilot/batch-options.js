'use strict';

// L1 batch routes (ServiceNow batch-tickets-read, analyze/batch) accept a
// caller-supplied `options` object that is chunking/pacing config for a
// shared backend (a customer's ServiceNow instance, or the LLM provider) --
// without a server-side ceiling, a caller could pass e.g.
// { chunkSize: 500, delayBetweenChunksMs: 0 } and hammer that backend with
// effectively unbounded concurrency and no pacing, regardless of what the
// module's own internal defaults are tuned for.
//
// clampBatchOptions(options, defaults, maxChunkSize, minDelayMs):
//   - chunkSize is capped at maxChunkSize (a caller asking for LESS than the
//     cap, e.g. 1, is left alone -- only the ceiling is enforced)
//   - delayBetweenChunksMs is floored at minDelayMs (a caller asking for
//     MORE pacing than the floor is left alone -- only the floor is enforced)
//   - invalid/non-numeric/missing input for either field falls back to
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

  return merged;
}

module.exports = { clampBatchOptions };
