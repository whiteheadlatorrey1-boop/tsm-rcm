
// TSM Partner Registry

const partnerRegistry = {

 register(partner){
   return {
    partnerId:"TSM-PARTNER-" + Date.now(),
    partner,
    status:"ACTIVE"
   };
 },

 list(){
   return [];
 }

};

module.exports = partnerRegistry;
