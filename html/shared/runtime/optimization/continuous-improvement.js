global.TSMContinuousImprovement = {

 history:[],

 record(outcome){

  this.history.push({
   outcome,
   timestamp:new Date().toISOString()
  });

 },

 get(){
  return this.history;
 }

};