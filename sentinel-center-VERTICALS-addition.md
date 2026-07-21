# sentinel-center.html — VERTICALS addition

Current array only has the 9 sector verticals. Add the 4 standalone
SAP-centric phases so they get scored, appear on the Standings board, and
participate in Enterprise Exposure/Business Posture Score like everything
else. Do NOT add o2c/crm/cpq/catalog/approval/wip here — those stay
enrichment-only forever (see architecture rule).

## Before

```js
const VERTICALS = [
  { id:'schools',     name:'Schools',      color:'#22d3ee' },
  { id:'healthcare',  name:'Healthcare',   color:'#38bdf8' },
  { id:'finops',      name:'FinOps',       color:'#86efac' },
  { id:'insurance',   name:'Insurance',    color:'#c084fc' },
  { id:'construction',name:'Construction', color:'#fbbf24' },
  { id:'legal',       name:'Legal',        color:'#a78bfa' },
  { id:'realestate',  name:'Real Estate',  color:'#34d399' },
  { id:'bpo',         name:'BPO',          color:'#f87171' },
  { id:'mortgage',    name:'Mortgage',     color:'#f472b6' },
];
```

## After

```js
const VERTICALS = [
  { id:'schools',     name:'Schools',      color:'#22d3ee' },
  { id:'healthcare',  name:'Healthcare',   color:'#38bdf8' },
  { id:'finops',      name:'FinOps',       color:'#86efac' },
  { id:'insurance',   name:'Insurance',    color:'#c084fc' },
  { id:'construction',name:'Construction', color:'#fbbf24' },
  { id:'legal',       name:'Legal',        color:'#a78bfa' },
  { id:'realestate',  name:'Real Estate',  color:'#34d399' },
  { id:'bpo',         name:'BPO',          color:'#f87171' },
  { id:'mortgage',    name:'Mortgage',     color:'#f472b6' },
  // --- SAP-centric standalone phases (added) ---
  { id:'governance',      name:'Governance',       color:'#eab308' },
  { id:'mdm',              name:'MDM',              color:'#06b6d4' },
  { id:'integration-hub',  name:'Integration Hub',  color:'#818cf8' },
  { id:'digital-twin',     name:'Digital Twin',     color:'#f97316' },
];
```

## Also required (elsewhere in sentinel-center.html)

`resolveRelayPath()` / whatever function maps a vertical id to its
`html/war-rooms/<id>/<id>-war-room.html?mode=readonly&src=sentinel` path
needs entries for these 4 new ids too, same pattern as the existing 9 —
otherwise they'll show a score but the "view war room" link will 404.

Check `integration-hub` and `digital-twin` folder/file naming carefully —
confirm the actual `id` values match what's used in
`html/war-rooms/integration-hub/` and `html/war-rooms/digital-twin/`
(hyphenated vs camelCase) before wiring, since `tsm-capability-sweep.js`
uses `integration` and `digitalTwin` (no hyphen) internally — these must
be reconciled to the same id or the sweep enrichment/promotion functions
won't line up with what Sentinel displays.
