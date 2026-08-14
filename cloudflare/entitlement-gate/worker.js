/**
 * TSM Vertical Entitlement Gate — Cloudflare Worker
 * ---------------------------------------------------
 * Sits in front of *.tsmatter.com. Four jobs:
 *
 *   1. When serving tsm-doc-search-multi.html, inject
 *      window.__LICENSED_VERTICALS__ into the page based on the
 *      requesting hostname, so the client-side tab-locking UI knows
 *      what this subdomain is entitled to.
 *
 *   2. Block direct requests to any vertical's standalone war-room /
 *      strategist / exec-portal files unless the requesting hostname
 *      is entitled to that vertical. This is the actual paywall —
 *      the client-side lock in step 1 is UX only and can't be trusted
 *      on its own, since those files have no auth of their own.
 *
 *   3. Reject direct/address-bar/curl requests for the shared engine
 *      JS (/shared, /core, /architecture, /runtime). These files DO
 *      need to stay fetchable by real browsers, on every entitled
 *      hostname — the client-side product genuinely needs to execute
 *      this code, so this can't be a hostname block without breaking
 *      the product for real customers. Instead it's a same-origin
 *      check: real <script src="..."> loads from our own pages carry
 *      Sec-Fetch-Dest:script (or a matching Referer) automatically;
 *      a plain curl or a browser address-bar visit doesn't. This
 *      stops casual scraping/search indexing without touching real
 *      traffic — it is a deterrent, not a hard guarantee.
 *
 *   4. Attach a shared-secret header to every request forwarded to
 *      origin, so server.js (Fly) can refuse any request that didn't
 *      come through this Worker — closing the tsm-consultz.fly.dev
 *      direct-access bypass. Requires the TSM_GATE_SECRET Worker
 *      secret and matching CF_GATE_SECRET Fly secret to be set (see
 *      RUNBOOK.md). Until both are set this is a silent no-op.
 *
 * Deploy: wrangler deploy, with a Route of *.tsmatter.com/* pointing
 * at this Worker, and origin set to wherever /html is actually hosted
 * (Worker fetches from origin, filters the response, returns it).
 */

// ── Hostname → licensed vertical keys ───────────────────────────────
// Keys match VERTICALS in tsm-doc-search-multi.html exactly.
// The apex/hub domain (tsmatter.com, the internal ops domain, or any
// hostname not listed here) gets full access — that's the internal
// "sees everything" view, not a customer-facing paywalled one.
const ENTITLEMENTS = {
  "insurance.tsmatter.com": ["ins"],
  "healthcare.tsmatter.com": ["hc"],
  "bpo-healthcare.tsmatter.com": ["hc", "bpo"],
  "banner-health.tsmatter.com": ["hc"],
  "honorhealth.tsmatter.com": ["hc"],
  "abrazo.tsmatter.com": ["hc"],
  "valleywise.tsmatter.com": ["hc"],
  "az-ins.tsmatter.com": ["ins"],
  "pc-command.tsmatter.com": ["ins"],
  // add one line per customer subdomain as you sell them
};

const FULL_ACCESS_KEYS = [
  "hw","fo","ins","con","bpo","logistics","vendor","hotel","re",
  "mortgage","pm","schools","leg","hc","o2c","crm","approval","cpq",
  "catalog","mdm","governance","integration-hub","digital-twin",
  "bpo-ops","democonsole",
];

// ── Which file paths belong to which vertical ───────────────────────
// Derived directly from the `route` values inside VERTICALS in
// tsm-doc-search-multi.html — keep these two in sync when a new
// vertical or war-room file is added.
const VERTICAL_PATHS = {
  democonsole: ["/html/demo/"],
  hw:     ["/html/plant-incident.html", "/html/supplier-shutdown.html", "/html/cyber-incident.html"],
  fo:     ["/html/finops-suite/finops-war/finops-war-room.html"],
  ins:    ["/html/war-rooms/insure-war/"],
  con:    ["/html/war-rooms/construct-war/"],
  bpo:    ["/html/war-rooms/bpo-war/"],
  logistics: ["/html/logistics/logistics-situation-room.html"],
  vendor: ["/html/supplier-vendor/supplier-vendor-situation-room.html"],
  hotel:  ["/html/concierge/"],
  re:     ["/html/war-rooms/re-war/"],
  mortgage: ["/html/war-rooms/mortgage/"],
  pm:     ["/html/war-rooms/pm-copilot/"],
  schools: ["/html/war-rooms/schools-command/"],
  leg:    ["/html/war-rooms/legal-war/"],
  hc:     ["/html/healthcare/"],
  o2c:    ["/html/war-rooms/o2c/"],
  crm:    ["/html/war-rooms/crm/"],
  approval: ["/html/war-rooms/approval/"],
  cpq:    ["/html/war-rooms/cpq/"],
  catalog: ["/html/war-rooms/catalog/"],
  mdm:    ["/html/war-rooms/mdm/"],
  governance: ["/html/war-rooms/governance/"],
};

