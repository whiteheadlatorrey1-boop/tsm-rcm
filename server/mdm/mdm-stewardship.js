
const missions = require("../../data/live-data-store/mdm-missions.json");

function getStewardQueue(){

    return missions.map(m => ({
        id:m.id,
        finding:m.finding,
        risk:m.risk_score,
        owner:m.owner || "Data Governance",
        sla:"48 hours",
        recommendedAction:
            m.risk_score >= 80
            ? "Immediate Review"
            : "Standard Review"
    }));

}

module.exports={
    getStewardQueue
};

