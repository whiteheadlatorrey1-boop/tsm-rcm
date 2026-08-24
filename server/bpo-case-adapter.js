'use strict';

/**
 * BPO Case Adapter
 * Binds server/mission-case-bridge.js to server/tsm-ledger-service.js
 */

function createBpoCaseAdapter(tsmLedger) {
  if (!tsmLedger || typeof tsmLedger.bpoUpsertCase !== 'function') {
    throw new Error('bpoCaseAdapter requires tsmLedger with bpoUpsertCase');
  }

  return {
    async findByMissionId(missionId) {
      const caseId = `CASE-${missionId}`;
      if (typeof tsmLedger.bpoGetCase === 'function') {
        const found = await tsmLedger.bpoGetCase(caseId);
        if (found) return found;
      }
      return null;
    },

    async createCase(caseData) {
      const caseId = caseData.caseId || `CASE-${caseData.missionId}`;
      const actor = caseData.source || 'mission-case-bridge';
      return await tsmLedger.bpoUpsertCase(caseId, caseData, actor);
    }
  };
}

module.exports = { createBpoCaseAdapter };
