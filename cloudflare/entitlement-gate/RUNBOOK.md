# Runbook: Provisioning a new vertical subdomain

Use this whenever you sell a new vertical and need to spin up its own
`*.tsmatter.com` subdomain, gated so it only shows the vertical the
customer is paying for.

Reference example already live: `insurance.tsmatter.com` → `["ins"]`.

---

## 0. Prerequisites (one-time, already done)

- [x] `tsm-entitlement-gate` Worker deployed with route `*.tsmatter.com/*`
- [x] `CLOUDFLARE_API_TOKEN` available for `wrangler deploy` (or use
      `wrangler login` if working interactively with a browser)
- [x] Fly app name: `tsm-consultz`

If any of these aren't true, see the full setup conversation this
runbook was extracted from — don't try to shortcut this section.

---

## 1. Pick the vertical key(s) and hostname

Vertical keys must match `VERTICALS` in `html/tsm-doc-search-multi.html`
exactly (e.g. `ins`, `hc`, `con`, `bpo`, `leg`, `re`, `mortgage`,
`schools`, `fo`, `o2c`, `crm`, `approval`, `cpq`, `catalog`, `mdm`,
`governance`, `logistics`, `vendor`, `hotel`, `hw`).

Decide the hostname, e.g. `construction.tsmatter.com`.

---

## 2. Add DNS records (Cloudflare dashboard → DNS → Records)

Add **both** of these, matching your existing `app.tsmatter.com` /
`insurance.tsmatter.com` records:

| Type | Name | Content | Proxy status |
|---|---|---|---|
| A | `<subdomain>` | `66.241.124.194` | **DNS only** (grey cloud) — temporarily |
| AAAA | `<subdomain>` | `2a09:8280:1::137:4df0:0` | **DNS only** (grey cloud) — temporarily |

Keep them **grey-cloud (DNS only)** for now — Fly's cert issuance needs
to see your real origin, and Cloudflare's proxy hides it.

---

## 3. Request the Fly TLS cert

```bash
fly certs add <subdomain>.tsmatter.com -a tsm-consultz
```

Then poll until issued (Fly + Let's Encrypt can lag a couple minutes
behind a DNS change):

```bash
for i in 1 2 3 4 5; do
  fly certs check <subdomain>.tsmatter.com -a tsm-consultz
  echo "--- waiting ---"
  sleep 30
done
```

Look for `Status = Issued` / `✓ Certificate is verified and active`.

If it's still "Not verified" after ~5 minutes, run
`fly certs setup <subdomain>.tsmatter.com -a tsm-consultz` to confirm
Fly's expected DNS matches what's actually in Cloudflare — most
mismatches are a typo'd IP or a record still on the wrong proxy state.

---

## 4. Re-enable Cloudflare proxying

Once the cert shows Issued, go back to DNS → Records and flip **both**
the A and AAAA records for `<subdomain>` to **Proxied (orange cloud)**.

This is the step that actually turns the entitlement gate on — while
grey-cloud, traffic bypasses the Worker entirely and hits Fly directly
with no gating.

---

## 5. Add the entitlement in the Worker

Edit `cloudflare/entitlement-gate/worker.js`, add a line to
`ENTITLEMENTS`:

```js
const ENTITLEMENTS = {
  "insurance.tsmatter.com": ["ins"],
  "construction.tsmatter.com": ["con"],   // ← new line
  // ...
};
```

Use an array if a customer is licensed for more than one vertical,
e.g. `["con", "leg"]`.

Commit it:

```bash
git add cloudflare/entitlement-gate/worker.js
git commit -m "License construction.tsmatter.com for the Construction vertical"
git push origin main
```

---

## 6. Deploy the Worker

```bash
cd cloudflare/entitlement-gate
wrangler deploy
```

Confirm the output shows the route:
```
Deployed tsm-entitlement-gate triggers
  *.tsmatter.com/* (zone name: tsmatter.com)
```

(You don't need to touch the route itself again — the wildcard pattern
already covers the new subdomain. This step just ships the updated
`ENTITLEMENTS` map.)

---

## 7. Verify

1. Load `https://<subdomain>.tsmatter.com/html/tsm-doc-search-multi.html`
   — should load with only the licensed vertical(s) unlocked, rest
   greyed out with 🔒.
2. In DevTools console: `window.__LICENSED_VERTICALS__` should print
   the array you set in step 5.
3. Try loading a **different** vertical's war-room file directly, e.g.
   for a new Construction subdomain, try:
   `https://<subdomain>.tsmatter.com/html/healthcare/hc-denial-war-room.html`
   — should return the 🔒 402 upgrade page, not the real page.
4. Confirm the internal hub (`app.tsmatter.com` or wherever your
   full-access view lives) still shows everything unlocked — it's not
   in `ENTITLEMENTS`, so it falls through to `FULL_ACCESS_KEYS`.

---

## Troubleshooting quick reference

| Symptom | Cause | Fix |
|---|---|---|
| SSL handshake failed (Error 525) | Cloudflare proxying before Fly has a cert for the hostname | Steps 2–4 above, in order |
| `fly certs check` says "DNS records do not match" | Records are proxied (orange cloud) while cert is pending | Grey-cloud them, recheck, then re-proxy once Issued |
| `window.__LICENSED_VERTICALS__` is `undefined` | Worker route isn't live on this hostname, or record isn't proxied | Confirm orange cloud is on; confirm Worker route is `*.tsmatter.com/*` under Workers & Pages → Triggers |
| Direct war-room URL loads instead of getting blocked | `VERTICAL_PATHS` in `worker.js` doesn't have a prefix matching that file's path | Add/fix the path prefix for that vertical, redeploy |
| New vertical shows unlocked when it shouldn't | Hostname typo in `ENTITLEMENTS`, or record still DNS-only (bypasses Worker) | Check exact hostname string match; confirm proxied |
