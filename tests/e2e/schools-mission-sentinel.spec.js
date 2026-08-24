const { test, expect } = require('@playwright/test');

test.describe('Schools Mission → Sentinel runtime contract', () => {
  test('creates a Schools mission and propagates it to Sentinel relay', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto(
      '/html/war-rooms/schools-command/schools-command.html',
      { waitUntil: 'domcontentloaded' }
    );

    await page.waitForFunction(() =>
      !!window.TSMMissionModel &&
      !!window.TSMMissionStore
    );

    const result = await page.evaluate(() => {
      const mission = window.TSMMissionModel.createMission({
        vertical: 'schools',
        tenantId: 'runtime-test',
        client: null,

        classification: {
          summary: 'Schools runtime mission sentinel test',

          anomalies: [
            {
              id: 'schools-runtime-anomaly-1',
              title: 'Grant compliance exception',
              rootCause: 'Missing required reporting documentation',
              severity: 'HIGH',
              exposure: 25000
            }
          ],

          exposure: 25000,
          exposureCurrency: 'USD',
          source: 'Schools Runtime Contract Test',
          domain: 'SCHOOLS'
        },

        workflow: {
          assignedTo: null,
          queue: null,
          priority: 'High',
          sla: null
        },

        actor: 'schools-runtime-contract-test'
      });

      window.TSMMissionStore.saveMission(mission);

      const raw =
        sessionStorage.getItem('TSM_SCHOOLS_STRATEGIST_RELAY') ||
        localStorage.getItem('TSM_SCHOOLS_STRATEGIST_RELAY');

      const relay = raw ? JSON.parse(raw) : null;

      return {
        missionId: mission.id,
        missionVertical: mission.vertical,

        relayPresent: !!relay,

        relayVertical:
          relay && relay.vertical,

        relayMissionId:
          relay && relay.missionId,

        anomalies:
          relay && relay.anomalies,

        missionAnomaly:
          relay &&
          Array.isArray(relay.anomalies) &&
          relay.anomalies.find(
            anomaly => anomaly && anomaly.missionId === mission.id
          )
      };
    });

    console.log(
      '\nSCHOOLS MISSION → SENTINEL RESULT\n' +
      JSON.stringify(result, null, 2)
    );

    expect(result.missionVertical).toBe('schools');

    expect(result.relayPresent).toBeTruthy();

    expect(result.missionAnomaly).toBeTruthy();

    expect(result.missionAnomaly.vertical)
      .toBe('schools');

    expect(result.relayMissionId).toBe(result.missionId);

    expect(Array.isArray(result.anomalies)).toBeTruthy();

    expect(result.missionAnomaly).toBeTruthy();

    expect(result.missionAnomaly.missionId)
      .toBe(result.missionId);

    // ------------------------------------------------------------
    // Schools browser-path deduplication contract
    // ------------------------------------------------------------
    const dedupeResult = await page.evaluate((missionId) => {
      const store = window.TSMMissionStore;
      const rawBefore =
        sessionStorage.getItem('TSM_SCHOOLS_STRATEGIST_RELAY') ||
        localStorage.getItem('TSM_SCHOOLS_STRATEGIST_RELAY');

      const before = rawBefore ? JSON.parse(rawBefore) : null;

      const beforeMissionAnomalies =
        before &&
        Array.isArray(before.anomalies)
          ? before.anomalies.filter(
              anomaly => anomaly && anomaly.missionId === missionId
            )
          : [];

      const mission = store.getMission
        ? store.getMission(missionId)
        : null;

      if (!mission) {
        throw new Error('Schools mission could not be retrieved for update test');
      }

      const updatedMission = Object.assign({}, mission, {
        stage: 'in_progress'
      });

      store.saveMission(updatedMission);

      const rawAfter =
        sessionStorage.getItem('TSM_SCHOOLS_STRATEGIST_RELAY') ||
        localStorage.getItem('TSM_SCHOOLS_STRATEGIST_RELAY');

      const after = rawAfter ? JSON.parse(rawAfter) : null;

      const afterAnomalies =
        after && Array.isArray(after.anomalies)
          ? after.anomalies
          : [];

      const afterMissionAnomalies =
        afterAnomalies.filter(
          anomaly => anomaly && anomaly.missionId === missionId
        );

      const originalVerticalAnomaly =
        afterAnomalies.find(
          anomaly => anomaly && anomaly.id === 'schools-runtime-anomaly-1'
        );

      return {
        beforeMissionAnomalyCount: beforeMissionAnomalies.length,
        afterMissionAnomalyCount: afterMissionAnomalies.length,
        totalAnomalyCount: afterAnomalies.length,
        originalVerticalAnomalyPreserved: !!originalVerticalAnomaly,
        missionAnomaly: afterMissionAnomalies[0] || null
      };
    }, result.missionId);

    console.log(
      '\nSCHOOLS MISSION → SENTINEL DEDUPLICATION RESULT\n' +
      JSON.stringify(dedupeResult, null, 2)
    );

    expect(dedupeResult.beforeMissionAnomalyCount)
      .toBe(1);

    expect(dedupeResult.afterMissionAnomalyCount)
      .toBe(1);

    expect(dedupeResult.totalAnomalyCount)
      .toBe(2);

    expect(dedupeResult.originalVerticalAnomalyPreserved)
      .toBeTruthy();

    expect(dedupeResult.missionAnomaly.missionId)
      .toBe(result.missionId);
  });
});
