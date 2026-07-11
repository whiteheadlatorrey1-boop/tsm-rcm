global.TSMTrace = {

 events:[],

 capture(event){
   this.events.push({
     event,
     timestamp:new Date().toISOString()
   });
 },

 history(){
   return this.events;
 }

};