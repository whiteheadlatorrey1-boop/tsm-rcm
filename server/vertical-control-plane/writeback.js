'use strict';

/**
 * Source-system writeback boundary.
 *
 * The control plane may PREPARE a writeback.
 * It may not silently execute an external mutation.
 */

function prepareWriteback(input = {}) {
  return {
    allowed: Boolean(input.allowed),
    executed: false,
    sourceSystem: input.sourceSystem || null,
    operation: input.operation || null,
    payload: input.payload || null,
    requiresApproval: input.requiresApproval !== false,
    preparedAt: new Date().toISOString()
  };
}

function assertWritebackAllowed(writeback = {}) {
  if (!writeback.allowed) {
    throw new Error(
      'Source-system writeback is not authorized by the control plane'
    );
  }

  if (writeback.requiresApproval && !writeback.approved) {
    throw new Error(
      'Source-system writeback requires explicit approval'
    );
  }

  return true;
}

module.exports = {
  prepareWriteback,
  assertWritebackAllowed
};
