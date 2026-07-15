module.exports = {

 getKPIs(){

  return {

   pipeline:{
    activeLoans:342,
    value:142500000
   },

   cycle:{
    averageDays:18,
    targetDays:15
   },

   production:{
    fundedToday:27,
    clearToClose:48
   },

   risk:{
    highRiskLoans:12,
    missingDocuments:83
   },

   quality:{
    qcScore:96,
    defects:4
   }

  };

 }

};
