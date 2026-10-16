'use strict';

// Shared retry-with-bigger-token-budget logic for a model completion that's
// expected to be a single JSON object. A model response can be broken in
// two different ways that call for two different fixes:
//   - a recoverable quirk (e.g. confidence spelled out as a word instead of
//     a digit) -- `repairFn` patches the text and we re-parse, no retry
//     against the model needed.
//   - genuine truncation (the completion hit its max_tokens budget
//     mid-string/object) -- there's no local fix for that; the only lever
//     is asking the model again with a larger token budget.
//
// `callModel(maxTokens)` must return a Promise<string> (the raw completion).

function stripFences(raw) {
  return raw.replace(/```json|```/g, '').trim();
}

async function parseWithRetry(callModel, maxTokens, repairFn, retryTokenBump, retryTokenCeiling) {
  const raw = await callModel(maxTokens);
  const cleaned = stripFences(raw);

  try {
    return { value: JSON.parse(cleaned), retried: false };
  } catch (parseErr) {
    try {
      return { value: JSON.parse(repairFn(cleaned)), retried: false };
    } catch (repairErr) {
      const retryMaxTokens = Math.min(maxTokens + retryTokenBump, retryTokenCeiling);

      try {
        const retryRaw = await callModel(retryMaxTokens);
        const retryCleaned = stripFences(retryRaw);

        try {
          return { value: JSON.parse(retryCleaned), retried: true, retryMaxTokens };
        } catch (retryParseErr) {
          return { value: JSON.parse(repairFn(retryCleaned)), retried: true, retryMaxTokens };
        }
      } catch (finalErr) {
        const err = new Error(
          `Model returned malformed JSON (${parseErr.message}); auto-repair did not fix it, ` +
          `and a retry with a higher token budget (${retryMaxTokens}) also failed: ${finalErr.message}`
        );
        err.retried = true;
        err.retryMaxTokens = retryMaxTokens;
        throw err;
      }
    }
  }
}

module.exports = { parseWithRetry };
