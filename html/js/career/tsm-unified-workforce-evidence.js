'use strict';

const VERSION = '14C.0';

function collect(sources = {}) {
  const refs = [];

  for (const value of Object.values(sources)) {
    if (!Array.isArray(value)) {
      continue;
    }

    for (const item of value) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      if (item.evidenceId) {
        refs.push({
          evidenceId: String(item.evidenceId),
          source: String(item.source || ''),
          candidateId: item.candidateId
            ? String(item.candidateId)
            : null,
          workerId: item.workerId
            ? String(item.workerId)
            : null
        });
      }

      if (Array.isArray(item.evidenceRefs)) {
        for (const ref of item.evidenceRefs) {
          refs.push({
            evidenceId: String(ref),
            source: String(item.source || ''),
            candidateId: item.candidateId
              ? String(item.candidateId)
              : null,
            workerId: item.workerId
              ? String(item.workerId)
              : null
          });
        }
      }
    }
  }

  const seen = new Set();

  return refs.filter(ref => {
    if (seen.has(ref.evidenceId)) {
      return false;
    }

    seen.add(ref.evidenceId);
    return true;
  });
}

module.exports = {
  VERSION,
  collect
};
