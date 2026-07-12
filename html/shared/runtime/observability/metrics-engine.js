window.TSMMetrics = {

 metrics:{},

 record(name,value){
   this.metrics[name]={
     value,
     timestamp:new Date().toISOString()
   };
 },

 get(){
   return this.metrics;
 }

};