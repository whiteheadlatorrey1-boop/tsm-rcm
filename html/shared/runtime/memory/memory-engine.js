window.TSMMemoryEngine={

 version:"1.0.0",

 store(record){

   console.log(
    "Memory stored",
    record
   );

   return {
    status:"STORED",
    timestamp:new Date().toISOString()
   };

 },

 recall(query){

   return {
    query,
    matches:[]
   };

 }

};