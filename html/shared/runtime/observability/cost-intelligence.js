window.TSMCostIntelligence = {

 costs:{},

 record(service,cost){

   this.costs[service]=
     (this.costs[service] || 0) + cost;

 },

 summary(){
   return this.costs;
 }

};