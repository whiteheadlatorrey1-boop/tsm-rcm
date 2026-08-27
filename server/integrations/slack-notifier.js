// Slack Incoming Webhook notifier for the BPO relay chain.
//
// This is deliberately the smallest real Slack integration that exists:
// a single outbound POST to an Incoming Webhook URL, not a full Slack App
// (no OAuth, no bot token, no @slack/web-api). Incoming Webhooks are scoped
// to one channel per URL and require no user-facing auth flow, which makes
// this the correct starting point — see html/shared/runtime/integration/
// erp-connector.js for the contrast: a *real* ERP integration (SAP/Oracle/
// Dynamics) would need per-vendor OAuth or BAPI/OData credentials and is
// out of scope here.
//
// Same config-gated pattern as server/l1-copilot/servicenow-adapter.js:
// a customer's SLACK_BPO_WEBHOOK_URL can be set as a real Fly secret ahead
// of time without notifications actually going live —
// SLACK_BPO_NOTIFY_ENABLED is the single on/off switch. Until that's
// 'true', notify() is a silent no-op regardless of what URL is configured.
//
// This module has NO dependency on express/server.js — it can be required
// and unit-tested standalone (see tests/unit/integrations/slack-notifier.test.js).

'use strict';

class SlackNotConfiguredError extends Error {
  constructor() {
    super('Slack BPO notifications are not configured for this environment (missing SLACK_BPO_WEBHOOK_URL or SLACK_BPO_NOTIFY_ENABLED != true).');
    this.name = 'SlackNotConfiguredError';
    this.code = 'SLACK_NOT_CONFIGURED';
  }
}

/**
 * Reads config from env vars unless an explicit config object is passed
 * (multi-tenant callers, or tests, pass their own).
 */
function loadConfigFromEnv() {
  if (process.env.SLACK_BPO_NOTIFY_ENABLED !== 'true') return null;
  const webhookUrl = process.env.SLACK_BPO_WEBHOOK_URL || '';
  if (!webhookUrl) return null;
  return { webhookUrl };
}

function isConfigured(config) {
  const cfg = config || loadConfigFromEnv();
  return !!(cfg && cfg.webhookUrl);
}

/**
 * Builds the Slack Block Kit payload for a BPO work-item event.
 * Kept separate from the network call so tests can assert on the exact
 * message shape without mocking fetch.
 */
function buildMessage(event) {
  const {
    caseId, clientId, vertical, stage, status, slaEventType, actor,
  } = event || {};

  const headline = slaEventType === 'resolved'
    ? `:white_check_mark: BPO case *${caseId}* resolved`
    : slaEventType === 'opened'
      ? `:inbox_tray: New BPO case *${caseId}* opened`
      : `:arrows_counterclockwise: BPO case *${caseId}* advanced to *${stage}*`;

  const context = [
    clientId ? `Client: ${clientId}` : 'Client: (unlinked)',
    `Vertical: ${vertical || 'bpo'}`,
    `Status: ${status || 'unknown'}`,
    actor ? `By: ${actor}` : null,
  ].filter(Boolean).join('  ·  ');

  return {
    text: `${headline} — ${context}`, // fallback for clients that don't render blocks
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: headline } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: context }] },
    ],
  };
}

/**
 * notify(event, config?) -> true if a message was sent, false if
 * notifications are not configured/enabled (silent no-op, not an error —
 * callers in the ledger service should never fail an upsert because Slack
 * isn't set up). Throws only on a real delivery failure (network error or
 * non-2xx from Slack) so callers can choose to log-and-swallow.
 */
async function notify(event, config) {
  const cfg = config || loadConfigFromEnv();
  if (!isConfigured(cfg)) return false;

  const payload = buildMessage(event);
  const res = await fetch(cfg.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`Slack webhook returned HTTP ${res.status}: ${body.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return true;
}

module.exports = {
  notify,
  buildMessage,
  isConfigured,
  loadConfigFromEnv,
  SlackNotConfiguredError,
};
