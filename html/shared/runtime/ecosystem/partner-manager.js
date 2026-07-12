
// TSM Partner Manager

const partnerManager = {

 onboard(partner){
   return {
    partner,
    onboarding:"complete",
    status:"enabled"
   };
 },

 evaluate(partner){
   return {
    partner,
    healthScore:100
   };
 }

};

module.exports = partnerManager;
