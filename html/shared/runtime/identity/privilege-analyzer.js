/**
 * privilege-analyzer.js
 *
 * Read-only analysis over declared roles/permissions (sourced from the
 * existing Security/Governance layer) to flag privilege drift -- e.g. a
 * user whose observed behavior no longer matches their declared role, or
 * permissions that appear unused. This module does not change any
 * permission; it produces recommendations for a human/admin to act on.
 */

function analyzePrivilegeDrift(userId, deps) {
  deps = deps || {};
  const userProfileEngine = deps.userProfileEngine;
  const behaviorModel = deps.behaviorModel;

  if (!userProfileEngine || !behaviorModel) {
    throw new Error('privilege-analyzer requires userProfileEngine and behaviorModel');
  }

  const profile = userProfileEngine.getProfile(userId);
  const topPanels = behaviorModel.topPanelsForUser(userId, 10);
  const flags = [];

  if (profile.role === 'operator' && topPanels.some(function (p) { return /audit|history/i.test(p.panel); })) {
    flags.push({
      type: 'possible_role_mismatch',
      detail: 'User declared as operator but frequently accesses audit/history panels.',
      suggestion: 'Consider reviewing whether this user should be reclassified as auditor.',
    });
  }

  if (!profile.verticalsUsed || profile.verticalsUsed.length === 0) {
    flags.push({
      type: 'unused_access',
      detail: 'User has provisioned access but no recorded vertical usage.',
      suggestion: 'Confirm access is still needed at next access review.',
    });
  }

  return {
    userId: userId,
    role: profile.role,
    flags: flags,
    generatedAt: new Date().toISOString(),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { analyzePrivilegeDrift: analyzePrivilegeDrift };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.analyzePrivilegeDrift = analyzePrivilegeDrift;
}
