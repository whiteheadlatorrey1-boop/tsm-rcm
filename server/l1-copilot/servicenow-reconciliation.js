'use strict';

/**
 * Governed ServiceNow reconciliation layer for L1 Copilot.
 *
 * READ ONLY.
 *
 * This module reconciles independently supplied ServiceNow identifiers:
 *
 *   Incident -> Incident record
 *   RITM     -> Request Item -> SC Tasks
 *   Asset    -> CMDB hardware
 *
 * It deliberately does NOT infer an Incident -> RITM relationship because
 * the current Incident adapter contract does not expose a RITM field.
 *
 * It also deliberately keeps ServiceNow-fetched facts separate from
 * technician-confirmed workflow evidence.
 */

const snAdapter = require('./servicenow-adapter');

function normalizeIdentifier(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function buildMismatch(code, field, expected, actual, source) {
  return {
    code,
    field,
    expected: expected ?? null,
    actual: actual ?? null,
    source
  };
}

function compareIfBoth(mismatches, code, field, left, right, leftSource, rightSource) {
  if (
    left !== null &&
    left !== undefined &&
    left !== '' &&
    right !== null &&
    right !== undefined &&
    right !== '' &&
    String(left).toLowerCase() !== String(right).toLowerCase()
  ) {
    mismatches.push(
      buildMismatch(
        code,
        field,
        left,
        right,
        `${leftSource} vs ${rightSource}`
      )
    );
  }
}

async function reconcile(input = {}, config) {
  const incidentId = normalizeIdentifier(input.incident);
  const ritmId = normalizeIdentifier(input.ritm);
  const sctaskId = normalizeIdentifier(input.sctask);
  const assetTag = normalizeIdentifier(input.asset);

  if (!incidentId && !ritmId && !sctaskId && !assetTag) {
    throw new Error(
      'At least one of incident, ritm, sctask, or asset is required.'
    );
  }

  const result = {
    incident: null,
    ritm: null,
    scTasks: [],
    selectedScTask: null,
    asset: null,
    relationships: {
      incidentToRitm: ritmId ? 'EXPLICIT_INPUT' : 'NOT_PROVIDED',
      ritmToScTasks: 'NOT_EVALUATED'
    },
    mismatches: [],
    missingContext: [],
    governed: {
      readOnly: true,
      technicianEvidenceUntouched: true,
      canChangeState: false,
      autonomousCloseAllowed: false
    }
  };

  if (incidentId) {
    result.incident = await snAdapter.getTicket(incidentId, config);

    if (!result.incident) {
      result.missingContext.push({
        source: 'incident',
        identifier: incidentId,
        reason: 'Incident was not found.'
      });
    }
  }

  if (ritmId) {
    result.ritm = await snAdapter.getRequestItem(ritmId, config);

    if (!result.ritm) {
      result.missingContext.push({
        source: 'ritm',
        identifier: ritmId,
        reason: 'RITM was not found.'
      });
    } else {
      result.scTasks = await snAdapter.getCatalogTasksByRequestItem(
        result.ritm.sysId || result.ritm.number,
        config
      );

      result.relationships.ritmToScTasks = 'RESOLVED';
    }
  }

  if (sctaskId) {
    result.selectedScTask = await snAdapter.getCatalogTask(
      sctaskId,
      config
    );

    if (!result.selectedScTask) {
      result.missingContext.push({
        source: 'sc_task',
        identifier: sctaskId,
        reason: 'SC Task was not found.'
      });
    } else if (
      result.ritm &&
      result.selectedScTask.requestItem &&
      result.ritm.sysId &&
      String(result.selectedScTask.requestItem).toLowerCase() !==
        String(result.ritm.sysId).toLowerCase()
    ) {
      result.mismatches.push(
        buildMismatch(
          'SCTASK_RITM_MISMATCH',
          'request_item',
          result.ritm.sysId,
          result.selectedScTask.requestItem,
          'RITM vs SC Task'
        )
      );
    }
  }

  if (assetTag) {
    result.asset = await snAdapter.getAsset(assetTag, config);

    if (!result.asset) {
      result.missingContext.push({
        source: 'asset',
        identifier: assetTag,
        reason: 'Hardware asset was not found.'
      });
    }
  }

  if (result.incident && result.asset) {
    compareIfBoth(
      result.mismatches,
      'INCIDENT_ASSET_MISMATCH',
      'asset',
      result.incident.asset,
      result.asset.assetTag,
      'incident',
      'cmdb'
    );
  }

  if (result.incident && result.ritm) {
    /*
     * No Incident -> RITM relationship is inferred here.
     * The caller explicitly supplied both identifiers, so the relationship
     * is recorded as caller-provided rather than system-derived.
     */
    result.relationships.incidentToRitm = 'EXPLICIT_INPUT';
  }

  return result;
}

module.exports = {
  reconcile
};
