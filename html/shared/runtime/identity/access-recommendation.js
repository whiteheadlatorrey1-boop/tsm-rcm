/**
 * access-recommendation.js
 *
 * Turns privilege-analyzer flags plus role-intelligence profiles into a
 * concrete, human-reviewable recommendation queue for admins -- e.g.
 * 'grant analyst read access to FinOps war room', 'revoke unused
 * Construction module access'. Recommendations are advisory only; nothing
 * in this module grants or revokes access.
 */

function buildAccessRecommendations(userId, deps) {
  deps = deps || {};
  const analyzePrivilegeDrift = deps.analyzePrivilegeDrift;
  const getProfileForRole = deps.getProfileForRole;
  const userProfileEngine = deps.userProfileEngine;
  const behaviorModel = deps.behaviorModel;

  const drift = analyzePrivilegeDrift(userId, { userProfileEngine: userProfileEngine, behaviorModel: behaviorModel });
  const roleProfile = getProfileForRole(drift.role);

  const recommendations = drift.flags.map(function (flag) {
    return {
      userId: userId,
      currentRole: drift.role,
      recommendedView: roleProfile.view,
      flagType: flag.type,
      recommendation: flag.suggestion,
      severity: flag.type === 'possible_role_mismatch' ? 'medium' : 'low',
      status: 'pending_review',
    };
  });

  return {
    userId: userId,
    generatedAt: new Date().toISOString(),
    recommendations: recommendations,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildAccessRecommendations: buildAccessRecommendations };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.buildAccessRecommendations = buildAccessRecommendations;
}
