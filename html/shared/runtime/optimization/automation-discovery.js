window.TSMAutomationDiscovery = {

 candidates:[],

 identify(pattern){

  const result={
   pattern,
   recommendation:"automation candidate",
   timestamp:new Date().toISOString()
  };

  this.candidates.push(result);

  return result;
 },

 list(){
  return this.candidates;
 }

};