window.TSMScenarioEngine={

 scenarios:[],

 create(name,data){

  const scenario={
   name,
   data,
   created:
    new Date().toISOString()
  };

  this.scenarios.push(scenario);

  return scenario;

 },

 list(){

  return this.scenarios;

 }

};