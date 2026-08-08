window.TSMHistoricalMemory={

 timeline:[],

 record(event){

  this.timeline.push({

   ...event,

   timestamp:
    new Date().toISOString()

  });

 },

 history(){

  return this.timeline;

 }

};