#!/usr/bin/env bash

set -euo pipefail

echo "======================================"
echo " TSM MDM Phase 3A API Adapter"
echo " Health | Catalog | Risk | Missions"
echo "======================================"

BACKUP="backup-mdm-phase3-api-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP"

cp server.js "$BACKUP/server.js"

echo "Backup: $BACKUP"


python3 <<'PY'

from pathlib import Path

p=Path("server.js")

text=p.read_text()

if "TSM_MDM_PHASE3_API" in text:
    print("Phase 3 API already installed")
    exit()


marker="app.get('/api/mdm/detail'"

insert=r'''

// ===== TSM_MDM_PHASE3_API =====

const mdmPhase3 = require("./server/mdm/mdm-phase3");


app.get('/api/mdm/health', (req,res)=>{

    const summary =
        MDM_SUMMARY_CACHE ||
        {
            overallScore:83
        };

    res.json(
        mdmPhase3.buildHealth(summary)
    );

});


app.get('/api/mdm/catalog',(req,res)=>{

    const summary =
        MDM_SUMMARY_CACHE ||
        {
            domains:[]
        };

    res.json({
        ok:true,
        domains:summary.domains || []
    });

});


app.get('/api/mdm/anomalies',(req,res)=>{

    const detail =
        MDM_DETAIL_CACHE ||
        {
            records:[]
        };

    res.json({

        ok:true,

        anomalies:
            mdmPhase3.buildAnomalies(detail)

    });

});


app.get('/api/mdm/missions',(req,res)=>{

    const detail =
        MDM_DETAIL_CACHE ||
        {
            records:[]
        };


    const anomalies =
        mdmPhase3.buildAnomalies(detail);


    res.json({

        ok:true,

        missions:
            mdmPhase3.buildMissions(anomalies)

    });

});


// ===== END TSM_MDM_PHASE3_API =====


'''

idx=text.find(marker)

if idx == -1:
    raise Exception("MDM insertion point not found")


text=text[:idx]+insert+text[idx:]

p.write_text(text)

PY


node --check server.js

echo ""
echo "======================================"
echo " MDM Phase 3A API COMPLETE"
echo "======================================"

echo ""
echo "Test:"
echo "curl http://localhost:8080/api/mdm/health"
echo "curl http://localhost:8080/api/mdm/catalog"
echo "curl http://localhost:8080/api/mdm/anomalies"
echo "curl http://localhost:8080/api/mdm/missions"

