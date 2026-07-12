// TSM Evidence Ranker

const __tsmExport = {

rank(evidence = []) {

return evidence.map(item => ({

...item,

score:
item.score || 0.5

}));

}

};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.evidenceRanker = __tsmExport;
}
