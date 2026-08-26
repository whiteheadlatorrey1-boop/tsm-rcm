# TSM Consultz — BPO Client Onboarding SOP

## Registering a new client, access code, and client ID (PID)

**Who this is for:** any staff member with `admin` or `manager` role registering
a new client into the BPO pipeline. `analyst` role can view clients but cannot
create, edit, deactivate, or reactivate one — that button won't work for you,
it's not a bug.

**Read this before you register anyone.** There are two different "add a
client" entry points in the app right now. Only one of them is correct.

---

## 0. The one correct path (use this, every time)

**Go to `html/bpo-clients-admin.html` → BPO Clients Admin.**

Do **not** use the "+ New Client" workspace prompt inside the Doc Intake /
Doc Search screen (`tsm-doc-search-multi.html`). That prompt exists for a
different, older purpose — it hits a legacy endpoint (`POST
/api/admin/clients`) that creates a login and access code **only**. It does
not create a record in the BPO client ledger, so a client registered that way
will not show up in BPO Clients Admin, won't get SLA/pricing fields, and
their case rollup reporting will come back empty even though their login
works fine. This is a known trap, not an edge case — it's the normal-looking
button that happens to be the wrong one.

**BPO Clients Admin is correct** because it hits `POST /api/bpo/clients`,
which does both jobs in one call: creates the ledger record *and* creates the
matching login/access code together, so the client's ID lines up 1:1 across
both systems from the start.

---

## 1. Register the client

1. Open **BPO Clients Admin** (`html/bpo-clients-admin.html`). Requires
   `admin` or `manager` login.
2. Click **+ Add Client** (`toggleAddBtn`).
3. Fill in:
   - **Name** — required. This becomes both the display name and the source
     for the client ID (see step 2).
   - **Contact Name / Email / Phone** — optional, but fill these in at
     onboarding time if you have them; there's no bulk-edit later.
4. Click **Create**.
5. An access-code banner appears immediately with the plaintext code. **This
   is the only time you will ever see it.** See step 3 for the handoff rule.

If client creation reports success but no access code appears
(`hasLogin: false` in the response), the ledger record was created but the
login failed silently — see step 5 (Backfill Login) below. Don't leave this
client half-onboarded; fix it in the same session if you can.

---

## 2. Client ID (PID)

The client ID is generated automatically from the name you typed — lowercased,
spaces and punctuation collapsed to hyphens (e.g. "Acme Corp!" → `acme-corp`).
You don't type it yourself.

- If that ID is already taken, the system appends `-2`, `-3`, etc.
  automatically (e.g. a second "Acme Corp" becomes `acme-corp-2`). This
  checks both the ledger and the login registry, so it can't collide with
  either.
- **Write the exact client ID down at onboarding time**, not just the display
  name — you'll need it for support tickets, backfill actions, and any
  cross-vertical linking (step 4). It's shown on the client's card in BPO
  Clients Admin at all times, not just at creation.
- The ID is permanent. There's no rename — if a client's legal name changes
  later, update the **Name** field (editable), but the ID stays as originally
  generated.

---

## 3. Access code handoff

- The access code is shown **once**, in plaintext, immediately after
  creation. It is never stored in plaintext anywhere in the system — only a
  hash. If you close that banner without recording it, it cannot be
  recovered.
- Hand the code directly to the client through a channel you'd trust for a
  password (not a shared spreadsheet, not an unencrypted group chat).
- If a code is lost, compromised, or the client asks for a reset, use
  **Rotate Code** on that client's card — this invalidates the old code
  immediately and generates a new one, shown once the same way. Don't try to
  "look up" a lost code; there's nothing to look up.
- Rotating a code does not touch the client's ID, name, ledger fields, or
  case history — only the credential.

---

## 4. Optional: cross-vertical (Member) linking

Skip this step for a normal single-vertical BPO client — most onboardings
stop at step 3.

Use this only for a multi-vertical engagement where the client is already, or
will be, tracked as a Member (`tenantId`) across other verticals (e.g. a
client with both a BPO engagement and a Healthcare or FinOps engagement under
the same account).

