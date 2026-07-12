// TSM Relationship Analyzer

const __tsmImpl = {

analyze(entities = []) {

return {

entities,

relationships:[],

mapped:true

};

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMReasoningRelationshipAnalyzer = __tsmImpl; }
