'use strict';

const VERSION = '14H.0';

function build(input = {}) {
  const profiles = Array.isArray(input.profiles)
    ? input.profiles
    : [];

  return {
    version: VERSION,
    profileCount: profiles.length,
    qualificationCount: profiles.reduce(
      (n, p) => n + Number(p.qualificationSignals || 0),
      0
    ),
    gapCount: profiles.reduce(
      (n, p) => n + Number(p.gapSignals || 0),
      0
    ),
    opportunityCount: profiles.reduce(
      (n, p) => n + Number(p.opportunitySignals || 0),
      0
    ),
    humanReviewActionCount: profiles.reduce(
      (n, p) => n + Number(p.humanReviewActions || 0),
      0
    )
  };
}

module.exports = {
  VERSION,
  build
};
