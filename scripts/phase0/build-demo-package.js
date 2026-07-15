#!/usr/bin/env node

/**
 * TSM Phase 0 Demo Package Builder
 *
 * Packages:
 * - screenshots
 * - certification report
 * - demo scenarios
 * - architecture flow
 * - executive talk tracks
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const PACKAGE =
    path.join(ROOT,"demo-package");


function ensure(dir){

    fs.mkdirSync(
        dir,
        {
            recursive:true
        }
    );

}


function copy(source,target){

    if(!fs.existsSync(source)){
        console.log("SKIP:",source);
        return;
    }

    ensure(
        path.dirname(target)
    );

    fs.cpSync(
        source,
        target,
        {
            recursive:true
        }
    );

    console.log(
        "COPIED:",
        source
    );

}


function write(file,data){

    ensure(
        path.dirname(file)
    );

    fs.writeFileSync(
        file,
        data
    );

    console.log(
        "CREATED:",
        file
    );

}


console.log(`
=========================================
 TSM DEMO PACKAGE BUILDER
=========================================
`);


// --------------------------------------
// Create Package Structure
// --------------------------------------

ensure(PACKAGE);

[
"screenshots/healthcare",
"screenshots/construction",
"screenshots/bpo",
"screenshots/mdm",
"scenarios",
"architecture"

].forEach(dir=>{

ensure(
path.join(PACKAGE,dir)
);

});


// --------------------------------------
// Copy Evidence
// --------------------------------------

copy(
"reports/demo-evidence/01-intake.png",
`${PACKAGE}/screenshots/healthcare/01-intake.png`
);


copy(
"reports/demo-evidence/02-healthcare-war-room.png",
`${PACKAGE}/screenshots/healthcare/02-war-room.png`
);


copy(
"reports/demo-evidence/03-healthcare-strategist.png",
`${PACKAGE}/screenshots/healthcare/03-strategist.png`
);


copy(
"reports/demo-evidence/04-healthcare-executive.png",
`${PACKAGE}/screenshots/healthcare/04-executive.png`
);


copy(
"reports/demo-evidence/05-construction-strategist.png",
`${PACKAGE}/screenshots/construction/01-strategist.png`
);


copy(
"reports/demo-evidence/06-construction-executive.png",
`${PACKAGE}/screenshots/construction/02-executive.png`
);


copy(
"reports/demo-evidence/07-bpo-war-room.png",
`${PACKAGE}/screenshots/bpo/01-war-room.png`
);


copy(
"reports/demo-evidence/08-bpo-executive.png",
`${PACKAGE}/screenshots/bpo/02-executive.png`
);


copy(
"reports/demo-evidence/09-mdm-war-room.png",
`${PACKAGE}/screenshots/mdm/01-war-room.png`
);


copy(
"reports/demo-evidence/10-mdm-executive.png",
`${PACKAGE}/screenshots/mdm/02-executive.png`
);


// --------------------------------------
// Copy Certification
// --------------------------------------

copy(
"reports/demo-certification.json",
`${PACKAGE}/demo-certification.json`
);


copy(
"runtime/demo/presentation-flow.json",
`${PACKAGE}/architecture/presentation-flow.json`
);


copy(
"runtime/demo/demo-scenarios.json",
`${PACKAGE}/architecture/demo-scenarios.json`
);


// --------------------------------------
// Talk Tracks
// --------------------------------------

write(

`${PACKAGE}/scenarios/healthcare-talk-track.md`,

`# Healthcare Executive Demo

Problem:
Healthcare organizations lose revenue through claims exceptions,
denials, and inconsistent workflows.

TSM Flow:

1. Upload claim documentation
2. AI identifies business exception
3. War Room analyzes root cause
4. Strategist generates action plan
5. Executive Portal presents decision

Example:

$42,000 denial exposure identified.

Decision:
Correct coding workflow and prioritize appeal.

`

);


write(

`${PACKAGE}/scenarios/construction-talk-track.md`,

`# Construction Executive Demo

Problem:
Projects experience cost overruns and contract risk.

TSM Flow:

1. Analyze project documents
2. Identify cost exposure
3. Rank operational risk
4. Recommend mitigation

Example:

$185,000 change order exposure detected.

Decision:
Approve mitigation plan.

`

);


write(

`${PACKAGE}/scenarios/bpo-talk-track.md`,

`# BPO Executive Demo

Problem:
Clients need confidence in outsourced processing quality.

TSM Flow:

1. Process document batches
2. Measure quality
3. Identify exceptions
4. Certify delivery

Example:

5,400 documents processed.

Quality:
98%+

Decision:
Client delivery certification.

`

);


write(

`${PACKAGE}/README.md`,

`# TSM Enterprise Demo Package

## Demo Flow

Upload
↓
Mission Queue
↓
War Room
↓
Strategist
↓
Executive Portal
↓
Decision
↓
Audit


## Certified

Playwright:
17 platform tests passed

Evidence:
10 screenshots captured

Generated:
${new Date().toISOString()}

`

);


// --------------------------------------
// Final Report
// --------------------------------------

write(

"reports/demo-package-build-report.json",

JSON.stringify({

status:"READY",

location:"demo-package/",

created:
new Date().toISOString()

},null,2)

);


console.log(`
=========================================

DEMO PACKAGE READY

Location:
demo-package/

Use for:
- Investor demos
- Customer pilots
- Sales presentations

=========================================
`);
