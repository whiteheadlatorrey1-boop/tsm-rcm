const ledger = [];

function recordEvidence(entry){
    const item = {
        id:"EVID-"+Date.now(),
        timestamp:new Date().toISOString(),
        ...entry
    };

    ledger.push(item);
    return item;
}

function getEvidence(){
    return ledger;
}

module.exports={
    recordEvidence,
    getEvidence
};
