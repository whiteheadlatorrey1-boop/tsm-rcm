'use strict';

const VERSION = '13H.0';

function build(input = {}) {
  const applications = Array.isArray(input.applications)
    ? input.applications
    : [];

  const requisitions = Array.isArray(input.requisitions)
    ? input.requisitions
    : [];

  const assignments = Array.isArray(input.assignments)
    ? input.assignments
    : [];

  return {
    version: VERSION,
    requisitionCount: requisitions.length,
    openRequisitionCount: requisitions.filter(
      x => x.state === 'open'
    ).length,
    applicationCount: applications.length,
    activeApplicationCount: applications.filter(
      x => !['rejected', 'withdrawn', 'closed'].includes(x.state)
    ).length,
    assignmentCount: assignments.length,
    activeAssignmentCount: assignments.filter(
      x => x.state === 'active'
    ).length
  };
}

module.exports = {
  VERSION,
  build
};
