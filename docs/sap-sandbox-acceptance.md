# SAP Business Accelerator Hub sandbox — read-only acceptance

A new, read-only adapter (`server/enterprise/sap-sandbox-adapter.js`) and
routes (`routes/sap-sandbox.js`) connect to the real **public SAP sandbox
gateway** at `sandbox.api.sap.com` — not a mock, and not a real S/4HANA
tenant. The sandbox serves canned/mocked sample data for two OData
services, authenticated with a single `APIKey` header (no OAuth, no Basic
auth):

- `API_BUSINESS_PARTNER` (`A_BusinessPartner`)
- `API_SALES_ORDER_SRV` (`A_SalesOrder`)

## Scope: read-only, by design

The adapter exports exactly two data-fetching functions —
`getBusinessPartners` and `getSalesOrders` — and nothing else. There is no
write function anywhere in the module, not gated behind a flag, not a
stub: it was simply never implemented, because the only approved use here
is read-only sandbox acceptance. A regression test
(`scripts/test-enterprise-sap-sandbox.js`) asserts the module's exports
never pick up anything shaped like `create`/`update`/`post`/`write`/`delete`.

## SAP_INTEGRATION_ENABLED

Same on/off-switch convention as `SERVICENOW_INTEGRATION_ENABLED`
(`server/l1-copilot/servicenow-adapter.js`): a `SAP_SANDBOX_API_KEY` can
exist in the environment without the integration being live.
`loadConfigFromEnv()` returns `null` — meaning every route 503s with
`SAP_NOT_CONFIGURED` — unless **both** `SAP_INTEGRATION_ENABLED=true` and
`SAP_SANDBOX_API_KEY` are set. Until a deliberate opt-in sets both, this
feature has zero effect on anything else in the app.

**The SAP sandbox key is never set on Fly.** It lives only in
`~/.tsm-sap.env` locally (chmod 600, never printed, never committed) for
local/CI sandbox acceptance — this integration has no production use case
today, only a sandbox-acceptance one.

## Routes

All three are mounted under `/api/enterprise/sap/*` (alongside the other
Enterprise capability routes — see `server.js`'s mount list) and gated
behind `requireAnyAuth`: any authenticated session (staff or client) may
read them, but an unauthenticated caller cannot trigger outbound sandbox
calls using the real API key (rate-limit/abuse concern, not a secrecy
concern — the sandbox itself has no real tenant data).

| Route | Behavior when not configured | Behavior when configured |
|---|---|---|
| `GET /api/enterprise/sap/status` | `{ ok: true, enabled: false }` | `{ ok: true, enabled: true }` |
| `GET /api/enterprise/sap/business-partners?top=N` | `503 SAP_NOT_CONFIGURED` | `200` with normalized rows (`$top` capped at 50) |
| `GET /api/enterprise/sap/sales-orders?top=N` | `503 SAP_NOT_CONFIGURED` | `200` with normalized rows |

## What was proven live

Ran `scripts/test-enterprise-sap-sandbox-live.js` against the real sandbox
(`. ~/.tsm-sap.env; SAP_INTEGRATION_ENABLED=true`): **8/8 passed.**

- `getBusinessPartners({ top: 5 })` returned 5 real sandbox rows, e.g.
  `{"businessPartner":"11","name":"Cust15 Cust15"}`.
- `getSalesOrders({ top: 5 })` returned 5 real sandbox rows, e.g.
  `{"salesOrder":"1","soldToParty":"17100001","totalNetAmount":"52.65","currency":"USD"}`.
- The real HTTP route (`server.js` booted in-process) returned the same
  live data through `GET /api/enterprise/sap/business-partners`, and
  `GET /api/enterprise/sap/status` correctly reflected `enabled: true`.
- Request carries the `APIKey` header (confirmed via the offline fake-fetch
  test, since the live run never needs to inspect its own outgoing
  headers) — not `Authorization: Basic`/`Bearer`, matching the Hub
  sandbox's actual auth contract.

No bugs found — the adapter worked against the real sandbox on the first
live run.

## Test coverage

- `scripts/test-enterprise-sap-sandbox.js` (offline, `global.fetch` faked)
  — config gating, request shape, OData normalization, error surfacing,
  the "no write function exists" guard, and route-level auth/503/200
  behavior. Picked up automatically by `scripts/run-tests.js` (matches the
  existing `test-enterprise-*` discovery pattern).
- `scripts/test-enterprise-sap-sandbox-live.js` — skips cleanly (exit 0)
  unless both `SAP_INTEGRATION_ENABLED=true` and `SAP_SANDBOX_API_KEY` are
  set, so `npm test` stays green everywhere by default. Also picked up by
  `scripts/run-tests.js`'s `test-enterprise-*` pattern, and goes live there
  too if both are set in the environment.
