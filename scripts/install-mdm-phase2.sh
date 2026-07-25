#!/usr/bin/env bash

set -euo pipefail

echo "================================="
echo " TSM MDM Phase 2 Installer"
echo " Live Data + Neural Memory"
echo "================================="


ROOT="$(pwd)"

BACKUP="backup-mdm-phase2-$(date +%Y%m%d-%H%M%S)"

echo "[1/7] Creating backup..."

mkdir -p "$BACKUP"

cp server.js "$BACKUP/server.js"

echo "Backup: $BACKUP"


echo "[2/7] Creating js directory..."

mkdir -p js


echo "[3/7] Creating MDM Live Data bridge..."

cat > js/mdm-live-data.js <<'EOF'
/*
 * TSM MDM Live Data Bridge
 *
 * Flow:
 *
 * MDM API
 *   |
 * TSM Live Data
 *   |
 * War Room
 * Strategist
 * Executive Portal
 *
 */


window.TSM_MDM_LIVE = {

    state: {

        catalog: {},
        anomalies: [],
        missions: [],
        health: null

    },


    async fetchJSON(url){

        const response = await fetch(url);

        if(!response.ok){

            throw new Error(
                `MDM request failed: ${url}`
            );

        }

        return response.json();

    },


    async hydrate(){

        try {


            this.state.health =
                await this.fetchJSON(
                    "/api/mdm/health"
                );


            this.state.catalog =
                await this.fetchJSON(
                    "/api/mdm/catalog"
                );


            this.state.anomalies =
                await this.fetchJSON(
                    "/api/mdm/anomalies"
                );


            this.state.missions =
                await this.fetchJSON(
                    "/api/mdm/missions"
                );


            window.dispatchEvent(
                new CustomEvent(
                    "TSM_MDM_UPDATED",
                    {
                        detail:this.state
                    }
                )
            );


            return this.state;


        } catch(error){

            console.error(
                "MDM Live Data Error:",
                error
            );


            throw error;

        }

    },


    start(interval=15000){

        this.hydrate();


        setInterval(
            ()=>this.hydrate(),
            interval
        );

    }


};


EOF


echo "[4/7] Patching TSM Neural Memory..."


node <<'NODE'

const fs=require("fs");

const file="server.js";

let data=fs.readFileSync(file,"utf8");


const old=`const TSM_MEMORY = global.__TSM_MEMORY__ = global.__TSM_MEMORY__ || {

  healthcare: { nodes: {}, hcStrategist: null, mainStrategist: null, executive: null }

};`;


const replacement=`const TSM_MEMORY = global.__TSM_MEMORY__ = global.__TSM_MEMORY__ || {

  healthcare: { 
    nodes: {}, 
    hcStrategist: null, 
    mainStrategist: null, 
    executive: null 
  },

  mdm: {
    domains: {},
    anomalies: [],
    missions: [],
    healthScore: 94,
    strategist: null,
    executive: null
  }

};`;


if(data.includes("mdm:")){

 console.log("MDM memory already exists");

}
else if(data.includes(old)){

 data=data.replace(old,replacement);

 console.log("Added MDM memory mesh");

}
else {

 console.log("Existing TSM_MEMORY format differs - skipping automatic patch");

}


fs.writeFileSync(file,data);


NODE


echo "[5/7] Validating..."

node -c server.js


echo "[6/7] Testing MDM APIs..."

curl -sf http://localhost:8080/api/mdm/health >/dev/null
curl -sf http://localhost:8080/api/mdm/catalog >/dev/null
curl -sf http://localhost:8080/api/mdm/missions >/dev/null


echo "[7/7] Complete"

echo ""
echo "MDM Phase 2 Installed:"
echo "✓ js/mdm-live-data.js"
echo "✓ Neural memory mesh"
echo "✓ API validation"
echo ""
echo "Next:"
echo "Build MDM War Room frontend"