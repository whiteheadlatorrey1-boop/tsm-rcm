'use strict';

// Which ticket indices in an analyze-batch job are eligible for a retry:
//   - a record that explicitly failed (success === false), OR
//   - one that was never processed at all and is still null -- e.g. the
//     job was interrupted by a server restart mid-run (see
//     analyze-job-store.js's markRunningJobsInterrupted()).
// A record that already succeeded is never retried.
//
// Shared by the retry route's "anything to retry?" check and the actual
// retry runner, so the two can't drift out of sync on what counts as
// retryable.
function selectRetryEntries(results, tickets) {
  return (results || [])
    .map((r, index) => ({ r, index }))
    .filter(x => !x.r || x.r.success === false)
    .map(x => ({ index: x.index, ticket: (tickets || [])[x.index] }));
}

module.exports = { selectRetryEntries };
