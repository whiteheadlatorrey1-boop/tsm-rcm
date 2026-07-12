window.TSMPerformance = {

 samples:[],

 measure(component,duration){

   this.samples.push({
     component,
     duration,
     timestamp:new Date().toISOString()
   });

 },

 report(){
   return this.samples;
 }

};