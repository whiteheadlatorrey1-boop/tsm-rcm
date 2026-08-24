const { test, expect } = require('@playwright/test');

test.describe('Schools Guided How-To runtime contract', () => {
  test('loads the guided workflow and exposes the operating path', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto(
      '/html/war-rooms/schools-command/schools-command.html',
      { waitUntil: 'domcontentloaded' }
    );

    await page.waitForFunction(() =>
      !!window.TSMGuidedHowTo
    );

    await page.waitForSelector('#tsm-guided-how-to');

    const result = await page.evaluate(() => {
      const panel = document.querySelector('#tsm-guided-how-to');

      const steps = Array.from(
        panel.querySelectorAll('.tsm-gh-step')
      ).map(step => ({
        phase: step.querySelector('strong')?.textContent?.trim(),
        description: step.querySelector('small')?.textContent?.trim()
      }));

      return {
        panelPresent: !!panel,
        title: panel.querySelector('h2')?.textContent?.trim(),
        stepCount: steps.length,
        phases: steps.map(x => x.phase),
        steps
      };
    });

    console.log(
      '\nSCHOOLS GUIDED HOW-TO RESULT\n' +
      JSON.stringify(result, null, 2)
    );

    expect(result.panelPresent).toBeTruthy();

    expect(result.stepCount).toBe(9);

    expect(result.phases).toEqual([
      'START',
      'INPUT',
      'ANALYZE',
      'REVIEW',
      'DECIDE',
      'EXECUTE',
      'REPORT',
      'MEASURE',
      'REPEAT'
    ]);
  });

  test('navigates the operator to a matching control', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto(
      '/html/war-rooms/schools-command/schools-command.html',
      { waitUntil: 'domcontentloaded' }
    );

    await page.waitForSelector('#tsm-guided-how-to');

    const result = await page.evaluate(() => {
      const buttons = Array.from(
        document.querySelectorAll('.tsm-gh-step')
      );

      const analyze = buttons.find(
        button =>
          button.querySelector('strong')?.textContent?.trim() === 'ANALYZE'
      );

      if (!analyze) {
        return {
          analyzeStepFound: false
        };
      }

      analyze.click();

      return {
        analyzeStepFound: true,
        helpText:
          document.querySelector('#tsm-gh-help')?.innerText || '',
        goButton:
          !!document.querySelector('#tsm-gh-go')
      };
    });

    console.log(
      '\nSCHOOLS GUIDED HOW-TO CONTROL NAVIGATION\n' +
      JSON.stringify(result, null, 2)
    );

    expect(result.analyzeStepFound).toBeTruthy();
  });

  test('keeps the mission runtime contract intact', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto(
      '/html/war-rooms/schools-command/schools-command.html',
      { waitUntil: 'domcontentloaded' }
    );

    await page.waitForFunction(() =>
      !!window.TSMMissionModel &&
      !!window.TSMMissionStore &&
      !!window.TSMGuidedHowTo
    );

    const result = await page.evaluate(() => {
      const mission = window.TSMMissionModel.createMission({
        vertical: 'schools',
        tenantId: 'guided-how-to-test',
        client: null,

        classification: {
          summary: 'Guided How-To runtime validation',
          anomalies: [
            {
              id: 'guided-how-to-anomaly',
              title: 'Grant documentation exception',
              rootCause: 'Required documentation missing',
              severity: 'HIGH',
              exposure: 10000
            }
          ],
          exposure: 10000,
          exposureCurrency: 'USD',
          source: 'Guided How-To E2E',
          domain: 'SCHOOLS'
        },

        workflow: {
          assignedTo: null,
          queue: null,
          priority: 'High',
          sla: null
        },

        actor: 'guided-how-to-e2e'
      });

      window.TSMMissionStore.saveMission(mission);

      return {
        missionId: mission.id,
        vertical: mission.vertical,
        guidedHowToPresent:
          !!document.querySelector('#tsm-guided-how-to')
      };
    });

    console.log(
      '\nSCHOOLS GUIDED HOW-TO + MISSION RESULT\n' +
      JSON.stringify(result, null, 2)
    );

    expect(result.guidedHowToPresent).toBeTruthy();
    expect(result.vertical).toBe('schools');
    expect(result.missionId).toMatch(/^MSN-SCH-/);
  });
});
