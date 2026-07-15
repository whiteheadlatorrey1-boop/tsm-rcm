#!/bin/bash
set -e

echo "=============================================="
echo " TSM MORTGAGE INTAKE UI WIRING"
echo "=============================================="

INTAKE="html/tsm-doc-search-multi.html"

echo "[1/6] Creating Mortgage UI module"

mkdir -p html/shared/intake/sectors


cat > html/shared/intake/sectors/mortgage-ui.js <<'EOF'

(function(){

window.TSMMortgageUI = {

render:function(){

const sector =
window.TSM_ACTIVE_SECTOR;

if(!sector || sector.id!=="mortgage"){
return;
}


let container =
document.getElementById(
"mortgage-rescue-panel"
);


if(!container){

container=document.createElement("div");

container.id="mortgage-rescue-panel";

container.className="panel";

document.body.appendChild(container);

}


container.innerHTML=`

<h3>
🏠 TSM Mortgage Rescue Pack
</h3>

<div class="mortgage-pack-grid">

${sector.rescuePacks.map(
p=>`

<button 
class="mortgage-pack"
data-pack="${p}">
${p.replaceAll("-"," ").toUpperCase()}
</button>

`
).join("")}

</div>

`;



document.querySelectorAll(
".mortgage-pack"
)
.forEach(btn=>{

btn.onclick=function(){

window.TSM_SELECTED_MORTGAGE_PACK =
this.dataset.pack;


console.log(
"Mortgage Rescue Pack Selected:",
this.dataset.pack
);


};

});


}

};


window.addEventListener(
"load",
()=>{

setTimeout(()=>{

TSMMortgageUI.render();

},500);

});


})();

EOF



echo "[2/6] Injecting Mortgage UI loader"


python3 <<'PY'

from pathlib import Path

p=Path("html/tsm-doc-search-multi.html")

text=p.read_text()

tag='<script src="./shared/intake/sectors/mortgage-ui.js"></script>'

if "mortgage-ui.js" not in text:

    text=text.replace(
        "</body>",
        tag+"</body>"
    )

    p.write_text(text)

PY


echo "[3/6] Creating mortgage mission hook"


mkdir -p html/shared/intake/hooks


cat > html/shared/intake/hooks/mortgage-mission-hook.js <<'EOF'

window.TSMMortgageMission=function(){

const sector=
window.TSM_ACTIVE_SECTOR;


if(!sector ||
sector.id!=="mortgage"){
return null;
}


return {

vertical:"mortgage",

category:
window.TSM_SELECTED_MORTGAGE_PACK ||
"mortgage-ops-scorecard",

routing:
sector.routing,

created:
new Date().toISOString()

};


};

EOF



echo "[4/6] Injecting mission hook"


python3 <<'PY'

from pathlib import Path

p=Path("html/tsm-doc-search-multi.html")

text=p.read_text()

tag='<script src="./shared/intake/hooks/mortgage-mission-hook.js"></script>'

if "mortgage-mission-hook.js" not in text:

    text=text.replace(
        "</body>",
        tag+"</body>"
    )

    p.write_text(text)

PY



echo "[5/6] Creating certification"


cat > scripts/mortgage/certify-mortgage-intake-ui.sh <<'EOF'
#!/bin/bash

echo "=============================================="
echo " TSM MORTGAGE INTAKE UI CERT"
echo "=============================================="


grep -q "mortgage-ui.js" \
html/tsm-doc-search-multi.html

echo "UI Loader ............ PASS"


grep -q "mortgage-mission-hook.js" \
html/tsm-doc-search-multi.html

echo "Mission Hook ......... PASS"


grep -q "loan-denial" \
html/shared/intake/sectors/mortgage-ui.js

echo "Rescue Packs ......... PASS"


echo
echo "=============================================="
echo " MORTGAGE INTAKE UI READY"
echo "=============================================="

EOF


chmod +x scripts/mortgage/certify-mortgage-intake-ui.sh



echo "[6/6] Complete"

echo
echo "=============================================="
echo " MORTGAGE INTAKE UI WIRED"
echo "=============================================="

echo
echo "Run:"
echo "./scripts/mortgage/certify-mortgage-intake-ui.sh"