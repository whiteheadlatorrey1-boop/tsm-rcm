'use strict';

/**
 * TSM Mission → Case Bridge v1
 *
 * Purpose:
 *   Translate BPO Internal1 Mission Store MISSION_CREATED events into
 *   canonical BPO Case Engine records.
 */

const BRIDGE_VERSION = 'v1';
const SOURCE = 'bpo-internal1';

const mappings = new Map();

function isBpoInternal1Mission(mission) {
  if (!mission || typeof mission !== 'object') return false;

  const vertical = String(mission.vertical || '').toLowerCase();
  if (vertical !== 'bpo') return false;

  // Direct property check
  if (mission.source === SOURCE || mission.actor === 'intake-form') {
    return true;
  }

  // Nested metadata check
  if (mission.metadata?.source === SOURCE || mission.metadata?.intakeSource === SOURCE) {
    return true;
  }

  // TSMMissionModel audit array check
  if (Array.isArray(mission.audit)) {
    const hasIntakeActor = mission.audit.some(
      entry => entry && (entry.actor === 'intake-form' || entry.meta?.source === SOURCE)
    );
    if (hasIntakeActor) return true;
  }

  return false;
}

function missionKey(mission) {
  return String(
    mission.id ||
    mission.missionId ||
    ''
  ).trim();
}

function normalizeMissionToCase(mission) {
  const id = missionKey(mission);

  if (!id) {
    throw new Error('Mission → Case bridge requires mission.id');
  }

  const workflow = mission.workflow || {};

  return {
    caseId: `CASE-${id}`,
    missionId: id,
    sector: 'bpo',
    vertical: 'bpo',
    tenantId: mission.tenantId || null,
    client: mission.client || '',
    process: mission.process || mission.workflow?.process || 'BPO',
    source: SOURCE,
    title:
      mission.title ||
      mission.name ||
      `BPO Mission ${id}`,
    description:
      mission.description ||
      mission.summary ||
      '',
    priority:
      workflow.priority ||
      mission.priority ||
      'normal',
    owner:
      workflow.assignedTo ||
      mission.owner ||
      '',
    assignedQueue:
      workflow.queue ||
      mission.queue ||
      '',
    status: 'OPEN',
    fields: {
      missionId: id,
      missionStage: mission.stage || null,
      missionSource: SOURCE,
      bridgeVersion: BRIDGE_VERSION
    },
    bridge: {
      missionId: id,
      source: SOURCE,
      version: BRIDGE_VERSION
    }
  };
}

function install(missionStore, caseAdapter, options = {}) {
  if (!missionStore || typeof missionStore.subscribe !== 'function') {
    throw new Error('Mission Store does not expose subscribe()');
  }

  if (!caseAdapter ||
      typeof caseAdapter.findByMissionId !== 'function' ||
      typeof caseAdapter.createCase !== 'function') {
    throw new Error(
      'Case adapter must expose findByMissionId() and createCase()'
    );
  }

  const logger = options.logger || console;

  const unsubscribe = missionStore.subscribe(
    'MISSION_CREATED',
    async function onMissionCreated(mission) {
      if (!isBpoInternal1Mission(mission)) {
        return;
      }

      const missionId = missionKey(mission);

      if (!missionId) {
        logger.warn('[MissionCaseBridge] Ignoring mission without id');
        return;
      }

      try {
        if (mappings.has(missionId)) {
          logger.info(`[MissionCaseBridge] Already bridged ${missionId}`);
          return mappings.get(missionId);
        }

        const existing = await caseAdapter.findByMissionId(missionId);

        if (existing) {
          mappings.set(missionId, existing);
          logger.info(
            `[MissionCaseBridge] Existing case found for ${missionId}: ` +
            `${existing.caseId || existing.id || 'unknown'}`
          );
          return existing;
        }

        const caseData = normalizeMissionToCase(mission);
        const created = await caseAdapter.createCase(caseData);

        mappings.set(missionId, created);
        logger.info(
          `[MissionCaseBridge] Created case for ${missionId}: ` +
          `${created?.caseId || created?.id || 'unknown'}`
        );
        return created;
      } catch (err) {
        logger.error(`[MissionCaseBridge] Failed for ${missionId}:`, err);
        return null;
      }
    }
  );

  return {
    version: BRIDGE_VERSION,
    source: SOURCE,
    unsubscribe,
    getMapping(missionId) {
      return mappings.get(String(missionId));
    },
    normalizeMissionToCase
  };
}

module.exports = {
  BRIDGE_VERSION,
  SOURCE,
  isBpoInternal1Mission,
  normalizeMissionToCase,
  install
};
