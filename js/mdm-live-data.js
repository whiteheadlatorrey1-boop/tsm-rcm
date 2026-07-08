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




window.TSM_MDM_PHASE3=true;

