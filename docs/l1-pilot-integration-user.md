# L1 Copilot <-> ServiceNow: pilot integration service account

What a customer's ServiceNow admin needs to provision for an L1 Copilot
pilot: the tables, operations, fields, and minimum roles the adapter
(`server/l1-copilot/servicenow-adapter.js`) actually calls. Derived directly
from that file's exported, "PRODUCTION L1 SURFACE"-labeled functions — not
from the full adapter module, which also carries PDI/test-only helpers a
real pilot should **not** provision for (see the dedicated section below).

If this doc and `servicenow-adapter.js` ever disagree, the code is
authoritative — this is a snapshot derived from it, not the other way
around.

## Authentication

One of:
- **Basic auth**: a service account's username + password
  (`SERVICENOW_USERNAME` / `SERVICENOW_PASSWORD`)
- **OAuth bearer token** (`SERVICENOW_OAUTH_TOKEN`), preferred over basic
  auth when both are present (`authHeader()` in the adapter)

Every request sets `sysparm_display_value=all` (`snRequest()`) — the service
account needs read access to whatever reference/choice fields are listed
below in their *display* form (e.g. a technician's name, not just their
`sys_id`), not just the raw field.

## Tables and operations the adapter uses

| Table | Operation | Used by | Fields read/written |
|---|---|---|---|
| `incident` | **GET** | `getTicket()`, `getTicketsBatch()` | `number`, `priority`, `caller_id` (-> display name), `short_description`, `assignment_group` (-> display name), `state`, `cmdb_ci` (-> `asset_tag`) |
| `incident` | **PATCH** (`work_notes` field only) | `writeWorkNote()` | `work_notes` (append-only journal field) |
| `incident` | **PATCH** (`comments` field only) | `writeComment()` | `comments` (append-only, customer-visible journal field) |
| `cmdb_ci_hardware` | **GET** | `getAsset()`, `searchAssetsByUser()` | `asset_tag`, `manufacturer` (-> `.name`), `model_id` (-> `.display_name`), `warranty_expiration`, `assigned_to` (-> `.name`), `department` (-> `.name`), `purchase_date`, `install_status`, `location` (-> `.name`) |
| `sc_req_item` (RITM) | **GET** | `getRequestItem()` | `sys_id`, `number`, `request`, `requested_for`, `short_description`, `description`, `state`, `assignment_group`, `assigned_to`, `cat_item` |
| `sc_task` (Catalog Task) | **GET** | `getCatalogTask()`, `getCatalogTasksByRequestItem()` | `sys_id`, `number`, `request_item`, `short_description`, `description`, `state`, `assignment_group`, `assigned_to` |

That's the entire production read surface plus exactly two narrow,
field-scoped writes. **No table is ever created from, deleted from, or has
its `state` directly set by the production L1 surface.**

## Minimum roles

ServiceNow's actual required role for a given table/operation is whatever
the customer's own ACLs say — the adapter doesn't assume a fixed set, and
`fieldMap` is customer-configurable (non-standard field names are config,
not code; see `DEFAULT_FIELD_MAP` in the adapter). That said, in a stock,
unmodified ServiceNow instance:

- **`incident` read + the two journal-field writes above**: the OOB `itil`
  role. This is also what the adapter's own code points at when a write
  silently fails — `writeWorkNote()`'s read-after-write check throws an
  error that explicitly says *"most commonly a missing `sn_incident_write`
  role (or equivalent) on the account, or the incident being in a
  closed/canceled state (state 7 or 8 by default), which the
  incident.work_notes write ACL explicitly excludes"*. If work notes or
  comments aren't landing, check the service account's role against
  whatever that customer's instance actually calls its incident-write ACL
  role first.
- **`cmdb_ci_hardware` read**: `itil` in most instances (ITIL users commonly
  get CI read access for ticket context); narrower instances may gate this
  behind the OOB `asset` role instead.
- **`sc_req_item` / `sc_task` read**: `itil` in most instances; narrower
  Service Catalog ACL configurations may require `catalog` or `sc_user`
  instead.

If a pilot customer wants to scope as tightly as possible rather than grant
`itil`, provision read ACLs on exactly the five tables/fields above plus
write ACLs on `incident.work_notes` and `incident.comments` only, and
nothing else.

## PDI / test-only — not required for a production pilot

`servicenow-adapter.js` also exports a handful of functions under `_pdi`,
explicitly separated from the production surface in the module's own
`module.exports` comment ("PDI / TEST ONLY. These are intentionally isolated
from the production L1 surface."). These exist so acceptance testing against
a non-production developer instance (`scripts/test-servicenow-batch-pdi.js`
and friends) can create and clean up its own test data:

| Table | Operation | Used by |
|---|---|---|
| `incident` | **POST** (create) | `_pdi.createTicket()` |
| `incident` | **PATCH** (`state` field directly) | `_pdi.updateTicketStatus()` |
| `incident` | **DELETE** | `_pdi.deleteTicket()` |

**A production pilot's service account should not be granted create, delete,
or direct state-change rights on `incident`.** Those are only exercised
against a disposable PDI during acceptance testing, never by the real L1
Ticket Copilot UI or any route a technician's session can reach
(`/api/l1-copilot/servicenow/*` in `server.js` only ever calls the
production-surface functions above).

## Source of truth

- Field maps: `DEFAULT_FIELD_MAP` and `RITM_FIELDS`/`SC_TASK_FIELDS` in
  `server/l1-copilot/servicenow-adapter.js`
- Which functions are production vs. PDI-only: the `module.exports` block at
  the bottom of that same file
- Live acceptance evidence against a real PDI (what was actually proven to
  work, including the two real bugs found and fixed along the way):
  `docs/l1-servicenow-acceptance.md`
