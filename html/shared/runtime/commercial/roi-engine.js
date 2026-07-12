
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

module.exports = roiEngine;
if (typeof window !== 'undefined') { window.TSMCommercialRoiEngine = roiEngine; }
