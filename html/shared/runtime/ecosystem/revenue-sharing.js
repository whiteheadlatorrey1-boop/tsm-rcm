
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

module.exports = revenueSharing;
if (typeof window !== 'undefined') { window.TSMEcosystemRevenueSharing = revenueSharing; }
