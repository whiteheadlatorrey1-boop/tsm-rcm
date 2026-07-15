#!/bin/bash
set -e

echo "=============================================="
echo " TSM ENTERPRISE SECTOR REGISTRY V1 INSTALLER"
echo "=============================================="

ROOT=$(pwd)

echo "[1/6] Creating sector registry"

mkdir -p html/shared/intake/sectors

cat > html/shared/intake/sector-registry.js <<'EOF'
window.TSMIntake = window.TSMIntake || {

    sectors:{},

    registerSector:function(config){
        this.sectors[config.id]=config;
    },

    getSector:function(id){
        return this.sectors[id];
    },

    list:function(){
        return Object.keys(this.sectors);
    }

};
EOF


echo "[2/6] Creating Mortgage sector module"

cat > html/shared/intake/sectors/mortgage-sector.js <<'EOF'
window.TSMIntake = window.TSMIntake || {registerSector:function(){}};


TSMIntake.registerSector({

    id:"mortgage",

    title:"TSM Mortgage Rescue Pack",

    type:"MORTGAGE",

    rescuePacks:[

        "loan-denial",
        "credit-event",
        "employment-change",
        "asset-sourcing",
        "income-stability",
        "fraud-investigation",
        "fha-rescue",
        "va-rescue",
        "usda-rescue",
        "jumbo-rescue",
        "dscr-investor",
        "trid-rescue",
        "respa-rescue",
        "hmda-audit",
        "mortgage-ops-scorecard"

    ],

    routing:{

        warRoom:
        "/html/war-rooms/mortgage/mortgage-war-room.html",

        strategist:
        "/html/war-rooms/mortgage/mortgage-strategist.html",

        executive:
        "/html/war-rooms/mortgage/mortgage-executive-portal.html"

    }

});
EOF


echo "[3/6] Adding intake loader hooks"


python3 <<'PY'

from pathlib import Path

p=Path("html/tsm-doc-search-multi.html")

text=p.read_text()

loader="""
<script src="./shared/intake/sector-registry.js"></script>
<script src="./shared/intake/sectors/mortgage-sector.js"></script>
"""

if "sector-registry.js" not in text:

    marker="</head>"

    text=text.replace(marker,loader+marker)

    p.write_text(text)

PY


echo "[4/6] Adding dynamic sector resolver"


cat > html/shared/intake/sector-loader.js <<'EOF'

(function(){

const params =
new URLSearchParams(window.location.search);


const sectorId =
params.get("sector");


if(
window.TSMIntake &&
sectorId
){

const sector =
TSMIntake.getSector(sectorId);


if(sector){

window.TSM_ACTIVE_SECTOR=sector;


console.log(
"TSM Sector Loaded:",
sector.title
);


}

}

})();

EOF


python3 <<'PY'

from pathlib import Path

p=Path("html/tsm-doc-search-multi.html")

text=p.read_text()

if "sector-loader.js" not in text:

    text=text.replace(
        "</body>",
        '<script src="./shared/intake/sector-loader.js"></script></body>'
    )

    p.write_text(text)

PY


echo "[5/6] Creating certification script"


mkdir -p scripts/enterprise

cat > scripts/enterprise/certify-sector-registry.sh <<'EOF'
#!/bin/bash

echo "=============================================="
echo " TSM SECTOR REGISTRY CERTIFICATION"
echo "=============================================="

test -f html/shared/intake/sector-registry.js
echo "Registry ............. PASS"

test -f html/shared/intake/sectors/mortgage-sector.js
echo "Mortgage Module ...... PASS"

grep -q "sector-registry.js" html/tsm-doc-search-multi.html
echo "Intake Loader ........ PASS"

grep -q "mortgage-war-room" html/shared/intake/sectors/mortgage-sector.js
echo "Routing .............. PASS"

echo
echo "=============================================="
echo " SECTOR REGISTRY READY"
echo "=============================================="
EOF


chmod +x scripts/enterprise/certify-sector-registry.sh


echo "[6/6] Complete"

echo
echo "=============================================="
echo " TSM ENTERPRISE SECTOR REGISTRY INSTALLED"
echo "=============================================="

echo
echo "Run:"
echo "./scripts/enterprise/certify-sector-registry.sh"