function licensedVerticalsFor(hostname) {
  return ENTITLEMENTS[hostname] || FULL_ACCESS_KEYS;
}

function verticalForPath(pathname) {
  for (const [vertical, prefixes] of Object.entries(VERTICAL_PATHS)) {
    if (prefixes.some(p => pathname.startsWith(p))) return vertical;
  }
  return null; // shared/unscoped asset (css, js, doc-search page itself, etc.)
}

// ── Shared engine JS: same-origin check ─────────────────────────────
// These need to stay fetchable by real browsers on every entitled
// hostname (the product executes this code client-side) — so this is
// NOT a hostname block. It only rejects requests that don't look like
// a <script>/<link> load from one of our own pages: no legitimate
// page load, no block.
const PROTECTED_ASSET_PREFIXES = ["/shared/", "/core/", "/architecture/", "/runtime/"];

function isProtectedAsset(pathname) {
  return PROTECTED_ASSET_PREFIXES.some(p => pathname.startsWith(p));
}

function looksLikeSameOriginAssetLoad(request, hostname) {
  const dest = request.headers.get("Sec-Fetch-Dest") || "";
  if (dest === "script" || dest === "style" || dest === "empty") return true; // fetch()/XHR from our own JS also sends "empty"

  const site = request.headers.get("Sec-Fetch-Site") || "";
  if (site === "same-origin" || site === "same-site") return true;

  // Fallback for older browsers/clients that omit Sec-Fetch-* entirely.
  const referer = request.headers.get("Referer") || "";
  if (referer.startsWith(`https://${hostname}/`)) return true;

  return false;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const licensed = licensedVerticalsFor(url.hostname);
    const vertical = verticalForPath(url.pathname);

    // ── Enforcement: block direct access to un-licensed war rooms ──
    if (vertical && !licensed.includes(vertical)) {
      return new Response(
        renderUpgradePage(vertical, url.hostname),
        { status: 402, headers: { "content-type": "text/html; charset=utf-8" } }
      );
    }

    // ── Enforcement: reject non-same-origin requests for shared engine JS ──
    if (isProtectedAsset(url.pathname) && !looksLikeSameOriginAssetLoad(request, url.hostname)) {
      return new Response("Not found", { status: 404 });
    }

    // ── Attach origin shared-secret header, then fetch from origin ──
    // No-ops silently if env.TSM_GATE_SECRET isn't configured yet, so
    // this doesn't break anything ahead of the matching Fly-side change.
    let originResponse;
    if (env.TSM_GATE_SECRET) {
      const originRequest = new Request(request, { headers: new Headers(request.headers) });
      originRequest.headers.set("x-tsm-cf-gate", env.TSM_GATE_SECRET);
      originResponse = await fetch(originRequest);
    } else {
      originResponse = await fetch(request);
    }

    // ── Injection: tell the doc-search page what this host is licensed for ──
    if (url.pathname.endsWith("tsm-doc-search-multi.html")) {
      return new HTMLRewriter()
        .on("head", {
          element(el) {
            el.append(
              `<script>window.__LICENSED_VERTICALS__ = ${JSON.stringify(licensed)};</script>`,
              { html: true }
            );
          },
        })
        .transform(originResponse);
    }

    return originResponse;
  },
};

function renderUpgradePage(vertical, hostname) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Upgrade required</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0a0e14;color:#c9d6e3;
       display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}
  .card{max-width:420px;text-align:center;padding:32px;border:1px solid #1c2733;border-radius:10px;background:#0f1620;}
  h1{font-size:18px;color:#fbbf24;margin-bottom:12px;}
  p{font-size:13px;line-height:1.6;color:#5b6b7d;}
  a{display:inline-block;margin-top:16px;padding:10px 20px;background:#38bdf8;color:#0a0e14;
    text-decoration:none;border-radius:6px;font-weight:700;font-size:13px;}
</style></head>
<body><div class="card">
  <h1>🔒 This vertical isn't on your plan</h1>
  <p>${hostname} isn't currently licensed for this module. Contact your account manager or upgrade to unlock it.</p>
  <a href="https://tsmatter.com/pricing">View plans</a>
</div></body></html>`;
}
