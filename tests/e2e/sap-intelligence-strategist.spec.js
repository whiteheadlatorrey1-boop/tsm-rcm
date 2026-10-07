const { test, expect } = require('@playwright/test');

test('SAP Strategist relays canonical intelligence envelope', async ({ page }) => {
  test.setTimeout(60_000);

  await page.setViewportSize({ width: 1920, height: 1080 });

  const catalog = {
    products: [
      { sku: 'SAP-100', list_price: 100, stock_qty: 10, stage: 'Active' },
      { sku: 'SAP-200', list_price: 200, stock_qty: 5, stage: 'EOL Announced' }
    ],
    attention_flags: {
      low_stock: [],
      compliance: []
    }
  };

  const crm = {
    kpis: { pipeline_value: 10000 }
  };

  const cpq = {
    kpis: { quote_value: 5000 }
  };

  const o2c = {
    kpis: { order_value: 20000, credit_holds: 0 }
  };

  await page.addInitScript(({ catalog, crm, cpq, o2c }) => {
    localStorage.setItem('TSM_CATALOG_RELAY', JSON.stringify(catalog));
    localStorage.setItem('TSM_CRM_RELAY', JSON.stringify(crm));
    localStorage.setItem('TSM_CPQ_RELAY', JSON.stringify(cpq));
    localStorage.setItem('TSM_O2C_RELAY', JSON.stringify(o2c));
  }, { catalog, crm, cpq, o2c });

  await page.goto('/html/war-rooms/sap/sap-strategist.html');

  await page.getByRole('button', { name: /Relay to Executive Portal/i }).click();

  const relay = await page.evaluate(() => {
    const raw = localStorage.getItem('TSM_SAP_EXEC_RELAY');
    return raw ? JSON.parse(raw) : null;
  });

  expect(relay).not.toBeNull();

  // Existing SAP presentation contract
  expect(relay.vertical).toBe('sap');
  expect(relay.domain_count).toBe(4);
  expect(relay.total_exposure).toBe(36000);
  expect(relay.domains).toHaveLength(4);

  // New Intelligence contract
  expect(relay.intelligence).not.toBeNull();
  expect(relay.intelligence.schemaVersion).toBe('1.0.0');
  expect(relay.intelligence.vertical).toBe('sap');
  expect(relay.intelligence.metadata.source).toBe('sap-intelligence');
  expect(relay.intelligence.metadata.adapter).toBe('sap-adapter');
  expect(relay.intelligence.governance.approvalRequired).toBe(true);
  expect(relay.intelligence.governance.approved).toBe(false);
  expect(relay.intelligence.writeback.allowed).toBe(false);
  expect(relay.intelligence.writeback.executed).toBe(false);
});
