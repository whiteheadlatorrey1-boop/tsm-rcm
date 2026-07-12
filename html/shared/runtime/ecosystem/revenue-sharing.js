
// TSM Revenue Sharing

const revenueSharing = {

 calculate(partner,revenue){

   return {
    partner,
    revenue,
    shareStatus:"calculated"
   };

 }

};

const __tsmExport = revenueSharing;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.revenueSharing = __tsmExport;
}
