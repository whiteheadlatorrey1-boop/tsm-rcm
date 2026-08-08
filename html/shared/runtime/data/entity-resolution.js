window.TSMEntityResolution={

 version:"1.0.0",

 resolve(records){

  return {

   entityId:
    "ENTITY-"+Date.now(),

   records,

   confidence:
    0.95

  };

 }

};