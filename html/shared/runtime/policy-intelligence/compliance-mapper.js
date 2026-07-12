// TSM Compliance Mapper

const __tsmImpl = {

map(decision = {}) {

return {

decision,

controls:[],

mapped:true

};

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMPolicyIntelligenceComplianceMapper = __tsmImpl; }
