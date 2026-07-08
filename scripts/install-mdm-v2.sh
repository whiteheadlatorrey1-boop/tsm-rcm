#!/usr/bin/env bash

set -euo pipefail

echo "================================="
echo " TSM MDM v2 Safe Installer"
echo "================================="

ROOT="$(pwd)"

echo "[1/7] Creating backup..."

BACKUP="backup-mdm-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP"

cp server.js "$BACKUP/server.js"

echo "Backup created: $BACKUP"


echo "[2/7] Creating MDM directories..."

mkdir -p \
server/mdm \
html/war-rooms/mdm \
js \
shared


echo "[3/7] Creating backend placeholders..."

touch \
server/mdm/mdm-router.js \
server/mdm/mdm-engine.js \
server/mdm/mdm-store.js \
server/mdm/mdm-playbooks.js


echo "[4/7] Patching server.js..."

node <<'NODE'

const fs=require("fs");

const file="server.js";

let data=fs.readFileSync(file,"utf8");

const importLine=`const mdmRouter = require("./server/mdm/mdm-router");`;

if(!data.includes(importLine)){

 data=data.replace(
 /const TSM_MESH = \{/,
 `${importLine}\n\nconst TSM_MESH = {`
 );

 console.log("Added MDM router import");

}else{

 console.log("MDM router import already exists");

}


const routeBlock=`
app.use(
  "/api/mdm",
  mdmRouter
);
`;

if(!data.includes('"/api/mdm"')){

 data=data.replace(
 /const suites = \[/,
 `${routeBlock}\n\nconst suites = [`
 );

 console.log("Added MDM API route");

}else{

 console.log("MDM API route already exists");

}


fs.writeFileSync(file,data);

NODE


echo "[5/7] Validating server.js..."

node -c server.js


echo "[6/7] Checking MDM files..."

find server/mdm -type f


echo "[7/7] Complete"

echo ""
echo "Next:"
echo "npm restart"
echo "curl http://localhost:8000/api/mdm/health"
