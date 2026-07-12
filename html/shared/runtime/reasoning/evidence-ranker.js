// TSM Evidence Ranker

const __tsmImpl = {

rank(evidence = []) {

return evidence.map(item => ({

...item,

score:
item.score || 0.5

}));

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMReasoningEvidenceRanker = __tsmImpl; }
