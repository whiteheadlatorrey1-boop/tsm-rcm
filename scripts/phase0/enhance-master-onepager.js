#!/usr/bin/env node

/**
 * TSM Master One-Pager Enhancement Installer
 *
 * Enhances:
 * html/master-enterprise-onepager.html
 *
 * Adds:
 * - stronger enterprise positioning
 * - vertical intelligence
 * - managed BPO positioning
 * - executive outcomes
 *
 */

const fs = require("fs");
const path = require("path");

const file =
path.join(
process.cwd(),
"html/master-enterprise-onepager.html"
);


console.log(`
=========================================
 TSM MASTER ONE-PAGER ENHANCER
=========================================
`);


if(!fs.existsSync(file)){

console.error(
"ERROR: master-enterprise-onepager.html not found"
);

process.exit(1);

}


let html =
fs.readFileSync(
file,
"utf8"
);


// Backup

const backup =
file +
".backup-phase0";

fs.writeFileSync(
backup,
html
);

console.log(
"BACKUP:",
backup
);


// -------------------------------------
// Hero upgrade
// -------------------------------------

html =
html.replace(

"Enterprise Decision Intelligence &amp; Workforce Execution Platform",

"AI-Powered Enterprise Decision Intelligence Platform"

);


html =
html.replace(

"One operating model — War Rooms, Strategist AI, and Executive Dashboards — that unifies decisions, work, and visibility across every department and industry you serve.",

"One operating model — AI Intelligence, War Rooms, Strategist AI, and Executive Decision Dashboards — transforming documents, workflows, and operational data into measurable business outcomes across every industry you serve."

);


// -------------------------------------
// Rail upgrade
// -------------------------------------

html =
html.replace(

"War Room</div></div>",
"Intelligence</div></div>",

);


html =
html.replace(

"<div class=\"lbl\">Continuous Improve.</div>",

"<div class=\"lbl\">Continuous Learning</div>"

);


// -------------------------------------
// Add vertical intelligence section
// -------------------------------------

const verticalBlock = `

<div class="panel" style="margin-bottom:26px;">

<h2>
<span class="n">VERTICAL INTELLIGENCE</span>
Industries Powered by TSM
</h2>

<div class="wr-grid">

<span class="wr-chip">
Healthcare Revenue Intelligence
</span>

<span class="wr-chip">
Construction Operations Intelligence
</span>

<span class="wr-chip">
Mortgage &amp; Real Estate Intelligence
</span>

<span class="wr-chip">
Staffing Workforce Intelligence
</span>

<span class="wr-chip">
AI-Powered Managed BPO Services
</span>

</div>

</div>

`;


html =
html.replace(

'<div class="results">',

verticalBlock +
'<div class="results">'

);


// -------------------------------------
// Executive outcome upgrade
// -------------------------------------

const oldResults = `

<div class="result-item">Faster decisions across every workflow</div>
<div class="result-item">Better quality, fewer rework cycles</div>
<div class="result-item">Consistent AI guidance at the point of work</div>
<div class="result-item">Real-time executive visibility, not lagging reports</div>

`;


const newResults = `

<div class="result-item">
Reduce operational bottlenecks and exception cycles
</div>

<div class="result-item">
Identify revenue leakage and business risk earlier
</div>

<div class="result-item">
Improve processing quality with AI-guided workflows
</div>

<div class="result-item">
Create audit-ready operational intelligence
</div>

`;


html =
html.replace(
oldResults,
newResults
);


// -------------------------------------
// Add BPO service layer
// -------------------------------------

const serviceBlock = `

<div class="panel" style="margin-bottom:26px;">

<h2>
<span class="n">SERVICE MODEL</span>
TSM Powered Managed Services
</h2>

<p style="font-size:14px;color:var(--text-soft);line-height:1.6">

TSM combines AI technology with operational expertise.
Our managed BPO services use the same intelligence platform
internally to deliver document processing, quality validation,
exception detection, and executive reporting for clients.

</p>

<div class="wr-grid">

<span class="wr-chip">
AI Assisted Processing
</span>

<span class="wr-chip">
Quality Intelligence
</span>

<span class="wr-chip">
Exception Management
</span>

<span class="wr-chip">
Executive Reporting
</span>

</div>

</div>

`;


html =
html.replace(

'<div class="execband">',

serviceBlock +
'<div class="execband">'

);


// -------------------------------------
// Update positioning band
// -------------------------------------

html =
html.replace(

"Not another application — an Enterprise Decision Intelligence Platform",

"Not another application — an Enterprise Operating Intelligence Layer"

);


html =
html.replace(

"Same operating model, tailored War Rooms per industry",

"Same intelligence model, tailored War Rooms per industry"

);


// Write

fs.writeFileSync(
file,
html
);


console.log(`
=========================================

MASTER ONE-PAGER ENHANCED

Updated:
${file}

Backup:
${backup}

Added:
✓ Enterprise positioning
✓ Vertical intelligence
✓ Healthcare/Construction/Mortgage/BPO focus
✓ Managed Services positioning
✓ Executive outcome language

=========================================
`);
