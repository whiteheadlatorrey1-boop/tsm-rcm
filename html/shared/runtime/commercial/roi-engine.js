
// TSM ROI Engine

const roiEngine = {

 calculate(before, after){

  return {
    before,
    after,
    improvement:
      before ? Math.round(((before-after)/before)*100) : 0
  };

 }

};

const __tsmExport = roiEngine;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.roiEngine = __tsmExport;
}