1. On the client's card in BPO Clients Admin, find **Member link**.
2. Pick the Member from the dropdown → **Link**.
3. This takes effect on the client's **next login** — an already-open session
   won't retroactively pick it up.

Once linked, that client's portal rollup switches from single-vertical BPO
numbers to the full cross-vertical view. Unlink from the same panel if the
engagement scope changes.

---

## 5. If a client is missing a login (Create Login)

This applies to:
- Clients created before this ledger existed.
- Any client whose login creation failed silently at create time (rare, but
  possible — see step 1's note above).

1. Find the client in BPO Clients Admin — their card shows a **No Login**
   badge instead of **Has Login**, and a **Create Login** button appears only
   on cards missing one.
2. Click **Create Login**.
3. If a login already exists, this is a safe no-op (`alreadyExisted: true`) —
   you can't accidentally create a duplicate or wipe an existing code. In
   practice you won't see this button at all once a login exists, since it's
   hidden the moment `hasLogin` is true.
4. If it creates a new login, the access code banner appears the same way as
   step 1 — hand it off the same way, immediately, following step 3's rule.

---

## 6. Deactivating / reactivating a client

- **Deactivate** locks the client out of portal login immediately — it does
  not delete their record, cases, or history. Use this for an offboarded or
  paused engagement, not as a way to "clean up" a mistaken registration (see
  next point).
- **Reactivate** restores login access with the same ID and access code
  status as before deactivation — it does not issue a new code.
- If you registered a client by mistake (wrong name, duplicate, test entry),
  deactivating it is currently the only available action — there's no delete.
  Use a clearly-labeled name (e.g. prefix with `TEST-` or `DUPLICATE-`) if you
  need to make a mistaken entry unambiguous rather than leaving a
  same-looking active-looking ghost client in the list.

---

## 7. SLA threshold & pricing tier — not yet self-service

The client ledger supports an **SLA threshold (hours)** and a **pricing
tier** (`standard` / `premium` / `custom`), and Pricing Tier is visible as a
read-only field on the client card in BPO Clients Admin (shows `—` until
set). But as of this writing, **neither field has an edit control anywhere
in the BPO Clients Admin UI** — the server route that sets them
(`PATCH /api/bpo/clients/:id`) exists and works, but nothing in the client-facing
screens calls it for these two fields (only the Member-link panel uses that
same route, for `tenantId`).

Until an edit UI exists: if a new client needs an SLA threshold or pricing
tier set at onboarding, that's a dev/API request, not something you can do
yourself from this screen. Don't tell a client their SLA tracking is active
unless you've confirmed the value was actually set.

---

## Quick reference

| Step | Where | Role required |
|---|---|---|
| Register client + get ID + access code | BPO Clients Admin → + Add Client | admin, manager |
| Rotate a lost/compromised code | BPO Clients Admin → client card → Rotate Code | admin, manager |
| Link to a Member (multi-vertical) | BPO Clients Admin → client card → Member link | admin, manager |
| Backfill a missing login | BPO Clients Admin → client card → Backfill Login | admin, manager |
| Deactivate / reactivate | BPO Clients Admin → client card | admin, manager |
| View clients (no create/edit) | BPO Clients Admin | admin, manager, analyst |

**Do not use** the "+ New Client" prompt inside Doc Intake / Doc Search for
onboarding — see §0.

---

*Verified against live source in `tsm-rcm` repo: `html/bpo-clients-admin.html`,
`server.js` (`/api/bpo/clients*`, `/api/admin/clients*`),
`server/tsm-ledger-service.js` (`bpoCreateClient`, `bpoBackfillClientLogin`,
`bpoUpdateClient`, `bpoSetClientStatus`), and `middleware/client-registry.js`.
Written 2026-08-26. The `/api/admin/clients` legacy path referenced in §0 is
still live in the codebase (used by `tsm-doc-search-multi.html`'s workspace
prompt) — it has not been removed, only flagged here as the wrong tool for
onboarding.*
