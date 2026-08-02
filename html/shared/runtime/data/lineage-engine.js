window.TSMDataLineage={

 traces:[],

 record(source,target){

  this.traces.push({

   source,

   target,

   timestamp:
    new Date().toISOString()

  });

 },

 history(){

  return this.traces;

 }

};